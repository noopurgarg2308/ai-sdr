/**
 * OpenAI Realtime API Client
 * Handles WebSocket connection for real-time speech-to-speech interaction
 */

export interface RealtimeMessage {
  type: string;
  [key: string]: any;
}

export interface RealtimeOptions {
  apiKey: string;
  model?: string;
  voice?: "alloy" | "echo" | "shimmer";
  instructions?: string;
  tools?: any[]; // OpenAI function tool definitions
  onMessage?: (message: RealtimeMessage) => void;
  onError?: (error: Error) => void;
  onAudioDelta?: (audio: ArrayBuffer) => void;
  onTranscript?: (text: string, role: "user" | "assistant") => void;
  onFunctionCall?: (name: string, args: any) => Promise<any>;
  /** Called when user audio is sent to server (for idle detection while speaking). Throttled to ~every 20 chunks. */
  onUserAudio?: () => void;
  /**
   * Local speaker output has finished (playback queue drained, debounced).
   * Unlike assistant transcript.done, this runs after audio finishes playing — use for idle timeout / "AI is speaking" UI.
   */
  onAssistantPlaybackFinished?: () => void;
}

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private options: RealtimeOptions;
  /** When true, no new audio/WS sends; startRecording aborts after async gaps (prevents zombie mic after Stop/close during init). */
  private closed = false;
  /** Reject pending connect() when disconnect() runs before WebSocket opens */
  private connectPromiseSettlers: {
    resolve: () => void;
    reject: (e: Error) => void;
  } | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private audioSource: MediaStreamAudioSourceNode | null = null;
  private captureWorkletNode: AudioWorkletNode | null = null;
  private silentCaptureGain: GainNode | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private playbackContext: AudioContext | null = null;
  /** Debounce notifying UI that assistant audio finished (handles gaps between deltas + decode) */
  private assistantPlaybackFinishedTimer: ReturnType<typeof setTimeout> | null = null;
  private sendChunkCount = 0;
  private totalBytesSent = 0;
  private useWorklet = false;
  private static readonly MIN_AUDIO_MS = 100;
  private static readonly BYTES_PER_MS_24K = (24000 * 2) / 1000; // 24kHz 16-bit mono
  private get minBytesForCommit(): number {
    return RealtimeClient.MIN_AUDIO_MS * RealtimeClient.BYTES_PER_MS_24K;
  }
  private sessionReadyResolve: (() => void) | null = null;
  private sessionReadyPromise: Promise<void>;
  /** Incremental input transcription per conversation item (delta events) */
  private inputTranscriptByItemId = new Map<string, string>();
  /** Avoid duplicate user bubbles when both transcription.* and conversation.item.done fire */
  private emittedUserTranscriptItemIds = new Set<string>();

  constructor(options: RealtimeOptions) {
    this.options = {
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: "alloy",
      ...options,
    };
    this.sessionReadyPromise = new Promise<void>((r) => {
      this.sessionReadyResolve = r;
    });
  }

  async connect(): Promise<void> {
    this.closed = false;
    const url = `wss://api.openai.com/v1/realtime?model=${this.options.model}`;

    // GA Realtime API — do not use openai-beta.realtime-v1 (beta is deprecated)
    this.ws = new WebSocket(url, [
      "realtime",
      `openai-insecure-api-key.${this.options.apiKey}`,
    ]);

    return new Promise((resolve, reject) => {
      if (!this.ws) return reject(new Error("WebSocket not initialized"));

      this.connectPromiseSettlers = { resolve, reject };

      this.ws.onopen = () => {
        if (this.closed) {
          console.log("[Realtime] Opened after close — tearing down socket");
          try {
            this.ws?.close();
          } catch (_) {}
          return;
        }
        console.log("[Realtime] Connected to OpenAI");
        this.initializeSession();
        this.connectPromiseSettlers = null;
        resolve();
      };

      this.ws.onmessage = (event) => {
        if (this.closed) return;
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error("[Realtime] Error parsing message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("[Realtime] WebSocket error:", error);
        if (this.connectPromiseSettlers) {
          const { reject: rej } = this.connectPromiseSettlers;
          this.connectPromiseSettlers = null;
          rej(new Error("WebSocket error"));
        }
        this.options.onError?.(new Error("WebSocket error"));
      };

      this.ws.onclose = () => {
        console.log("[Realtime] Disconnected");
      };
    });
  }

  private initializeSession() {
    // GA /v1/realtime session shape (see https://developers.openai.com/api/docs/guides/realtime)
    const session: Record<string, unknown> = {
      type: "realtime",
      instructions: this.options.instructions,
      output_modalities: ["text", "audio"],
      audio: {
        input: {
          format: { type: "audio/pcm", rate: 24000 },
          transcription: { model: "gpt-4o-mini-transcribe" },
          turn_detection: {
            type: "server_vad",
            threshold: 0.3,
            prefix_padding_ms: 400,
            silence_duration_ms: 600,
            create_response: true,
            interrupt_response: true,
          },
        },
        output: {
          format: { type: "audio/pcm", rate: 24000 },
          voice: this.options.voice,
        },
      },
    };

    if (this.options.tools && this.options.tools.length > 0) {
      session.tools = this.options.tools.map((tool: any) => ({
        type: "function",
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      }));
      session.tool_choice = "auto";
    }

    this.send({
      type: "session.update",
      session,
    });
  }

  private seenDeltaTypes = new Set<string>();
  /** OpenAI may send both response.output_audio.delta and response.audio.delta for the same audio — playing both causes double voice / echo */
  private activeAssistantAudioChannel: "output_audio" | "legacy_audio" | null = null;

  private handleMessage(message: RealtimeMessage) {
    if (this.closed) return;
    if (message.type !== "response.output_audio.delta" && message.type !== "response.audio.delta") {
      console.log("[Realtime] ←", message.type, message.error ? message : "");
    } else if (!this.seenDeltaTypes.has(message.type)) {
      this.seenDeltaTypes.add(message.type);
      console.log("[Realtime] ← (first)", message.type, "— receiving output audio deltas");
    }
    this.options.onMessage?.(message);

    if (message.type === "session.updated" || message.type === "session.created") {
      const sess = (message as any).session;
      if (sess?.input_audio_transcription) {
        console.log("[Realtime] Session ready; input_audio_transcription:", sess.input_audio_transcription);
      } else {
        console.log("[Realtime] Session ready (no input_audio_transcription field on session object — may be normal for this API shape)");
      }
      this.sessionReadyResolve?.();
      this.sessionReadyResolve = null;
    }

    switch (message.type) {
      case "response.output_audio.delta": {
        if (this.activeAssistantAudioChannel === "legacy_audio") {
          break;
        }
        this.activeAssistantAudioChannel = "output_audio";
        const deltaOut = message.delta;
        if (deltaOut) {
          this.cancelAssistantPlaybackFinishedTimer();
          if (this.audioQueue.length === 0) {
            console.log("[Realtime] First output audio delta received, queueing for playback");
          }
          const audioData = this.base64ToArrayBuffer(deltaOut);
          this.options.onAudioDelta?.(audioData);
          this.queueAudio(audioData);
        }
        break;
      }
      case "response.audio.delta": {
        if (this.activeAssistantAudioChannel === "output_audio") {
          break;
        }
        this.activeAssistantAudioChannel = "legacy_audio";
        const deltaLegacy = message.delta;
        if (deltaLegacy) {
          this.cancelAssistantPlaybackFinishedTimer();
          if (this.audioQueue.length === 0) {
            console.log("[Realtime] First legacy audio delta received, queueing for playback");
          }
          const audioData = this.base64ToArrayBuffer(deltaLegacy);
          this.options.onAudioDelta?.(audioData);
          this.queueAudio(audioData);
        }
        break;
      }

      case "response.output_audio_transcript.done":
      case "response.audio_transcript.done": {
        const transcript = message.transcript ?? (message as any).response?.transcript;
        if (transcript) {
          console.log("[Realtime] Assistant transcript (from transcript event):", transcript.slice(0, 80) + (transcript.length > 80 ? "…" : ""));
          this.options.onTranscript?.(transcript, "assistant");
        }
        break;
      }
      case "response.content_part.done":
        // Assistant transcript is shown only from response.output_audio_transcript.done to avoid duplicates
        break;

      case "response.done": {
        this.activeAssistantAudioChannel = null;
        const response = (message as any).response;
        const status = response?.status;
        const statusDetails = response?.status_details;
        console.log("[Realtime] response.done status:", status, "output length:", response?.output?.length ?? 0, statusDetails ? "details:" : "", statusDetails);
        if (status === "failed") {
          const err = statusDetails?.error ?? statusDetails;
          const message = err?.message ?? (typeof statusDetails === "string" ? statusDetails : statusDetails?.reason ?? JSON.stringify(statusDetails));
          const code = err?.code ?? err?.type;
          const friendly =
            code === "insufficient_quota"
              ? "OpenAI quota exceeded. Add payment method or increase limits at https://platform.openai.com/account/billing"
              : message;
          console.error("[Realtime] Response failed:", message);
          this.cancelAssistantPlaybackFinishedTimer();
          this.options.onError?.(new Error(friendly));
          break;
        }
        // Covers text-only / tool-only turns (no audio) and backs up playback-drain detection
        this.scheduleAssistantPlaybackFinished();
        break;
      }

      case "conversation.item.input_audio_transcription.delta": {
        const itemId = (message as any).item_id as string | undefined;
        const delta = typeof (message as any).delta === "string" ? (message as any).delta : "";
        if (!itemId || !delta) break;
        const prev = this.inputTranscriptByItemId.get(itemId) ?? "";
        this.inputTranscriptByItemId.set(itemId, prev + delta);
        break;
      }

      case "conversation.item.input_audio_transcription.completed": {
        const itemId = ((message as any).item_id as string | undefined) ?? null;
        const fromEvent =
          typeof (message as any).transcript === "string" ? (message as any).transcript.trim() : "";
        const fromDelta = itemId ? (this.inputTranscriptByItemId.get(itemId) ?? "").trim() : "";
        if (itemId) this.inputTranscriptByItemId.delete(itemId);
        const t = fromEvent || fromDelta;
        if (t) {
          console.log("[Realtime] User transcript (input_audio_transcription.completed):", t.slice(0, 120) + (t.length > 120 ? "…" : ""));
          this.tryEmitUserTranscript(t, itemId);
        } else {
          console.warn("[Realtime] input_audio_transcription.completed with empty transcript", { itemId });
        }
        break;
      }

      case "conversation.item.input_audio_transcription.failed":
        console.warn("[Realtime] Input audio transcription failed:", message.error ?? message);
        break;

      case "conversation.item.done": {
        const item = (message as any).item;
        const text = this.extractUserTranscriptFromConversationItem(item);
        const itemId = item?.id as string | undefined;
        if (text) {
          console.log("[Realtime] User transcript (conversation.item.done):", text.slice(0, 120) + (text.length > 120 ? "…" : ""));
          this.tryEmitUserTranscript(text, itemId);
        }
        break;
      }

      case "response.function_call_arguments.done":
        this.handleFunctionCall(message);
        break;

      case "error": {
        this.activeAssistantAudioChannel = null;
        const msg = message.error?.message ?? (message as any).message ?? "Realtime error";
        console.error("[Realtime] Error:", message.error ?? message);
        if (typeof msg === "string" && (msg.includes("buffer too small") || msg.includes("0.00ms"))) {
          console.warn(
            "[Realtime] Server said buffer was empty. Check above for 'Sent commit... chunks:' — if chunks were high, the server may be rejecting our audio format (pcm16 @ 24kHz)."
          );
          this.options.onError?.(
            new Error("Server received no usable audio. Open browser console (F12) and look for 'Realtime' logs when you speak and click Stop.")
          );
        } else {
          this.options.onError?.(new Error(msg));
        }
        break;
      }
    }
  }

  /** Push-to-talk: commit buffered audio and ask the model to respond. Call before stopRecording() so chunk/byte counts are still valid. */
  commitAndRespond(): void {
    if (this.closed) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (this.sendChunkCount === 0 || this.totalBytesSent < this.minBytesForCommit) {
      console.warn(
        "[Realtime] Not enough audio to commit (need ~100ms). Chunks:",
        this.sendChunkCount,
        "bytes:",
        this.totalBytesSent,
        "min:",
        this.minBytesForCommit
      );
      this.options.onError?.(
        new Error("Speak for at least a second, then click Stop Speaking to get a response.")
      );
      return;
    }
    this.send({ type: "input_audio_buffer.commit" });
    this.send({ type: "response.create" });
    console.log("[Realtime] Sent commit + response.create, chunks:", this.sendChunkCount, "bytes:", this.totalBytesSent);
  }

  private async handleFunctionCall(message: RealtimeMessage) {
    if (!this.options.onFunctionCall) return;

    const { name, arguments: argsStr, call_id } = message;
    const args = JSON.parse(argsStr || "{}");

    try {
      const result = await this.options.onFunctionCall(name, args);

      this.send({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id,
          output: JSON.stringify(result),
        },
      });

      this.send({ type: "response.create" });
    } catch (error) {
      console.error("[Realtime] Function call error:", error);
      const msg = error instanceof Error ? error.message : String(error);
      this.send({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id,
          output: JSON.stringify({
            error: true,
            message: msg,
            results: [],
            hint: "Search or tool failed on the server. Ask the user to try again or rephrase.",
          }),
        },
      });
      this.send({ type: "response.create" });
    }
  }

  /** Release mic/graph after startRecording partially completed but client was disconnected (race with Stop / modal close). */
  private async abortStartRecordingAfterPartialSetup(): Promise<void> {
    try {
      if (this.captureWorkletNode) {
        try {
          this.audioSource?.disconnect();
          this.captureWorkletNode.disconnect();
        } catch (_) {}
        this.captureWorkletNode = null;
      }
      if (this.audioProcessor) {
        try {
          this.audioProcessor.disconnect();
          this.audioSource?.disconnect();
          this.silentCaptureGain?.disconnect();
        } catch (_) {}
        this.audioProcessor = null;
        this.silentCaptureGain = null;
      }
      this.audioSource = null;
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((t) => t.stop());
        this.mediaStream = null;
      }
      if (this.audioContext) {
        try {
          await this.audioContext.close();
        } catch (_) {}
        this.audioContext = null;
      }
      this.sendChunkCount = 0;
      this.totalBytesSent = 0;
    } catch (e) {
      console.warn("[Realtime] abortStartRecordingAfterPartialSetup:", e);
    }
  }

  async startRecording(): Promise<void> {
    try {
      await this.sessionReadyPromise;
      if (this.closed) return;

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (this.closed) {
        this.mediaStream.getTracks().forEach((t) => t.stop());
        this.mediaStream = null;
        console.log("[Realtime] startRecording aborted after getUserMedia (client closed)");
        return;
      }

      this.audioContext = new AudioContext({ sampleRate: 24000 });
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      if (this.closed) {
        await this.abortStartRecordingAfterPartialSetup();
        return;
      }

      this.audioSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      const actualRate = this.audioContext.sampleRate;

      if (typeof this.audioContext.audioWorklet !== "undefined") {
        try {
          const workletUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/realtime-audio-worklet.js`;
          await this.audioContext.audioWorklet.addModule(workletUrl);
          if (this.closed) {
            await this.abortStartRecordingAfterPartialSetup();
            return;
          }
          this.captureWorkletNode = new AudioWorkletNode(this.audioContext, "realtime-capture-processor", {
            processorOptions: { inputSampleRate: actualRate },
          });
          this.captureWorkletNode.port.onmessage = (e: MessageEvent<{ buffer: ArrayBuffer }>) => {
            if (this.closed) return;
            if (e.data?.buffer) {
              this.sendAudio(e.data.buffer);
              this.sendChunkCount++;
              if (this.sendChunkCount % 100 === 1) {
                console.log("[Realtime] Sending audio (worklet), rate:", actualRate, "chunks:", this.sendChunkCount);
              }
            }
          };
          if (this.closed) {
            await this.abortStartRecordingAfterPartialSetup();
            return;
          }
          this.audioSource.connect(this.captureWorkletNode);
          this.useWorklet = true;
          console.log("[Realtime] Recording started (AudioWorklet), context rate:", actualRate);
          return;
        } catch (workletErr) {
          console.warn("[Realtime] AudioWorklet failed, using ScriptProcessor:", workletErr);
          if (this.closed) {
            await this.abortStartRecordingAfterPartialSetup();
            return;
          }
        }
      }

      this.useWorklet = false;
      if (this.closed) {
        await this.abortStartRecordingAfterPartialSetup();
        return;
      }
      this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.audioProcessor.onaudioprocess = (e) => {
        if (this.closed) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const outputData = e.outputBuffer.getChannelData(0);
        outputData.fill(0);
        const at24k =
          actualRate === 24000
            ? inputData
            : this.resampleTo24k(inputData, actualRate);
        const pcm16 = this.floatTo16BitPCM(at24k);
        this.sendAudio(pcm16);
        this.sendChunkCount++;
        if (this.sendChunkCount % 100 === 1) {
          console.log("[Realtime] Sending audio (ScriptProcessor), rate:", actualRate, "chunks:", this.sendChunkCount);
        }
      };
      this.audioSource.connect(this.audioProcessor);
      this.silentCaptureGain = this.audioContext.createGain();
      this.silentCaptureGain.gain.value = 0;
      this.audioProcessor.connect(this.silentCaptureGain);
      this.silentCaptureGain.connect(this.audioContext.destination);
      console.log("[Realtime] Recording started (ScriptProcessor), context rate:", actualRate);
    } catch (error) {
      console.error("[Realtime] Error starting recording:", error);
      throw error;
    }
  }

  stopRecording() {
    if (this.captureWorkletNode) {
      try {
        this.audioSource?.disconnect();
        this.captureWorkletNode.disconnect();
      } catch (_) {}
      this.captureWorkletNode = null;
    }
    if (this.audioProcessor && this.audioSource) {
      try {
        this.audioProcessor.disconnect();
        this.audioSource.disconnect();
        this.silentCaptureGain?.disconnect();
      } catch (_) {}
      this.audioProcessor = null;
      this.audioSource = null;
      this.silentCaptureGain = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.sendChunkCount = 0;
    this.totalBytesSent = 0;
    console.log("[Realtime] Recording stopped");
  }

  private resampleTo24k(float32: Float32Array, fromSampleRate: number): Float32Array {
    if (fromSampleRate === 24000) return float32;
    const ratio = 24000 / fromSampleRate;
    const outLength = Math.round(float32.length * ratio);
    const result = new Float32Array(outLength);
    for (let i = 0; i < outLength; i++) {
      const srcIndex = i / ratio;
      const j = Math.floor(srcIndex);
      const frac = srcIndex - j;
      const next = j + 1 < float32.length ? float32[j + 1]! : float32[j]!;
      result[i] = float32[j]! * (1 - frac) + next * frac;
    }
    return result;
  }

  private sendAudio(audioData: ArrayBuffer) {
    if (this.closed) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (audioData.byteLength === 0) return;

    if (this.options.onUserAudio && this.sendChunkCount % 20 === 0) {
      this.options.onUserAudio();
    }
    this.totalBytesSent += audioData.byteLength;
    const base64Audio = this.arrayBufferToBase64(audioData);
    if (this.sendChunkCount === 0) {
      console.log("[Realtime] First append:", audioData.byteLength, "bytes, base64 length:", base64Audio.length);
    }
    this.send({
      type: "input_audio_buffer.append",
      audio: base64Audio,
    });
  }

  private queueAudio(audioData: ArrayBuffer) {
    this.audioQueue.push(audioData);
    if (!this.isPlaying) {
      this.playAudioQueue();
    }
  }

  private cancelAssistantPlaybackFinishedTimer() {
    if (this.assistantPlaybackFinishedTimer) {
      clearTimeout(this.assistantPlaybackFinishedTimer);
      this.assistantPlaybackFinishedTimer = null;
    }
  }

  /** When queue is idle, notify after debounce so we do not fire between PCM chunks. */
  private scheduleAssistantPlaybackFinished() {
    if (this.closed) return;
    this.cancelAssistantPlaybackFinishedTimer();
    this.assistantPlaybackFinishedTimer = setTimeout(() => {
      this.assistantPlaybackFinishedTimer = null;
      if (this.closed) return;
      if (this.isPlaying || this.audioQueue.length > 0) return;
      this.options.onAssistantPlaybackFinished?.();
    }, 450);
  }

  private async playAudioQueue() {
    if (this.isPlaying || this.audioQueue.length === 0) return;
    
    this.isPlaying = true;

    if (!this.playbackContext) {
      this.playbackContext = new AudioContext({ sampleRate: 24000 });
    }
    if (this.playbackContext.state === "suspended") {
      await this.playbackContext.resume();
    }

    while (this.audioQueue.length > 0 && !this.closed) {
      const audioData = this.audioQueue.shift();
      if (audioData) {
        await this.playAudioChunk(audioData);
      }
    }

    this.isPlaying = false;
    this.scheduleAssistantPlaybackFinished();
  }

  private async playAudioChunk(audioData: ArrayBuffer) {
    const ctx = this.playbackContext;
    if (!ctx) return;

    try {
      const audioBuffer = await ctx.decodeAudioData(this.pcm16ToWav(audioData));
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      return new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    } catch (e) {
      console.warn("[Realtime] Playback decode error:", e);
    }
  }

  send(message: RealtimeMessage) {
    if (this.closed) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[Realtime] WebSocket not open, message not sent");
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  disconnect() {
    if (this.connectPromiseSettlers) {
      const { reject } = this.connectPromiseSettlers;
      this.connectPromiseSettlers = null;
      reject(new DOMException("RealtimeClient disconnected", "AbortError"));
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: "input_audio_buffer.clear" }));
      } catch (_) {}
    }

    this.closed = true;

    this.cancelAssistantPlaybackFinishedTimer();

    this.stopRecording();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.playbackContext) {
      this.playbackContext.close();
      this.playbackContext = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.audioQueue = [];
    this.seenDeltaTypes.clear();
    this.activeAssistantAudioChannel = null;
    this.inputTranscriptByItemId.clear();
    this.emittedUserTranscriptItemIds.clear();
  }

  private tryEmitUserTranscript(text: string, itemId?: string | null) {
    const t = (text || "").trim();
    if (!t) return;
    if (itemId && this.emittedUserTranscriptItemIds.has(itemId)) return;
    if (itemId) this.emittedUserTranscriptItemIds.add(itemId);
    this.options.onTranscript?.(t, "user");
  }

  /** Finalized user items may include input_audio.transcript when transcription is enabled */
  private extractUserTranscriptFromConversationItem(item: any): string {
    if (!item || item.role !== "user") return "";
    const content = item.content;
    const parts = Array.isArray(content) ? content : content ? [content] : [];
    for (const c of parts) {
      if (c?.type === "input_audio" && typeof c.transcript === "string" && c.transcript.trim()) {
        return c.transcript.trim();
      }
      if (typeof c?.transcript === "string" && c.transcript.trim()) {
        return c.transcript.trim();
      }
    }
    return "";
  }

  // Utility functions
  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;

    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return buffer;
  }

  private pcm16ToWav(pcm16: ArrayBuffer): ArrayBuffer {
    const dataLength = pcm16.byteLength;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 24000, true);
    view.setUint32(28, 24000 * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataLength, true);

    // Copy PCM data
    new Uint8Array(buffer, 44).set(new Uint8Array(pcm16));

    return buffer;
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}


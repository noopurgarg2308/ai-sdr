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
}

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private options: RealtimeOptions;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private audioSource: MediaStreamAudioSourceNode | null = null;
  private captureWorkletNode: AudioWorkletNode | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private playbackContext: AudioContext | null = null;
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
    const url = `wss://api.openai.com/v1/realtime?model=${this.options.model}`;
    
    this.ws = new WebSocket(url, [
      "realtime",
      `openai-insecure-api-key.${this.options.apiKey}`,
      "openai-beta.realtime-v1",
    ]);

    return new Promise((resolve, reject) => {
      if (!this.ws) return reject(new Error("WebSocket not initialized"));

      this.ws.onopen = () => {
        console.log("[Realtime] Connected to OpenAI");
        this.initializeSession();
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error("[Realtime] Error parsing message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("[Realtime] WebSocket error:", error);
        this.options.onError?.(new Error("WebSocket error"));
        reject(error);
      };

      this.ws.onclose = () => {
        console.log("[Realtime] Disconnected");
      };
    });
  }

  private initializeSession() {
    // gpt-4o-realtime-preview-2024-12-17 expects flat session schema (not nested audio.input)
    const session: any = {
      modalities: ["text", "audio"],
      voice: this.options.voice,
      instructions: this.options.instructions,
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      turn_detection: {
        type: "server_vad",
        threshold: 0.3,
        prefix_padding_ms: 400,
        silence_duration_ms: 600,
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
  private handleMessage(message: RealtimeMessage) {
    if (message.type !== "response.output_audio.delta" && message.type !== "response.audio.delta") {
      console.log("[Realtime] ←", message.type, message.error ? message : "");
    } else if (!this.seenDeltaTypes.has(message.type)) {
      this.seenDeltaTypes.add(message.type);
      console.log("[Realtime] ← (first)", message.type, "— receiving output audio deltas");
    }
    this.options.onMessage?.(message);

    if (message.type === "session.updated" || message.type === "session.created") {
      console.log("[Realtime] Session ready");
      this.sessionReadyResolve?.();
      this.sessionReadyResolve = null;
    }

    switch (message.type) {
      case "response.output_audio.delta":
      case "response.audio.delta":
        const delta = message.delta;
        if (delta) {
          if (this.audioQueue.length === 0) {
            console.log("[Realtime] First output audio delta received, queueing for playback");
          }
          const audioData = this.base64ToArrayBuffer(delta);
          this.options.onAudioDelta?.(audioData);
          this.queueAudio(audioData);
        }
        break;

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
          this.options.onError?.(new Error(friendly));
          break;
        }
        // Assistant transcript is shown only from response.output_audio_transcript.done to avoid duplicates
        break;
      }

      case "conversation.item.input_audio_transcription.completed":
        if (message.transcript) {
          this.options.onTranscript?.(message.transcript, "user");
        }
        break;

      case "conversation.item.added":
      case "conversation.item.done": {
        const item = message.item;
        if (!item?.role) break;
        // Only show user transcript here; assistant transcript comes from response.output_audio_transcript.done only (avoids duplicate messages)
        if (item.role === "assistant") break;
        const content = Array.isArray(item.content) ? item.content : item.content ? [item.content] : [];
        for (const c of content) {
          const text = c?.transcript ?? c?.text;
          if (text && item.role === "user") {
            this.options.onTranscript?.(text, "user");
            break;
          }
        }
        break;
      }

      case "response.function_call_arguments.done":
        this.handleFunctionCall(message);
        break;

      case "error": {
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
    }
  }

  async startRecording(): Promise<void> {
    try {
      await this.sessionReadyPromise;
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: 24000 });
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.audioSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      const actualRate = this.audioContext.sampleRate;

      if (typeof this.audioContext.audioWorklet !== "undefined") {
        try {
          const workletUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/realtime-audio-worklet.js`;
          await this.audioContext.audioWorklet.addModule(workletUrl);
          this.captureWorkletNode = new AudioWorkletNode(this.audioContext, "realtime-capture-processor", {
            processorOptions: { inputSampleRate: actualRate },
          });
          this.captureWorkletNode.port.onmessage = (e: MessageEvent<{ buffer: ArrayBuffer }>) => {
            if (e.data?.buffer) {
              this.sendAudio(e.data.buffer);
              this.sendChunkCount++;
              if (this.sendChunkCount % 100 === 1) {
                console.log("[Realtime] Sending audio (worklet), rate:", actualRate, "chunks:", this.sendChunkCount);
              }
            }
          };
          this.audioSource.connect(this.captureWorkletNode);
          this.useWorklet = true;
          console.log("[Realtime] Recording started (AudioWorklet), context rate:", actualRate);
          return;
        } catch (workletErr) {
          console.warn("[Realtime] AudioWorklet failed, using ScriptProcessor:", workletErr);
        }
      }

      this.useWorklet = false;
      this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.audioProcessor.onaudioprocess = (e) => {
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
      this.audioProcessor.connect(this.audioContext.destination);
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
      } catch (_) {}
      this.audioProcessor = null;
      this.audioSource = null;
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (audioData.byteLength === 0) return;

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

  private async playAudioQueue() {
    if (this.isPlaying || this.audioQueue.length === 0) return;
    
    this.isPlaying = true;

    if (!this.playbackContext) {
      this.playbackContext = new AudioContext({ sampleRate: 24000 });
    }
    if (this.playbackContext.state === "suspended") {
      await this.playbackContext.resume();
    }

    while (this.audioQueue.length > 0) {
      const audioData = this.audioQueue.shift();
      if (audioData) {
        await this.playAudioChunk(audioData);
      }
    }

    this.isPlaying = false;
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[Realtime] WebSocket not open, message not sent");
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  disconnect() {
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


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
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;

  constructor(options: RealtimeOptions) {
    this.options = {
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: "alloy",
      ...options,
    };
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
    const session: any = {
      modalities: ["text", "audio"],
      voice: this.options.voice,
      instructions: this.options.instructions,
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
    };

    // Add tools if provided
    if (this.options.tools && this.options.tools.length > 0) {
      session.tools = this.options.tools;
      session.tool_choice = "auto";
    }

    this.send({
      type: "session.update",
      session,
    });
  }

  private handleMessage(message: RealtimeMessage) {
    console.log("[Realtime] Message:", message.type);
    
    this.options.onMessage?.(message);

    switch (message.type) {
      case "response.audio.delta":
        if (message.delta) {
          const audioData = this.base64ToArrayBuffer(message.delta);
          this.options.onAudioDelta?.(audioData);
          this.queueAudio(audioData);
        }
        break;

      case "conversation.item.created":
        if (message.item?.content) {
          const content = message.item.content.find((c: any) => c.type === "text");
          if (content) {
            this.options.onTranscript?.(content.text, message.item.role);
          }
        }
        break;

      case "response.function_call_arguments.done":
        this.handleFunctionCall(message);
        break;

      case "error":
        console.error("[Realtime] Error:", message.error);
        this.options.onError?.(new Error(message.error.message));
        break;
    }
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
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: 24000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = this.floatTo16BitPCM(inputData);
        this.sendAudio(pcm16);
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      console.log("[Realtime] Recording started");
    } catch (error) {
      console.error("[Realtime] Error starting recording:", error);
      throw error;
    }
  }

  stopRecording() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log("[Realtime] Recording stopped");
  }

  private sendAudio(audioData: ArrayBuffer) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const base64Audio = this.arrayBufferToBase64(audioData);
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

    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
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
    if (!this.audioContext) return;

    const audioBuffer = await this.audioContext.decodeAudioData(
      this.pcm16ToWav(audioData)
    );
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    return new Promise<void>((resolve) => {
      source.onended = () => resolve();
      source.start();
    });
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

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.audioQueue = [];
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


/**
 * AudioWorklet for capturing mic at context sample rate, resampling to 24kHz,
 * converting to PCM16, and posting to main thread. Runs on audio thread so
 * capture is reliable (unlike deprecated ScriptProcessor).
 */
const TARGET_SAMPLE_RATE = 24000;

function resampleTo24k(float32, fromRate) {
  if (fromRate === TARGET_SAMPLE_RATE) return float32;
  const ratio = TARGET_SAMPLE_RATE / fromRate;
  const outLength = Math.round(float32.length * ratio);
  const result = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIndex = i / ratio;
    const j = Math.floor(srcIndex);
    const frac = srcIndex - j;
    const next = j + 1 < float32.length ? float32[j + 1] : float32[j];
    result[i] = float32[j] * (1 - frac) + next * frac;
  }
  return result;
}

function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

class RealtimeCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.inputSampleRate = options.processorOptions?.inputSampleRate ?? 24000;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    if (!input || !input.length) return true;
    const channel = input[0];
    if (!channel || channel.length === 0) return true;

    const at24k = resampleTo24k(channel, this.inputSampleRate);
    const buffer = floatTo16BitPCM(at24k);
    this.port.postMessage({ buffer }, [buffer]);
    return true;
  }
}

registerProcessor("realtime-capture-processor", RealtimeCaptureProcessor);

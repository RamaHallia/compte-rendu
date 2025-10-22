// Utilitaires d'encodage audio côté client (sans FFmpeg)
// Convertit un Blob (webm/ogg/mp4...) en WAV PCM 16kHz mono compatible Whisper

async function decodeToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return audioBuffer;
  } finally {
    // Safari nécessite parfois un close explicite
    try { ctx.close(); } catch {}
  }
}

function downmixToMono(buffer: AudioBuffer): Float32Array {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const tmp = new Float32Array(length);
  if (numChannels === 1) {
    buffer.copyFromChannel(tmp, 0, 0);
    return tmp;
  }
  const ch0 = new Float32Array(length);
  buffer.copyFromChannel(ch0, 0, 0);
  const mono = new Float32Array(length);
  for (let c = 0; c < numChannels; c++) {
    const ch = new Float32Array(length);
    buffer.copyFromChannel(ch, c, 0);
    for (let i = 0; i < length; i++) mono[i] += ch[i] / numChannels;
  }
  return mono;
}

async function resampleTo16kHz(monoData: Float32Array, sourceSampleRate: number): Promise<Float32Array> {
  if (sourceSampleRate === 16000) return monoData;
  const offline = new OfflineAudioContext(1, Math.ceil(monoData.length * 16000 / sourceSampleRate), 16000);
  const buffer = offline.createBuffer(1, monoData.length, sourceSampleRate);
  buffer.copyToChannel(monoData, 0, 0);
  const src = offline.createBufferSource();
  src.buffer = buffer;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();
  const out = new Float32Array(rendered.length);
  rendered.copyFromChannel(out, 0, 0);
  return out;
}

function floatTo16BitPCM(float32: Float32Array): Int16Array {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return out;
}

function encodeWavPCM16(mono16k: Int16Array, sampleRate = 16000): Blob {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = mono16k.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  // PCM samples
  let offset = 44;
  for (let i = 0; i < mono16k.length; i++, offset += 2) view.setInt16(offset, mono16k[i], true);

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

export async function ensureWhisperCompatible(input: Blob): Promise<Blob> {
  // Toujours convertir en WAV 16k mono pour garantir compatibilité Whisper
  const decoded = await decodeToAudioBuffer(input);
  const mono = downmixToMono(decoded);
  const resampled = await resampleTo16kHz(mono, decoded.sampleRate);
  const pcm16 = floatTo16BitPCM(resampled);
  return encodeWavPCM16(pcm16, 16000);
}

// Construit directement un WAV 16k mono à partir d'échantillons float32 et d'un sampleRate source
export async function buildWavFromFloat(monoFloat32: Float32Array, sourceSampleRate: number): Promise<Blob> {
  const resampled = await resampleTo16kHz(monoFloat32, sourceSampleRate);
  const pcm16 = floatTo16BitPCM(resampled);
  return encodeWavPCM16(pcm16, 16000);
}



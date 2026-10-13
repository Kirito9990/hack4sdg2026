function mix(buffer: AudioBuffer) {
  const mixed = new Float32Array(buffer.length);
  const channels = buffer.numberOfChannels;
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index++) mixed[index] += data[index] / channels;
  }
  return mixed;
}

function downsample(input: Float32Array, inRate: number, outRate: number) {
  if (inRate <= outRate) return input;
  const ratio = inRate / outRate;
  const length = Math.floor(input.length / ratio);
  const out = new Float32Array(length);
  for (let index = 0; index < length; index++) {
    const start = Math.floor(index * ratio);
    const end = Math.min(input.length, Math.floor((index + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let sample = start; sample < end; sample++) {
      sum += input[sample];
      count++;
    }
    out[index] = count ? sum / count : 0;
  }
  return out;
}

function wavBytes(samples: Float32Array, rate: number) {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const write = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index++)
      view.setUint8(offset + index, text.charCodeAt(index));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let index = 0; index < samples.length; index++) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return bytes;
}

/** Gemini chat audio does not accept browser webm, so recordings are sent as 16 kHz wav. */
export async function recordingToWav(blob: Blob) {
  if (typeof AudioContext === "undefined") return blob;
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const pcm = downsample(mix(decoded), decoded.sampleRate, 16000);
    if (!pcm.length) return blob;
    return new Blob([wavBytes(pcm, 16000)], { type: "audio/wav" });
  } catch {
    return blob;
  } finally {
    await context.close().catch(() => undefined);
  }
}

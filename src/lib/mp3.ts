/** MP3-friendly rate; decodeAudioData resamples to the context's rate, whatever the mic used. */
const SAMPLE_RATE = 44_100;
/** Samples per MP3 frame; the encoder is fed one frame at a time. */
const FRAME = 1152;

/**
 * Converts a MediaRecorder recording (WebM/Opus in Chrome, MP4 in Safari) to a mono MP3.
 * Browsers can't record MP3 natively, and many desktop players can't open WebM audio.
 */
export async function toMp3(recording: Blob, kbps = 128): Promise<{ mp3: Blob; peak: number }> {
  const [{ Mp3Encoder }, audio] = await Promise.all([import("@breezystack/lamejs"), decode(recording)]);

  // Mix down to mono and convert float [-1, 1] samples to 16-bit PCM.
  const pcm = new Int16Array(audio.length);
  let peak = 0;
  const channels = Array.from({ length: audio.numberOfChannels }, (_, c) => audio.getChannelData(c));
  for (let i = 0; i < pcm.length; i++) {
    let sum = 0;
    for (const ch of channels) sum += ch[i];
    const v = Math.max(-1, Math.min(1, sum / channels.length));
    if (Math.abs(v) > peak) peak = Math.abs(v);
    pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }

  const encoder = new Mp3Encoder(1, audio.sampleRate, kbps);
  const parts: BlobPart[] = [];
  for (let i = 0; i < pcm.length; i += FRAME) {
    const out = encoder.encodeBuffer(pcm.subarray(i, i + FRAME));
    if (out.length) parts.push(new Uint8Array(out));
    // Yield now and then so a long speech doesn't freeze the page while encoding.
    if (i % (FRAME * 400) === 0) await new Promise((r) => setTimeout(r));
  }
  parts.push(new Uint8Array(encoder.flush()));
  return { mp3: new Blob(parts, { type: "audio/mpeg" }), peak };
}

async function decode(blob: Blob) {
  const ac = new AudioContext({ sampleRate: SAMPLE_RATE });
  try {
    return await ac.decodeAudioData(await blob.arrayBuffer());
  } finally {
    void ac.close();
  }
}

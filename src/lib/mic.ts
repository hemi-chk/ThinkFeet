/**
 * Below this peak level a recording is digital silence: a real mic, even in a quiet room, has a
 * noise floor around 0.001+. Exact zeros mean a muted, blocked, or virtual input sending nothing
 * (e.g. a "noise-cancelling" virtual mic whose companion app isn't running).
 */
export const SILENCE_PEAK = 0.0005;

const MIC_KEY = "thinkfeet:mic";

/** The microphone picked on a previous visit, if any (per browser). */
export function savedMicId(): string {
  try {
    return localStorage.getItem(MIC_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveMicId(id: string) {
  try {
    if (id) localStorage.setItem(MIC_KEY, id);
    else localStorage.removeItem(MIC_KEY);
  } catch {
    /* storage blocked: the choice just won't be remembered */
  }
}

/** Opens the chosen microphone, falling back to the browser default if it has gone away. */
export async function openMic(deviceId?: string): Promise<MediaStream> {
  if (!deviceId) return navigator.mediaDevices.getUserMedia({ audio: true });
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } });
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (name === "OverconstrainedError" || name === "NotFoundError") {
      return navigator.mediaDevices.getUserMedia({ audio: true });
    }
    throw err;
  }
}

export async function listMics(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  // Chrome on Windows adds a "communications" alias that duplicates a real device.
  return devices.filter((d) => d.kind === "audioinput" && d.deviceId !== "communications");
}

/** Root-mean-square and peak of a block of samples. */
export function measure(samples: Float32Array) {
  let sum = 0;
  let peak = 0;
  for (const v of samples) {
    sum += v * v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  return { rms: Math.sqrt(sum / samples.length), peak };
}

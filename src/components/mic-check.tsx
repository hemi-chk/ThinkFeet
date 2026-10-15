"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listMics, measure, openMic, SILENCE_PEAK } from "@/lib/mic";
import { cn } from "@/lib/utils";

type Status = "idle" | "listening" | "denied";
/** How long a mic must send pure silence before we call it out. */
const SILENT_AFTER_MS = 1500;

/**
 * Lets the user pick a microphone and see a live level meter, so a muted or virtual mic is caught
 * before the speech instead of producing a silent recording.
 */
export function MicCheck({ deviceId, onDeviceChange }: { deviceId: string; onDeviceChange: (id: string) => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [level, setLevel] = useState(0);
  const [verdict, setVerdict] = useState<"checking" | "ok" | "silent">("checking");

  useEffect(() => {
    if (status !== "listening") return;
    let stream: MediaStream | null = null;
    let ac: AudioContext | null = null;
    let raf = 0;
    let disposed = false;

    (async () => {
      try {
        stream = await openMic(deviceId || undefined);
      } catch {
        if (!disposed) setStatus("denied");
        return;
      }
      if (disposed) return stream.getTracks().forEach((t) => t.stop());
      // Labels are only available once mic permission is granted.
      setDevices(await listMics());
      setVerdict("checking");
      ac = new AudioContext();
      const analyser = ac.createAnalyser();
      analyser.fftSize = 2048;
      ac.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      const since = performance.now();
      let loudest = 0;
      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        const { rms, peak } = measure(buf);
        loudest = Math.max(loudest, peak);
        // sqrt scale so quiet speech still moves the bar visibly.
        setLevel(Math.min(1, Math.sqrt(rms) * 2.2));
        if (loudest > SILENCE_PEAK) setVerdict("ok");
        else if (performance.now() - since > SILENT_AFTER_MS) setVerdict("silent");
        raf = requestAnimationFrame(tick);
      };
      tick();
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      void ac?.close().catch(() => {});
    };
  }, [status, deviceId]);

  if (status === "idle") {
    return (
      <Button type="button" variant="outline" className="rounded-full border-2" onClick={() => setStatus("listening")}>
        🎙️ Test microphone
      </Button>
    );
  }

  if (status === "denied") {
    return (
      <p className="rounded-2xl bg-danger-soft p-3 text-sm text-destructive">
        Microphone access is blocked. Allow it from the icon in your browser&apos;s address bar, then reload.
      </p>
    );
  }

  return (
    <div className="w-full max-w-md space-y-3 rounded-2xl border-2 p-4">
      <Select value={deviceId || "default"} onValueChange={(v) => onDeviceChange(v === "default" ? "" : v)}>
        <SelectTrigger className="w-full rounded-2xl" aria-label="Microphone">
          <SelectValue placeholder="Microphone" />
        </SelectTrigger>
        <SelectContent>
          {devices.map((d, i) => (
            <SelectItem key={d.deviceId || i} value={d.deviceId || "default"}>
              {d.label || `Microphone ${i + 1}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="h-3 overflow-hidden rounded-full bg-muted" role="meter" aria-label="Microphone level" aria-valuenow={Math.round(level * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={cn("h-full rounded-full transition-[width] duration-75", verdict === "silent" ? "bg-coral" : "bg-mint")}
          style={{ width: `${Math.max(2, level * 100)}%` }}
        />
      </div>
      <p className={cn("text-sm", verdict === "silent" ? "text-destructive" : "text-muted-foreground")}>
        {verdict === "silent"
          ? "No sound at all from this microphone — it may be muted or a virtual device. Pick another one above."
          : verdict === "ok"
            ? "✓ We can hear this microphone. Say something to see the bar move."
            : "Listening…"}
      </p>
    </div>
  );
}

"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Topic } from "@/data/topics";
import { formatTime, useElapsed } from "@/hooks/use-timer";
import { beep } from "@/lib/audio";
import { useAuth } from "@/lib/auth";
import { saveSession } from "@/lib/records";
import { useSession } from "@/lib/session";
import { listenForHandBack } from "@/lib/speech";
import { verdictFor, type Verdict } from "@/lib/timing";
import { cn } from "@/lib/utils";

type Phase = "countdown" | "prep" | "announce" | "live" | "result";

type SaveStatus = "saving" | "saved" | "failed";

interface SpeechResult {
  ms: number;
  audioUrl: string | null;
  /** Null in public mode (signed out), where nothing is saved. */
  save: SaveStatus | null;
}

export function Practice() {
  const s = useSession();
  const { user } = useAuth();
  const router = useRouter();
  const [topic, setTopic] = useState<Topic | null>(() => (s.name ? s.pickTopic() : null));
  const [phase, setPhase] = useState<Phase>(s.prep ? "countdown" : "announce");
  const [result, setResult] = useState<SpeechResult | null>(null);
  const audioUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!s.name) router.replace("/setup");
  }, [s.name, router]);

  useEffect(
    () => () => {
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    },
    [],
  );

  const finishSpeech = (ms: number, blob: Blob | null) => {
    audioUrl.current = blob ? URL.createObjectURL(blob) : null;
    setResult({ ms, audioUrl: audioUrl.current, save: user && topic ? "saving" : null });
    setPhase("result");
    if (!user || !topic) return;
    saveSession(user.uid, {
      topicId: topic.id,
      topicText: topic.text,
      topicLevel: topic.level,
      chosenLevel: s.level,
      prep: s.prep,
      recorded: s.record,
      durationMs: ms,
      verdict: verdictFor(ms),
    }).then(
      () => setResult((r) => r && { ...r, save: "saved" }),
      () => setResult((r) => r && { ...r, save: "failed" }),
    );
  };

  const nextTopic = () => {
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
    setResult(null);
    setTopic(s.pickTopic());
    setPhase(s.prep ? "countdown" : "announce");
  };

  if (!topic) return null;

  return (
    <div key={phase} className="relative min-h-screen animate-fade-up">
      <Button asChild variant="secondary" size="sm" className="absolute left-4 top-4 z-20 rounded-full">
        <Link href="/setup">Exit</Link>
      </Button>
      {phase === "countdown" && <Countdown name={s.name} topic={topic} onDone={() => setPhase("prep")} />}
      {phase === "prep" && <Prep name={s.name} topic={topic} onDone={() => setPhase("announce")} />}
      {phase === "announce" && <Announce name={s.name} topic={topic} onDone={() => setPhase("live")} />}
      {phase === "live" && <Live record={s.record} onDone={finishSpeech} />}
      {phase === "result" && result && (
        <Result name={s.name} ms={result.ms} audioUrl={result.audioUrl} save={result.save} onNext={nextTopic} />
      )}
    </div>
  );
}

function TopicCard({ name, topic, label = "Your topic is" }: { name: string; topic: Topic; label?: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="font-display text-3xl font-semibold text-violet">{name}</p>
      <p className="mt-3 font-hand text-2xl">{label}</p>
      <div className="gradient-border mt-4 w-full max-w-4xl rounded-[2rem] px-10 py-8 shadow-soft">
        <h2 className="font-display text-3xl font-bold md:text-5xl">{topic.text}</h2>
      </div>
    </div>
  );
}

const countdownColors = ["text-mint", "text-coral", "text-sunny", "text-primary"];

function Countdown({ name, topic, onDone }: { name: string; topic: Topic; onDone: () => void }) {
  const [n, setN] = useState(3);
  const done = useEffectEvent(onDone);
  useEffect(() => {
    if (n === 0) return done();
    const t = setTimeout(() => setN(n - 1), 1000);
    return () => clearTimeout(t);
  }, [n]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 px-6">
      <TopicCard name={name} topic={topic} />
      <p className="font-hand text-2xl">Your preparation time starts in</p>
      <span
        key={n}
        className={cn(
          "flex h-40 w-40 animate-pop items-center justify-center rounded-full border-4 border-current font-display text-8xl font-bold",
          countdownColors[n],
        )}
      >
        {n || ""}
      </span>
    </div>
  );
}

const PREP_MS = 120_000;

function Prep({ name, topic, onDone }: { name: string; topic: Topic; onDone: () => void }) {
  const [start] = useState(() => performance.now());
  const elapsed = useElapsed(start);
  const remaining = Math.max(0, PREP_MS - elapsed);
  const secs = Math.ceil(remaining / 1000);
  const lastBeep = useRef<number | null>(null);
  const finished = useRef(false);
  const done = useEffectEvent(onDone);

  // Beep each second for the final five, with a longer, higher tone at zero.
  useEffect(() => {
    if (secs <= 5 && lastBeep.current !== secs) {
      lastBeep.current = secs;
      beep(secs === 0 ? 1200 : 880, secs === 0 ? 0.4 : 0.15);
    }
    if (remaining <= 0 && !finished.current) {
      finished.current = true;
      done();
    }
  }, [secs, remaining]);

  return (
    <div className={cn("flex min-h-screen flex-col items-center justify-center gap-10 px-6", secs <= 5 && "animate-flash")}>
      <TopicCard name={name} topic={topic} />
      <p className="font-hand text-2xl">Your preparation time</p>
      <span className="font-display text-[9rem] font-bold leading-none tabular-nums text-gradient">
        {formatTime(remaining + 999)}
      </span>
    </div>
  );
}

/** Reads the name and topic aloud Table Topics style: name, topic, topic, name. */
function Announce({ name, topic, onDone }: { name: string; topic: Topic; onDone: () => void }) {
  const done = useEffectEvent(onDone);
  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
    const finish = () => {
      if (!cancelled) later(done, 500);
    };
    const synth = window.speechSynthesis;
    if (!synth) {
      later(finish, 2000);
      return () => {
        cancelled = true;
        timers.forEach(clearTimeout);
      };
    }
    synth.cancel();
    const parts = [name, topic.text, topic.text, name];
    const say = (i: number) => {
      if (cancelled) return;
      if (i >= parts.length) return finish();
      let advanced = false;
      const next = (pause: number) => {
        if (advanced) return;
        advanced = true;
        later(() => say(i + 1), pause);
      };
      const u = new SpeechSynthesisUtterance(parts[i]);
      u.rate = 0.95;
      u.onend = () => next(700);
      u.onerror = () => next(300);
      synth.speak(u);
      // Some browsers never fire onend (no voices installed, or a stalled engine); don't get stuck.
      later(() => next(0), 3000 + parts[i].length * 150);
    };
    later(() => say(0), 300);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      synth.cancel();
    };
  }, [name, topic]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="gradient-border w-full max-w-4xl space-y-4 rounded-[2.5rem] px-10 py-12 text-center font-hand shadow-soft">
        <p className="text-4xl text-primary md:text-5xl">{name}</p>
        <p className="text-3xl md:text-4xl">{topic.text}</p>
        <p className="text-3xl md:text-4xl">{topic.text}</p>
        <p className="text-4xl text-primary md:text-5xl">{name}</p>
      </div>
    </div>
  );
}

// Table Topics timing: green at 1:00, yellow at 1:30, red at 2:00, 30s grace, then blinking red.
function timingClass(ms: number) {
  const s = ms / 1000;
  if (s < 60) return "bg-timing-neutral";
  if (s < 90) return "bg-timing-green";
  if (s < 120) return "bg-timing-yellow";
  if (s < 150) return "bg-timing-red";
  return "bg-timing-red animate-blink";
}

/** Mic level (RMS) that counts as speech; it must hold for SPEECH_HOLD_MS to start the timer. */
const SPEECH_THRESHOLD = 0.03;
const SPEECH_HOLD_MS = 200;

function Live({ record, onDone }: { record: boolean; onDone: (ms: number, blob: Blob | null) => void }) {
  const [start, setStart] = useState<number | null>(null);
  const elapsed = useElapsed(start);
  const manualStart = useRef<() => void>(() => {});
  const done = useEffectEvent(onDone);

  useEffect(() => {
    let disposed = false;
    let startedAt: number | null = null;
    let ended = false;
    let stream: MediaStream | null = null;
    let ac: AudioContext | null = null;
    let raf = 0;
    let recorder: MediaRecorder | null = null;
    const chunks: Blob[] = [];
    let stopListening: (() => void) | null = null;

    const releaseMedia = () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      void ac?.close().catch(() => {});
      ac = null;
    };

    const end = () => {
      if (ended || startedAt == null) return;
      ended = true;
      const ms = performance.now() - startedAt;
      stopListening?.();
      const rec = recorder;
      if (rec && rec.state !== "inactive") {
        rec.onstop = () => {
          releaseMedia();
          done(ms, new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
        };
        rec.stop();
      } else {
        releaseMedia();
        done(ms, null);
      }
    };

    const begin = (t: number) => {
      if (startedAt != null || disposed) return;
      startedAt = t;
      setStart(t);
      stopListening = listenForHandBack(end);
    };
    manualStart.current = () => begin(performance.now());

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        toast.error("Microphone unavailable — use Start manually.");
        return;
      }
      if (disposed) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (record) {
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        recorder.start(1000);
      }
      ac = new AudioContext();
      const analyser = ac.createAnalyser();
      analyser.fftSize = 1024;
      ac.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      let loudSince: number | null = null;
      // Start the timer as soon as the speaker's voice is sustained above the threshold.
      const detect = () => {
        if (startedAt != null) return;
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        const rms = Math.sqrt(sum / buf.length);
        const now = performance.now();
        if (rms > SPEECH_THRESHOLD) {
          loudSince ??= now;
          if (now - loudSince >= SPEECH_HOLD_MS) return begin(loudSince);
        } else {
          loudSince = null;
        }
        raf = requestAnimationFrame(detect);
      };
      detect();
    })();

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        end();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      disposed = true;
      window.removeEventListener("keydown", onKey);
      stopListening?.();
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      releaseMedia();
    };
  }, [record]);

  if (start == null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
        <h2 className="animate-pulse font-hand text-4xl text-primary md:text-6xl">Begin when you&apos;re ready…</h2>
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => manualStart.current()}>
          Start manually
        </Button>
      </div>
    );
  }
  return (
    <div className={cn("fixed inset-0 text-timing-foreground transition-colors duration-500", timingClass(elapsed))}>
      <span className="absolute right-6 top-5 font-display text-xl tabular-nums opacity-70">{formatTime(elapsed)}</span>
      <p className="absolute inset-x-0 bottom-8 text-center font-hand text-xl opacity-80">[ press space to end ]</p>
    </div>
  );
}

const timeComments: Record<Verdict, { text: string; className: string }> = {
  under: { text: "Disqualified – under the minimum time.", className: "bg-coral/25 border-coral" },
  short: { text: "You could speak a bit more. OK.", className: "bg-mint/25 border-mint" },
  perfect: { text: "Perfect timing!", className: "bg-mint/25 border-mint" },
  grace: { text: "Be cautious – you're in the grace period.", className: "bg-sunny/30 border-sunny" },
  over: { text: "Overtime – disqualified.", className: "bg-coral/25 border-coral" },
};

const saveMessages: Record<SaveStatus, string> = {
  saving: "Saving to your history…",
  saved: "✓ Saved to your history",
  failed: "Couldn't save this speech to your history.",
};

function Result({
  name,
  ms,
  audioUrl,
  save,
  onNext,
}: {
  name: string;
  ms: number;
  audioUrl: string | null;
  save: SaveStatus | null;
  onNext: () => void;
}) {
  const verdict = verdictFor(ms);
  const c = timeComments[verdict];
  const file = `thinkfeet-${name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.webm`;
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-fun-animated p-4 md:p-8">
      {verdict === "perfect" && <Confetti />}
      <div className="w-full max-w-3xl space-y-8 rounded-[2rem] bg-card px-8 py-12 text-lg shadow-soft md:px-14">
        <div className="flex flex-wrap items-baseline gap-4">
          <span className="font-display text-2xl font-semibold">Your time is:</span>
          <span className="font-display text-7xl font-bold tabular-nums text-gradient md:text-8xl">{formatTime(ms)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-display text-2xl font-semibold">Time comment:</span>
          <span className={cn("rounded-2xl border-2 px-5 py-3 text-lg font-bold text-foreground", c.className)}>{c.text}</span>
        </div>
        {audioUrl && (
          <div className="space-y-3">
            <p>Click here to download your audio ↓</p>
            <Button asChild className="rounded-full bg-mint text-foreground shadow-soft hover:bg-mint/85">
              <a href={audioUrl} download={file}>
                Download
              </a>
            </Button>
          </div>
        )}
        <Button
          size="lg"
          onClick={onNext}
          className="h-14 rounded-full bg-gradient-primary px-10 text-lg font-semibold shadow-glow transition-all hover:-translate-y-1"
        >
          New topic →
        </Button>
        {save ? (
          <p className={cn("text-lg", save === "failed" ? "text-destructive" : "text-muted-foreground")}>{saveMessages[save]}</p>
        ) : (
          <p className="text-lg">
            <Link href="/signin" className="underline underline-offset-4">
              sign in
            </Link>{" "}
            to save your speeches and track your progress.
          </p>
        )}
      </div>
    </div>
  );
}

const confettiColors = ["bg-primary", "bg-coral", "bg-sunny", "bg-mint", "bg-violet", "bg-pink"];

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 70 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      size: 6 + Math.random() * 8,
      color: confettiColors[i % confettiColors.length],
    })),
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className={cn("absolute top-0 animate-confetti rounded-sm", p.color)}
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 1.6, animationDelay: `${p.delay}s` }}
        />
      ))}
    </div>
  );
}

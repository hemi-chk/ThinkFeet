"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MicCheck } from "@/components/mic-check";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { openMic, saveMicId, savedMicId } from "@/lib/mic";
import { useSession, type LevelChoice } from "@/lib/session";
import { cn } from "@/lib/utils";

const levels: { value: LevelChoice; label: string; emoji: string; className: string }[] = [
  { value: "beginner", label: "Beginner", emoji: "🌱", className: "bg-mint/20 border-mint" },
  { value: "intermediate", label: "Intermediate", emoji: "⚡", className: "bg-sunny/25 border-sunny" },
  { value: "pro", label: "Pro", emoji: "🔥", className: "bg-coral/20 border-coral" },
  { value: "unsure", label: "I'm not sure", emoji: "🤔", className: "bg-violet/20 border-violet" },
];

export function SetupForm() {
  const s = useSession();
  const router = useRouter();
  const { user } = useAuth();
  // The name input is uncontrolled so text typed before hydration isn't wiped when React takes over.
  const nameInput = useRef<HTMLInputElement>(null);
  const defaultName = s.name || user?.displayName || "";

  // Fill in the last-used or account name (auth resolves after first render), unless the user already typed.
  useEffect(() => {
    const el = nameInput.current;
    if (el && !el.value && defaultName) el.value = defaultName;
  }, [defaultName]);
  const [level, setLevel] = useState<LevelChoice>(s.level);
  const [prep, setPrep] = useState(s.prep);
  const [record, setRecord] = useState(s.record);
  const [micId, setMicId] = useState(() => s.micId || (typeof window === "undefined" ? "" : savedMicId()));
  const chooseMic = (id: string) => {
    setMicId(id);
    saveMicId(id);
  };
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    const finalName = (nameInput.current?.value ?? "").trim();
    if (!finalName) return setError("Please enter your name.");
    setError("");
    setBusy(true);
    try {
      // Ask for the mic up front so the practice screen can detect when the speaker starts.
      const stream = await openMic(micId || undefined);
      stream.getTracks().forEach((t) => t.stop());
      s.setSession({ name: finalName, level, prep, record, micId });
      router.push("/practice");
    } catch {
      setError(
        "ThinkFeet needs your microphone to detect when you start speaking. Please allow microphone access in your browser and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-fun-animated p-4 md:p-8">
      <main className="w-full max-w-4xl animate-fade-up space-y-10 rounded-[2rem] bg-card px-6 py-12 shadow-soft md:px-14">
        <div className="mx-auto max-w-xl space-y-3 text-center">
          <Label htmlFor="name" className="block font-display text-3xl font-semibold">
            Enter your name
          </Label>
          <Input
            id="name"
            ref={nameInput}
            defaultValue={defaultName}
            autoComplete="name"
            onKeyDown={(e) => e.key === "Enter" && start()}
            placeholder="ex: Hemindi Kalubovila"
            className="h-14 rounded-2xl border-2 bg-card text-center text-lg md:text-lg focus-visible:border-primary"
          />
        </div>

        <div className="space-y-4 text-center">
          <p className="font-display text-2xl font-semibold">Your speaking level</p>
          <div role="radiogroup" aria-label="Speaking level" className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {levels.map((o) => {
              const on = level === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setLevel(o.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-5 transition-all duration-200 hover:-translate-y-0.5",
                    o.className,
                    on ? "animate-bounce-in border-4 shadow-soft" : "border-transparent opacity-80",
                  )}
                >
                  <span className="text-4xl">{o.emoji}</span>
                  <span className="font-display text-lg font-semibold">{o.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-auto w-fit space-y-4">
          <Label className="flex cursor-pointer items-center gap-3 text-base">
            <Switch checked={prep} onCheckedChange={setPrep} className="data-checked:bg-mint" />
            I want the preparation time
          </Label>
          <Label className="flex cursor-pointer items-center gap-3 text-base">
            <Switch checked={record} onCheckedChange={setRecord} className="data-checked:bg-pink" />
            Recording (audio only)
          </Label>
          <Label className="flex flex-wrap items-center gap-3 text-base text-muted-foreground">
            <Switch disabled />
            Recording (audio + video)
            <Badge variant="secondary" className="rounded-full">
              Not available yet
            </Badge>
          </Label>
        </div>

        <div className="flex justify-center">
          <MicCheck deviceId={micId} onDeviceChange={chooseMic} />
        </div>

        {error && (
          <p role="alert" className="mx-auto max-w-xl rounded-2xl bg-danger-soft p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={start}
            disabled={busy}
            className="h-14 w-full max-w-sm rounded-full bg-gradient-primary text-lg font-semibold shadow-glow transition-all hover:-translate-y-1 hover:shadow-soft"
          >
            Start →
          </Button>
        </div>
      </main>
    </div>
  );
}

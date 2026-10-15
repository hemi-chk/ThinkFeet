import Link from "next/link";
import { AccountLink, ModeBadge } from "@/components/account-link";

const letterColors = ["text-primary", "text-coral", "text-sunny", "text-mint", "text-violet", "text-pink"];

const bubbles = [
  "left-[12%] top-[20%] bg-coral/60",
  "right-[15%] top-[15%] bg-violet/50 [animation-delay:-3s]",
  "left-[20%] bottom-[18%] bg-primary/40 [animation-delay:-6s]",
  "right-[22%] bottom-[25%] bg-sunny/70 [animation-delay:-9s]",
];

export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-fun-animated p-4">
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 animate-drift rounded-full bg-pink/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 animate-drift rounded-full bg-mint/40 blur-3xl [animation-delay:-4s]" />
      <div className="pointer-events-none absolute left-1/3 top-2/3 h-60 w-60 animate-drift rounded-full bg-sunny/40 blur-3xl [animation-delay:-8s]" />
      {bubbles.map((c) => (
        <div key={c} className={`pointer-events-none absolute h-10 w-14 animate-drift rounded-2xl rounded-bl-none ${c}`} />
      ))}

      <main className="relative z-10 flex animate-fade-up flex-col items-center text-center">
        <div className="gradient-border rounded-full px-10 py-6 shadow-soft md:px-16 md:py-8">
          <h1 className="font-display text-6xl font-bold md:text-8xl" aria-label="ThinkFeet">
            {"ThinkFeet".split("").map((ch, i) => (
              <span key={i} aria-hidden className={letterColors[i % letterColors.length]}>
                {ch}
              </span>
            ))}
          </h1>
        </div>
        <p className="mt-8 max-w-lg text-lg font-medium md:text-xl">
          A platform to sharpen your impromptu skills and go beyond.
        </p>
        <Link
          href="/setup"
          className="mt-10 inline-flex h-16 w-full max-w-sm items-center justify-center rounded-full bg-gradient-primary text-xl font-semibold text-primary-foreground shadow-glow transition-all duration-300 hover:-translate-y-1 hover:shadow-soft"
        >
          Get Started →
        </Link>
        <ModeBadge className="mt-5" />
        <div className="mt-10 flex gap-6 text-sm">
          <AccountLink />
          <span className="opacity-70">© ThinkFeet</span>
        </div>
      </main>
    </div>
  );
}

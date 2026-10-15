import Link from "next/link";
import type { ReactNode } from "react";

/** Shared playful shell for the sign-in screens. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fun-animated p-4 md:p-8">
      <main className="w-full max-w-md animate-fade-up space-y-8 rounded-[2rem] bg-card px-6 py-10 shadow-soft md:px-10">
        <div className="space-y-2 text-center">
          <Link href="/" className="font-display text-xl font-bold text-gradient">
            ThinkFeet
          </Link>
          <h1 className="font-display text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}

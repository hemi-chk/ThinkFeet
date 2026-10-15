/**
 * Table Topics timing rules: speak 1:00–2:00, with a 30s grace period after 2:00.
 * Green at 1:00, yellow at 1:30, red at 2:00; disqualified under 1:00 or over 2:30.
 */
export type Verdict = "under" | "short" | "perfect" | "grace" | "over";

export const VERDICTS: readonly Verdict[] = ["under", "short", "perfect", "grace", "over"];

export function verdictFor(ms: number): Verdict {
  const s = ms / 1000;
  if (s < 60) return "under";
  if (s < 90) return "short";
  if (s < 120) return "perfect";
  if (s < 150) return "grace";
  return "over";
}

import type { Metadata } from "next";
import { Practice } from "@/components/practice";

export const metadata: Metadata = {
  title: "Practice",
  description: "Speak on a random Table Topic with live timing lights.",
};

export default function PracticePage() {
  return <Practice />;
}

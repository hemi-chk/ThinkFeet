import type { Metadata } from "next";
import { Fredoka, Poppins } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/lib/auth";
import { SessionProvider } from "@/lib/session";
import { Toaster } from "@/components/ui/sonner";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: {
    default: "ThinkFeet — Practice impromptu speaking",
    template: "%s — ThinkFeet",
  },
  description: "Sharpen your Table Topics and impromptu speaking skills with timed practice.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("h-full antialiased font-sans", fredoka.variable, poppins.variable)}>
      <body className="min-h-full">
        <AuthProvider>
          <SessionProvider>
            {children}
            <Toaster theme="light" position="top-center" />
          </SessionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

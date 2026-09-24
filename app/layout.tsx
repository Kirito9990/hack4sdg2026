import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const emergencyNumber = process.env.NEXT_PUBLIC_EMERGENCY_NUMBER || "999";

export const metadata: Metadata = {
  title: "Porchline — neighbourhood mutual aid",
  description:
    "After a typhoon, send a voice note or photo. Nearby volunteers pick up the call. Life-threatening emergencies go to 999.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
            <Link href="/login" className="inline-flex min-h-12 items-center text-lg font-semibold tracking-tight">
              Porchline
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center rounded-full px-3 text-sm font-semibold underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-line bg-surface">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="max-w-xl leading-6">
              If someone is in immediate danger, call emergency services. Porchline is neighbour help after the storm.
            </p>
            <a
              href={`tel:${emergencyNumber}`}
              className="inline-flex min-h-12 items-center font-semibold text-danger underline"
            >
              Call {emergencyNumber}
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}

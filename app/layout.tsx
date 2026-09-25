import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./components/providers";
import Shell from "./components/shell";
import "./globals.css";
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "CareCall",
  description: "CareCall — 社區互助 · 社区互助 · Community assistance",
};
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={
        geistSans.variable + " " + geistMono.variable + " h-full antialiased"
      }
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}

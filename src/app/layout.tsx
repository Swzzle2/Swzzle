import type { Metadata } from "next";
import { Archivo, Archivo_Black, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const body = Archivo({ variable: "--nf-body", subsets: ["latin"] });
const display = Archivo_Black({ variable: "--nf-display", subsets: ["latin"], weight: "400" });
const mono = JetBrains_Mono({ variable: "--nf-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Swzzle", template: "%s | Swzzle" },
  description: "Industrial cleaning chemicals and consumer cleaners. Stirring up business as usual.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

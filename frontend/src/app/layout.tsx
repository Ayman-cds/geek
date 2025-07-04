import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from '../providers/QueryProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scale Geek - Eval Platform",
  description: "Minimalistic evaluation platform for AI models",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
              <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold text-black">Scale Geek</h1>
                <p className="text-sm text-gray-600 mt-1">Evaluation Platform</p>
              </div>
            </header>
            <main className="px-6 py-8">
              {children}
            </main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}

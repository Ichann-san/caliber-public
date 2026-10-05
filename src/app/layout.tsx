import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chandra Daya Investasi | Manufacturing Intelligence",
  description: "Manufacturing case management prototype",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" suppressHydrationWarning><body>
    <Script id="theme-initializer" strategy="beforeInteractive">{`try{var choice=localStorage.getItem("caliber-theme");document.documentElement.dataset.theme=choice==="dark"?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}`}</Script>
    {children}
  </body></html>;
}

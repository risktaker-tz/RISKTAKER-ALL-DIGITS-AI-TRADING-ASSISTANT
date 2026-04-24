import type { Metadata } from "next";

import "@/app/globals.css";
import { PwaProvider } from "@/components/pwa-provider";

export const metadata: Metadata = {
  title: "TUCHATI",
  description: "A multimedia social app with private TUCHATI messaging."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PwaProvider />
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";

import { PrivateBetaBanner } from "@/components/private-beta-banner";
import { assertProductionEnv } from "@/lib/env";

import "./globals.css";

assertProductionEnv();

export const metadata: Metadata = {
  title: "VentureForge Business Builder",
  description:
    "Build a clearer small-business idea, plan safer next steps, and prepare a launch roadmap.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PrivateBetaBanner />
        {children}
      </body>
    </html>
  );
}

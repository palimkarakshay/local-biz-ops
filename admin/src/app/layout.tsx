import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ops Console — local-biz-ops",
  description: "Lead intake, CRM, follow-up, review requests, and invoicing for a local business.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            {siteConfig.business.name} · Ops
          </Link>
          <nav>
            <Link href="/intake">Intake demo</Link>
            <Link href="/admin">CRM</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}

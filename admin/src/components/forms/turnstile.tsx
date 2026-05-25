"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: { sitekey: string; callback: (token: string) => void; theme?: string },
      ) => string;
      reset: (id: string) => void;
    };
  }
}

/**
 * Cloudflare Turnstile (no-CAPTCHA bot check) — identical to the marketing-site
 * kit's component. Free, no credit card. In dev (no site key) it no-ops and
 * emits a fake token so forms still submit.
 */
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) {
      onToken("dev-no-turnstile");
      return;
    }
    if (!ref.current) return;

    const tryRender = () => {
      if (window.turnstile && ref.current && widgetIdRef.current === null) {
        widgetIdRef.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          callback: onToken,
          theme: "light",
        });
        return true;
      }
      return false;
    };

    if (tryRender()) return;

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => tryRender();
    document.head.appendChild(script);
  }, [siteKey, onToken]);

  if (!siteKey) {
    return (
      <p className="small muted">
        Bot protection: not configured for development (set{" "}
        <code>NEXT_PUBLIC_TURNSTILE_SITE_KEY</code> to enable).
      </p>
    );
  }

  return <div ref={ref} style={{ margin: "0.75rem 0" }} />;
}

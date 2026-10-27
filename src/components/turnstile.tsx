"use client";
import { useEffect, useRef } from "react";
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}
export function Turnstile({
  onToken,
  nonce,
}: {
  onToken: (token: string) => void;
  nonce: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);
  useEffect(() => {
    let id: string | undefined;
    let stopped = false;
    const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!key) return;
    let script = document.querySelector<HTMLScriptElement>(
      "script[data-turnstile]",
    );
    if (!script) {
      script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.dataset.turnstile = "true";
      document.head.appendChild(script);
    }
    const timer = setInterval(() => {
      if (!stopped && window.turnstile && ref.current && id === undefined) {
        id = window.turnstile.render(ref.current, {
          sitekey: key,
          callback: (token: string) => callback.current(token),
          "expired-callback": () => callback.current(""),
          "error-callback": () => callback.current(""),
        });
        clearInterval(timer);
      }
    }, 200);
    return () => {
      stopped = true;
      clearInterval(timer);
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [nonce]);
  return <div ref={ref} className="turnstile" />;
}

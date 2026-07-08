"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

// Google reCAPTCHA v2 checkbox. Renders nothing when the site key env var is
// unset, so local dev and tests work without keys. The matching secret lives
// in the backend env (RECAPTCHA_SECRET_KEY); the keys are created with domain
// verification disabled so the same pair covers apex, tenant subdomains, and
// tenant custom domains.
const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

interface Grecaptcha {
  render: (container: HTMLElement, params: Record<string, unknown>) => number;
  reset: (widgetId: number) => void;
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
    onRecaptchaApiLoad?: () => void;
  }
}

let loadPromise: Promise<Grecaptcha> | null = null;

function loadRecaptcha(): Promise<Grecaptcha> {
  if (window.grecaptcha?.render) return Promise.resolve(window.grecaptcha);
  if (!loadPromise) {
    loadPromise = new Promise((resolve) => {
      window.onRecaptchaApiLoad = () => resolve(window.grecaptcha!);
      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaApiLoad&render=explicit";
      script.async = true;
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}

export function isRecaptchaEnabled(): boolean {
  return Boolean(SITE_KEY);
}

interface Props {
  // Called with the token on solve, and with "" on expiry or reset.
  onToken: (token: string) => void;
  // Increment to reset the widget (e.g. after a failed submit, since a
  // v2 token is single-use).
  resetSignal?: number;
}

export function RecaptchaCheckbox({ onToken, resetSignal = 0 }: Props) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  // The widget's theme is fixed at render time, so the container div is
  // keyed by theme below - a theme switch mounts a fresh node and this
  // effect renders a new widget into it (dropping any solved token).
  useEffect(() => {
    if (!SITE_KEY || !resolvedTheme) return;
    let cancelled = false;
    widgetIdRef.current = null;
    onTokenRef.current("");
    loadRecaptcha().then((grecaptcha) => {
      if (cancelled || !containerRef.current || widgetIdRef.current !== null) return;
      widgetIdRef.current = grecaptcha.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: resolvedTheme === "dark" ? "dark" : "light",
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [resolvedTheme]);

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current !== null) {
      window.grecaptcha?.reset(widgetIdRef.current);
      onTokenRef.current("");
    }
  }, [resetSignal]);

  if (!SITE_KEY) return null;
  return <div key={resolvedTheme} ref={containerRef} />;
}

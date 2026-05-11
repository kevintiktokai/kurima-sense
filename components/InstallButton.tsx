"use client";

import { useEffect, useState } from "react";

import { requestInstallPrompt } from "@/components/InstallPrompt";

/**
 * Visible "Install app" button. Uses an inline SVG (not Material
 * Symbols) so it survives any icon-font load failure — which matters
 * on iPad Safari, where this button is the only install path the user
 * has (Safari never fires beforeinstallprompt).
 *
 * Self-hides when the app is already running in standalone mode.
 */
export default function InstallButton({ className = "" }: { className?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    setShow(true);
    const onInstalled = () => setShow(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={requestInstallPrompt}
      aria-label="Install KurimaSense as an app"
      title="Install app"
      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 active:shadow-[var(--shadow-neu-inset)] ${className}`.trim()}
      style={{
        backgroundColor: "var(--ee-bg)",
        boxShadow: "var(--shadow-neu)",
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "var(--ee-text)" }}
        aria-hidden
      >
        <path d="M12 3 V15" />
        <path d="M7 10 L12 15 L17 10" />
        <path d="M5 19 H19" />
      </svg>
    </button>
  );
}

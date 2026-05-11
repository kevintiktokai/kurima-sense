"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  SESSION_KEY_VISIT_COUNTED,
  STORAGE_KEYS,
  shouldShowInstallPrompt,
} from "@/lib/install-prompt-policy";

/**
 * The `beforeinstallprompt` event isn't in the standard DOM lib yet.
 * https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

const REQUEST_OPEN_EVENT = "kurimasense:request-install";
const ENGAGEMENT_EVENT = "kurimasense:engagement";

/**
 * Fire this when the user does something genuinely engaging — logs an
 * activity, adds a field, finishes onboarding. Increments the persistent
 * engagement score so the install prompt eventually surfaces.
 */
export function trackInstallEngagement() {
  if (typeof window === "undefined") return;
  try {
    const current = Number.parseInt(
      localStorage.getItem(STORAGE_KEYS.engagementScore) ?? "0",
      10,
    );
    const next = Number.isFinite(current) ? current + 1 : 1;
    localStorage.setItem(STORAGE_KEYS.engagementScore, String(next));
    window.dispatchEvent(new CustomEvent(ENGAGEMENT_EVENT));
  } catch {
    // localStorage may be unavailable (private mode, quota) — silent no-op.
  }
}

/**
 * Force-open the install prompt regardless of policy. Wire this to an
 * "Install App" button in settings or the navigation menu.
 */
export function requestInstallPrompt() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REQUEST_OPEN_EVENT));
}

function readNumber(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return 0;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function readTimestamp(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function detectIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  // Excludes iPadOS 13+ which reports as Mac; we additionally check touch.
  const isClassicIos = /iPad|iPhone|iPod/.test(ua);
  const isModernIpad = ua.includes("Macintosh") && navigator.maxTouchPoints > 1;
  return isClassicIos || isModernIpad;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS-specific: `navigator.standalone` is the Safari signal.
  const navStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return navStandalone === true;
}

function trackAnalytics(event: "shown" | "dismissed" | "accepted" | "ios-shown") {
  if (typeof window === "undefined") return;
  type PlausibleFn = (event: string, opts?: { props?: Record<string, string> }) => void;
  type PosthogClient = { capture: (event: string, props?: Record<string, string>) => void };
  const w = window as typeof window & { plausible?: PlausibleFn; posthog?: PosthogClient };
  const eventName = `install-prompt:${event}`;
  if (typeof w.plausible === "function") {
    w.plausible(eventName);
  } else if (w.posthog && typeof w.posthog.capture === "function") {
    w.posthog.capture(eventName);
  } else {
    // eslint-disable-next-line no-console
    console.info(`[analytics] ${eventName}`);
  }
}

export default function InstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const [forced, setForced] = useState(false);

  // Mount + visit counting + display-mode detection
  useEffect(() => {
    setMounted(true);

    if (detectStandalone()) {
      setIsStandalone(true);
      try {
        localStorage.setItem(STORAGE_KEYS.installed, "true");
      } catch {
        // ignore
      }
      return;
    }

    // Once per browser session, bump the visit counter.
    try {
      if (!sessionStorage.getItem(SESSION_KEY_VISIT_COUNTED)) {
        const next = readNumber(STORAGE_KEYS.visitCount) + 1;
        localStorage.setItem(STORAGE_KEYS.visitCount, String(next));
        sessionStorage.setItem(SESSION_KEY_VISIT_COUNTED, "1");
      }
    } catch {
      // ignore
    }

    setIsIos(detectIos());
  }, []);

  // beforeinstallprompt — Android / desktop Chrome / Edge
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      try {
        localStorage.setItem(STORAGE_KEYS.installed, "true");
      } catch {
        // ignore
      }
      setIsStandalone(true);
      setOpen(false);
      setIosOpen(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  // Auto-show based on policy
  const evaluate = useCallback(() => {
    if (!mounted || isStandalone) return;
    const allowed = shouldShowInstallPrompt({
      isStandalone,
      hasInstalledFlag: (() => {
        try {
          return localStorage.getItem(STORAGE_KEYS.installed) === "true";
        } catch {
          return false;
        }
      })(),
      visitCount: readNumber(STORAGE_KEYS.visitCount),
      engagementScore: readNumber(STORAGE_KEYS.engagementScore),
      dismissedAt: readTimestamp(STORAGE_KEYS.dismissedAt),
      now: Date.now(),
    });
    if (!allowed) return;
    if (isIos) {
      setIosOpen(true);
      trackAnalytics("ios-shown");
    } else {
      setOpen(true);
      trackAnalytics("shown");
    }
  }, [mounted, isStandalone, isIos]);

  useEffect(() => {
    if (!mounted) return;
    const t = setTimeout(evaluate, 600);
    return () => clearTimeout(t);
  }, [mounted, evaluate]);

  useEffect(() => {
    if (!mounted) return;
    const onEngagement = () => evaluate();
    window.addEventListener(ENGAGEMENT_EVENT, onEngagement);
    return () => window.removeEventListener(ENGAGEMENT_EVENT, onEngagement);
  }, [mounted, evaluate]);

  // Explicit force-open from "Install App" menu item
  useEffect(() => {
    if (!mounted) return;
    const onRequest = () => {
      setForced(true);
      if (isStandalone) return;
      if (isIos) {
        setIosOpen(true);
        trackAnalytics("ios-shown");
      } else {
        setOpen(true);
        trackAnalytics("shown");
      }
    };
    window.addEventListener(REQUEST_OPEN_EVENT, onRequest);
    return () => window.removeEventListener(REQUEST_OPEN_EVENT, onRequest);
  }, [mounted, isStandalone, isIos]);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.dismissedAt, String(Date.now()));
    } catch {
      // ignore
    }
    setOpen(false);
    setIosOpen(false);
    setForced(false);
    trackAnalytics("dismissed");
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPromptEvent) return;
    try {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice.outcome === "accepted") {
        try {
          localStorage.setItem(STORAGE_KEYS.installed, "true");
        } catch {
          // ignore
        }
        trackAnalytics("accepted");
      } else {
        // Treat "no thanks" in the native chooser as a dismiss too.
        try {
          localStorage.setItem(STORAGE_KEYS.dismissedAt, String(Date.now()));
        } catch {
          // ignore
        }
        trackAnalytics("dismissed");
      }
    } finally {
      setInstallPromptEvent(null);
      setOpen(false);
    }
  }, [installPromptEvent]);

  if (!mounted || isStandalone) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => (next ? setOpen(true) : handleDismiss())}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-3xl border-0 p-0"
          style={{ backgroundColor: "var(--ee-bg)", color: "var(--ee-text)" }}
        >
          <SheetHeader className="px-6 pt-6 text-left">
            <div className="mb-3 flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-2xl">
                <Image
                  src="/icons/icon-192x192.png"
                  alt="KurimaSense"
                  width={48}
                  height={48}
                />
              </div>
              <div>
                <SheetTitle
                  className="text-xl"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--ee-text)" }}
                >
                  Install KurimaSense
                </SheetTitle>
                <SheetDescription style={{ color: "var(--ee-muted)" }}>
                  Faster access and offline support
                </SheetDescription>
              </div>
            </div>
            <p className="text-sm" style={{ color: "var(--ee-muted)" }}>
              Get a home-screen icon, work without signal, and sync your activity automatically
              when you&apos;re back online.
            </p>
          </SheetHeader>
          <SheetFooter className="flex-row gap-3 px-6 pb-8 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDismiss}
            >
              Not now
            </Button>
            <Button
              className="flex-1"
              onClick={handleInstall}
              disabled={!installPromptEvent && !forced}
            >
              {installPromptEvent ? "Install" : "Waiting for browser…"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={iosOpen} onOpenChange={(next) => (next ? setIosOpen(true) : handleDismiss())}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-3xl border-0 p-0"
          style={{ backgroundColor: "var(--ee-bg)", color: "var(--ee-text)" }}
        >
          <SheetHeader className="px-6 pt-6 text-left">
            <SheetTitle
              className="text-xl"
              style={{ fontFamily: "var(--font-heading)", color: "var(--ee-text)" }}
            >
              Add KurimaSense to your Home Screen
            </SheetTitle>
            <SheetDescription style={{ color: "var(--ee-muted)" }}>
              Three quick steps in Safari
            </SheetDescription>
          </SheetHeader>
          <ol className="space-y-4 px-6 pb-2 pt-4 text-sm">
            <li className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "var(--ee-primary)" }}
              >
                1
              </span>
              <div className="flex-1">
                <p>
                  Tap the <strong>Share</strong> button at the bottom of Safari (the square with an
                  arrow pointing up).
                </p>
                <Image
                  src="/install-guide/share-icon.svg"
                  alt="Safari Share button"
                  width={56}
                  height={56}
                  className="mt-2"
                  unoptimized
                />
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "var(--ee-primary)" }}
              >
                2
              </span>
              <div className="flex-1">
                <p>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </p>
                <Image
                  src="/install-guide/add-to-home.svg"
                  alt="Add to Home Screen menu item"
                  width={56}
                  height={56}
                  className="mt-2"
                  unoptimized
                />
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "var(--ee-primary)" }}
              >
                3
              </span>
              <p>
                Tap <strong>Add</strong> in the top right corner.
              </p>
            </li>
          </ol>
          <SheetFooter className="px-6 pb-8 pt-4">
            <Button variant="outline" className="w-full" onClick={handleDismiss}>
              Got it
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

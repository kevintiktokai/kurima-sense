"use client";

import { useEffect, useState } from "react";
import { resilientFetch } from '@/lib/http'

type SwState = {
  registered: boolean;
  scope: string | null;
  scriptURL: string | null;
  state: ServiceWorkerState | null;
  controllerActive: boolean;
};

type CacheSnapshot = { name: string; entries: number };

type ManifestData = Record<string, unknown> | { error: string } | null;

function useSwState() {
  const [sw, setSw] = useState<SwState>({
    registered: false,
    scope: null,
    scriptURL: null,
    state: null,
    controllerActive: false,
  });

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    (async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const worker = reg?.active ?? reg?.installing ?? reg?.waiting ?? null;
      if (cancelled) return;
      setSw({
        registered: Boolean(reg),
        scope: reg?.scope ?? null,
        scriptURL: worker?.scriptURL ?? null,
        state: worker?.state ?? null,
        controllerActive: Boolean(navigator.serviceWorker.controller),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return sw;
}

function useCaches() {
  const [caches, setCaches] = useState<CacheSnapshot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("caches" in window)) {
      setError("Cache Storage API not available");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const names = await window.caches.keys();
        const snapshots = await Promise.all(
          names.map(async (name) => {
            const c = await window.caches.open(name);
            const keys = await c.keys();
            return { name, entries: keys.length };
          }),
        );
        if (!cancelled) setCaches(snapshots.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { caches, error };
}

function useStandalone() {
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    const mm = window.matchMedia("(display-mode: standalone)").matches;
    const nav = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setStandalone(mm || nav);
  }, []);
  return standalone;
}

function useInstallEvent() {
  const [captured, setCaptured] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setCaptured(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  return captured;
}

function useManifest() {
  const [manifest, setManifest] = useState<ManifestData>(null);

  useEffect(() => {
    let cancelled = false;
    resilientFetch("/manifest.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (!cancelled) setManifest(data);
      })
      .catch((err) => {
        if (!cancelled) setManifest({ error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return manifest;
}

function Row({ label, value }: { label: string; value: string | number | boolean | null }) {
  let display: string;
  if (value === null || value === undefined) display = "—";
  else if (typeof value === "boolean") display = value ? "yes" : "no";
  else display = String(value);

  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0" style={{ borderColor: "var(--ee-bg-border)" }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: "var(--ee-muted)" }}>
        {label}
      </span>
      <span className="font-mono text-sm break-all text-right">{display}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="neu-surface p-5">
      <h2
        className="mb-3 text-sm font-semibold uppercase tracking-wider"
        style={{ color: "var(--ee-muted)" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function PwaStatusClient() {
  const sw = useSwState();
  const { caches: cacheSnapshot, error: cacheError } = useCaches();
  const standalone = useStandalone();
  const promptCaptured = useInstallEvent();
  const manifest = useManifest();
  const [userAgent, setUserAgent] = useState<string>("");

  useEffect(() => {
    setUserAgent(navigator.userAgent);
  }, []);

  return (
    <main
      className="min-h-screen px-5 py-10"
      style={{ backgroundColor: "var(--ee-bg)", color: "var(--ee-text)" }}
    >
      <div className="mx-auto max-w-2xl space-y-5">
        <header>
          <h1
            className="text-3xl font-semibold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            PWA Status
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ee-muted)" }}>
            Diagnostic view — only available in development builds. Useful when a
            farmer reports &quot;the app is stuck on the old version&quot; or
            offline mode isn&apos;t working.
          </p>
        </header>

        <Section title="Service worker">
          <Row label="Registered" value={sw.registered} />
          <Row label="Active controller" value={sw.controllerActive} />
          <Row label="State" value={sw.state} />
          <Row label="Script URL" value={sw.scriptURL} />
          <Row label="Scope" value={sw.scope} />
        </Section>

        <Section title="Cache storage">
          {cacheError && (
            <p className="text-sm" style={{ color: "#c44" }}>
              {cacheError}
            </p>
          )}
          {!cacheError && cacheSnapshot === null && (
            <p className="text-sm" style={{ color: "var(--ee-muted)" }}>
              loading…
            </p>
          )}
          {!cacheError && cacheSnapshot?.length === 0 && (
            <p className="text-sm" style={{ color: "var(--ee-muted)" }}>
              no caches yet — visit a few pages first
            </p>
          )}
          {!cacheError &&
            cacheSnapshot?.map((c) => <Row key={c.name} label={c.name} value={c.entries} />)}
        </Section>

        <Section title="Install state">
          <Row label="Standalone display-mode" value={standalone} />
          <Row label="beforeinstallprompt captured" value={promptCaptured} />
        </Section>

        <Section title="Environment">
          <Row label="User agent" value={userAgent} />
        </Section>

        <Section title="Manifest">
          <pre
            className="overflow-x-auto rounded-2xl p-4 text-xs"
            style={{ backgroundColor: "var(--ee-bg-dim)" }}
          >
            {manifest === null ? "loading…" : JSON.stringify(manifest, null, 2)}
          </pre>
        </Section>
      </div>
    </main>
  );
}

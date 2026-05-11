"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const QUICK_LINKS = [
  { href: "/dashboard/fields", label: "My Fields", description: "Last loaded fields & boundaries" },
  { href: "/dashboard/plan",   label: "Recent Logs", description: "Activities you've already logged" },
  { href: "/dashboard",        label: "Field Activities", description: "Today's plan and reminders" },
];

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Best-effort peek at the BackgroundSync queue so the user knows their
  // offline edits are safely queued. The IndexedDB store is created by
  // workbox-background-sync under the name "workbox-background-sync".
  useEffect(() => {
    let cancelled = false;
    const req = indexedDB.open("workbox-background-sync");
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("requests")) {
        if (!cancelled) setPendingSync(0);
        db.close();
        return;
      }
      const tx = db.transaction("requests", "readonly");
      const store = tx.objectStore("requests");
      const count = store.count();
      count.onsuccess = () => {
        if (!cancelled) setPendingSync(count.result);
        db.close();
      };
    };
    req.onerror = () => {
      if (!cancelled) setPendingSync(0);
    };
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main
      className="min-h-screen flex items-center justify-center px-5 py-12"
      style={{ backgroundColor: "var(--ee-bg)", color: "var(--ee-text)" }}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="neu-surface p-8 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--ee-water-light)", color: "var(--ee-water)" }}
            aria-hidden
          >
            <span className="material-symbols-outlined" style={{ fontSize: 32 }}>
              cloud_off
            </span>
          </div>
          <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            You&apos;re offline, but your data is safe
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--ee-muted)" }}>
            Anything you log right now will sync automatically the moment you&apos;re back online.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: isOnline ? "var(--ee-primary)" : "var(--ee-sun)" }}
            />
            <span>{isOnline ? "Connection restored" : "Waiting for connection…"}</span>
          </div>

          {pendingSync !== null && pendingSync > 0 && (
            <p className="mt-2 text-xs" style={{ color: "var(--ee-muted)" }}>
              {pendingSync} change{pendingSync === 1 ? "" : "s"} queued for sync
            </p>
          )}

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center justify-center rounded-full px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--ee-primary)" }}
          >
            Retry
          </button>
        </div>

        <div className="neu-surface p-6">
          <h2
            className="mb-3 text-xs uppercase tracking-wider"
            style={{ color: "var(--ee-muted)" }}
          >
            Quick access
          </h2>
          <ul className="space-y-2">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center justify-between rounded-2xl px-4 py-3 transition-colors hover:bg-[var(--ee-bg-dim)]"
                >
                  <div>
                    <div className="font-medium">{link.label}</div>
                    <div className="text-xs" style={{ color: "var(--ee-muted)" }}>
                      {link.description}
                    </div>
                  </div>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 20, color: "var(--ee-muted)" }}
                    aria-hidden
                  >
                    chevron_right
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

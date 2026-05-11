import { notFound } from "next/navigation";

import PwaStatusClient from "./PwaStatusClient";

/**
 * Diagnostic page for debugging PWA install / SW / cache state.
 *
 * Gated to NODE_ENV !== "production" so it can't be reached on the
 * live site. Calling `notFound()` here makes Next render the standard
 * 404 in production builds and prevents the route from being included
 * in the prerender manifest.
 */
export default function PwaStatusPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <PwaStatusClient />;
}

export const dynamic = "force-dynamic";

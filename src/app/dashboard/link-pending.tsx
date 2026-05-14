"use client";

import { useLinkStatus } from "next/link";

/**
 * Render inside a <Link> child. Shows a spinner while the navigation is in flight.
 * Next 16's useLinkStatus exposes the pending state of the surrounding Link.
 */
export default function LinkPending({ light = false }: { light?: boolean }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      className={`ml-auto inline-block w-3 h-3 rounded-full animate-spin border-2 ${
        light
          ? "border-white/25 border-t-white"
          : "border-[var(--border-strong)] border-t-[var(--violet)]"
      }`}
      aria-label="Loading"
    />
  );
}

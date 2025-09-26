import "@testing-library/jest-dom";
import React from "react";
import { vi } from "vitest";

// Provide React in global scope for components compiled with classic runtime
// (Some feature files omit explicit import; Next/SWC would auto-inject but Vitest needs this shim)
(globalThis as Record<string, unknown>).React = React;

// Basic mock for next/image to avoid SSR/layout warnings in jsdom
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) =>
    React.createElement("img", { ...props }),
}));

// Global fetch mock for relative API calls used in hooks (e.g., video thumbnails)
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    const url = typeof input === "string" ? input : input.toString();
    if (/\/api\/charters\/.+\/thumbnails$/.test(url)) {
      return new Response(JSON.stringify({ thumbnails: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch {
    // fall through to original
  }
  return originalFetch
    ? originalFetch(input as RequestInfo | URL, init)
    : Promise.resolve(
        new Response("Not Implemented", { status: 501 }) as unknown as Response
      );
}) as typeof fetch;

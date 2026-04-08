import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

// Custom caching: serve cached pages when offline
const runtimeCaching: RuntimeCaching[] = [
  // HTML navigation — network first, fall back to cache
  {
    matcher: ({ request }) => request.mode === "navigate",
    handler: new NetworkFirst({
      cacheName: "pages-cache",
      matchOptions: { ignoreVary: true },
      networkTimeoutSeconds: 5,
    }),
  },
  // Supabase API calls — network first, fall back to cache
  {
    matcher: ({ url }) => url.hostname.includes("supabase"),
    handler: new NetworkFirst({
      cacheName: "supabase-cache",
      networkTimeoutSeconds: 5,
    }),
  },
  // Fonts — cache first (they rarely change)
  {
    matcher: ({ request }) => request.destination === "font",
    handler: new CacheFirst({
      cacheName: "font-cache",
    }),
  },
  // Images — stale while revalidate
  {
    matcher: ({ request }) => request.destination === "image",
    handler: new StaleWhileRevalidate({
      cacheName: "image-cache",
    }),
  },
  // Everything else — use default strategies
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();

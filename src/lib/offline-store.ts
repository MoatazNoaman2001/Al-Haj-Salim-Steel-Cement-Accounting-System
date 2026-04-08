"use client";

import { get, set } from "idb-keyval";

const PREFIX = "store:";

export async function getLocal<T>(key: string): Promise<T | null> {
  try {
    return (await get<T>(PREFIX + key)) ?? null;
  } catch {
    return null;
  }
}

export async function setLocal<T>(key: string, data: T): Promise<void> {
  try {
    await set(PREFIX + key, data);
  } catch {
    // IndexedDB full or unavailable
  }
}

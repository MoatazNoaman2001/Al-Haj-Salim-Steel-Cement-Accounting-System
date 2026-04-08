import { get, set } from "idb-keyval";
import { createClient } from "@/lib/supabase/client";

const QUEUE_KEY = "al-haj-salim-offline-queue";

export interface OfflineMutation {
  id: string;
  table: string;
  type: "insert" | "update" | "delete";
  data: Record<string, unknown>;
  match?: Record<string, unknown>; // for update/delete
  timestamp: number;
}

/** Add a mutation to the offline queue */
export async function queueMutation(mutation: Omit<OfflineMutation, "id" | "timestamp">) {
  const queue = await getQueue();
  queue.push({
    ...mutation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  await set(QUEUE_KEY, queue);
}

/** Get all pending offline mutations */
export async function getQueue(): Promise<OfflineMutation[]> {
  return (await get<OfflineMutation[]>(QUEUE_KEY)) ?? [];
}

/** Clear the offline queue */
export async function clearQueue() {
  await set(QUEUE_KEY, []);
}

/** Process all queued mutations — call when back online */
export async function syncOfflineQueue(): Promise<{ success: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  const supabase = createClient();
  let success = 0;
  let failed = 0;
  const remaining: OfflineMutation[] = [];

  for (const mutation of queue) {
    let error: unknown = null;

    try {
      if (mutation.type === "insert") {
        const result = await supabase.from(mutation.table).insert(mutation.data);
        error = result.error;
      } else if (mutation.type === "update" && mutation.match) {
        let query = supabase.from(mutation.table).update(mutation.data);
        for (const [key, value] of Object.entries(mutation.match)) {
          query = query.eq(key, value as string);
        }
        const result = await query;
        error = result.error;
      } else if (mutation.type === "delete" && mutation.match) {
        let query = supabase.from(mutation.table).delete();
        for (const [key, value] of Object.entries(mutation.match)) {
          query = query.eq(key, value as string);
        }
        const result = await query;
        error = result.error;
      }
    } catch (e) {
      error = e;
    }

    if (error) {
      failed++;
      remaining.push(mutation); // keep failed mutations for retry
    } else {
      success++;
    }
  }

  await set(QUEUE_KEY, remaining);
  return { success, failed };
}

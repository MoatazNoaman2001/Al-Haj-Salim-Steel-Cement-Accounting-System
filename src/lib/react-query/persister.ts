import { get, set, del } from "idb-keyval";
import { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

const IDB_KEY = "al-haj-salim-query-cache";

/**
 * IndexedDB persister for React Query.
 * Stores the full query cache so data survives page reloads and offline sessions.
 */
export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(IDB_KEY, client);
    },
    restoreClient: async () => {
      return await get<PersistedClient>(IDB_KEY);
    },
    removeClient: async () => {
      await del(IDB_KEY);
    },
  };
}

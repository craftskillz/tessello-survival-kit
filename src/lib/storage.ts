// The kit in the Host storage (CONVENTION.md §6.1), shared by the View and the Widget: each list under its own key,
// `tasks`, `notes` and `links`, so that a change writes only the list it touches. What an older version or an import
// wrote is read defensively (kit.ts), and a failed write comes back as a message for the User.

import type { Json, Storage } from "@tessello/sdk";
import { t } from "./i18n.ts";
import { type Kit, readCategories, readNotes, readTasks } from "./kit.ts";

export type KitList = keyof Kit;

/** The storage key of each list: the categories of myLinks keep the key of the original Survival Kit, "links". */
const KEYS: Record<KitList, string> = { tasks: "tasks", notes: "notes", categories: "links" };

const READERS: { [List in KitList]: (value: unknown) => Kit[List] } = { tasks: readTasks, notes: readNotes, categories: readCategories };

export interface KitStorage {
  /** Reads these lists of the kit; a list never written is empty. Throws when the Host cannot read them. */
  read<List extends KitList>(...lists: List[]): Promise<Pick<Kit, List>>;
  /** Writes these lists of the kit, one after the other. Throws an `Error` whose message tells the User what happened. */
  write(lists: Partial<Kit>): Promise<void>;
}

export function kitStorage(storage: Storage): KitStorage {
  return {
    async read(...lists) {
      const values = await Promise.all(lists.map((list) => storage.get(KEYS[list])));
      return Object.fromEntries(lists.map((list, index) => [list, READERS[list](values[index])])) as Pick<Kit, (typeof lists)[number]>;
    },
    async write(lists) {
      try {
        for (const [list, value] of Object.entries(lists)) await storage.set(KEYS[list as KitList], value as unknown as Json[]);
      } catch (error) {
        throw new Error(saveErrorMessage(error), { cause: error });
      }
    },
  };
}

/** What a failed request says, for a message: its own message, or the value thrown. */
export const reasonOf = (error: unknown) => (error instanceof Error && error.message ? error.message : String(error));

function saveErrorMessage(error: unknown): string {
  if ((error as { code?: unknown }).code === "quota_exceeded") return t("save_error_quota");
  return t("save_error", { reason: reasonOf(error) });
}

// The kit of the View, as Svelte state shared by its panels, kept in the Host storage (lib/storage.ts).
// Each change is written at once, since the Host may unload the View without warning (CONVENTION.md §4).
// A kit that could not be read cannot be changed, so that an empty kit on screen never overwrites the stored one.

import type { ConnectedModule } from "@tessello/sdk";
import { t } from "./i18n.ts";
import { FILTERS, type Filter, type Kit } from "./kit.ts";
import { type KitList, type KitStorage, kitStorage, reasonOf } from "./storage.ts";

export const kit = $state<Kit>({ tasks: [], notes: [], categories: [] });

export const status = $state({
  /** False until the kit is read, and again while it cannot be read. */
  loaded: false,
  loadError: "",
  saveError: "",
});

/** What the View shows, shared by its panels: the filter of myTasks can be set by the Widget. */
export const ui = $state({ filter: "all" as Filter });

let storage: KitStorage;

export function connectStore(host: ConnectedModule): void {
  storage = kitStorage(host.storage);
}

/** Reads the whole kit; on failure, editing stays blocked until it is read. */
export async function load(): Promise<void> {
  try {
    Object.assign(kit, await storage.read("tasks", "notes", "categories"));
    status.loadError = "";
    status.loaded = true;
  } catch (error) {
    status.loaded = false;
    status.loadError = t("load_error", { reason: reasonOf(error) });
  }
}

/** Writes these lists of the kit now. A failure is shown to the User; the change stays on screen. */
export async function save(...lists: KitList[]): Promise<void> {
  if (!status.loaded) return;
  try {
    await storage.write(Object.fromEntries(lists.map((list) => [list, $state.snapshot(kit[list])])));
    status.saveError = "";
  } catch (error) {
    status.saveError = (error as Error).message;
  }
}

/** Replaces the whole kit, as an import does. */
export async function replaceKit(next: Kit): Promise<void> {
  Object.assign(kit, next);
  await save("tasks", "notes", "categories");
}

/** Applies the params the View was opened with: `filter` sets the filter of myTasks. */
export function applyParams(params: Record<string, string> = {}): void {
  if (FILTERS.includes(params.filter as Filter)) ui.filter = params.filter as Filter;
}

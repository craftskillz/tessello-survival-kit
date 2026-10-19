// The kit of the View, kept in the Host storage (CONVENTION.md §6.1) under three keys: `tasks`, `notes` and `links`.
// Each change is written at once, since the Host may unload the View without warning (CONVENTION.md §4).
// A kit that could not be read cannot be changed, so that an empty kit on screen never overwrites the stored one.

import type { ConnectedModule, Json } from "@tessello/sdk";
import { t } from "./i18n.ts";
import { type Kit, readLinks, readNotes, readTasks } from "./kit.ts";

export type Filter = "all" | "todo" | "done" | "urgent" | "normal" | "later";

export const FILTERS: readonly Filter[] = ["all", "todo", "done", "urgent", "normal", "later"];

export const kit = $state<Kit>({ tasks: [], notes: [], links: [] });

export const status = $state({
  /** False until the kit is read, and again while it cannot be read. */
  loaded: false,
  loadError: "",
  saveError: "",
});

/** What the View shows, shared by its panels: the filter of myTasks can be set by the Widget. */
export const ui = $state({ filter: "all" as Filter });

let host: ConnectedModule;

export function connectStore(connected: ConnectedModule): void {
  host = connected;
}

const reasonOf = (error: unknown) => (error instanceof Error && error.message ? error.message : String(error));

/** Reads the whole kit; on failure, editing stays blocked until it is read. */
export async function load(): Promise<void> {
  try {
    const [tasks, notes, links] = await Promise.all([host.storage.get("tasks"), host.storage.get("notes"), host.storage.get("links")]);
    kit.tasks = readTasks(tasks);
    kit.notes = readNotes(notes);
    kit.links = readLinks(links);
    status.loadError = "";
    status.loaded = true;
  } catch (error) {
    status.loaded = false;
    status.loadError = t("load_error", { reason: reasonOf(error) });
  }
}

/** Writes these lists of the kit now. A failure is shown to the User; the change stays on screen. */
export async function save(...keys: (keyof Kit)[]): Promise<void> {
  if (!status.loaded) return;
  try {
    for (const key of keys) await host.storage.set(key, $state.snapshot(kit[key]) as unknown as Json[]);
    status.saveError = "";
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    status.saveError = code === "quota_exceeded" ? t("save_error_quota") : t("save_error", { reason: reasonOf(error) });
  }
}

/** Replaces the whole kit, as an import does. */
export async function replaceKit(next: Kit): Promise<void> {
  kit.tasks = next.tasks;
  kit.notes = next.notes;
  kit.links = next.links;
  await save("tasks", "notes", "links");
}

/** Applies the params the View was opened with: `filter` sets the filter of myTasks. */
export function applyParams(params: Record<string, string> = {}): void {
  if (FILTERS.includes(params.filter as Filter)) ui.filter = params.filter as Filter;
}

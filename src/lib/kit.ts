// The Survival Kit and its rules, without any user interface. The data keeps the shape of the original Survival Kit
// of living-documentation (`titre`, `liens`, `nom`…), so its `.survival-kit.json` imports as it is.

export type Priority = "normal" | "urgent" | "later";

export const PRIORITIES: readonly Priority[] = ["normal", "urgent", "later"];

export interface Task {
  id: number;
  text: string;
  priority: Priority;
  done: boolean;
}

export type BlocType = "b" | "p" | "pre" | "ul" | "table";

export type Bloc =
  | { type: "b" | "p" | "pre"; content: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

export interface Note {
  id: number;
  theme: Theme;
  titre: string;
  blocs: Bloc[];
}

export interface Link {
  nom: string;
  desc: string;
  url: string;
}

export interface Category {
  theme: Theme;
  titre: string;
  liens: Link[];
}

export interface Kit {
  tasks: Task[];
  notes: Note[];
  links: Category[];
}

/** The six colors of notes and categories; each has a light and a dark variant. */
export const THEMES = ["t-green", "t-violet", "t-amber", "t-sky", "t-rose", "t-teal"] as const;

export type Theme = (typeof THEMES)[number];

/** The block typed by the User, or `null` when there is nothing in it. */
export function buildBloc(type: BlocType, raw: string): Bloc | null {
  if (!raw.trim()) return null;
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (type === "ul") return { type, items: lines };
  if (type === "table") {
    const cells = (line: string) => line.split("|").map((cell) => cell.trim());
    return { type, headers: cells(lines[0]), rows: lines.slice(1).map(cells) };
  }
  return { type, content: raw };
}

/** The text a block was built from, to edit it again. */
export function blocToText(bloc: Bloc): string {
  if (bloc.type === "ul") return bloc.items.join("\n");
  if (bloc.type === "table") return [bloc.headers, ...bloc.rows].map((cells) => cells.join(" | ")).join("\n");
  return bloc.content;
}

/**
 * The URL a link opens. Without a scheme, a URL would be resolved against the document of the View, a srcdoc, and lead
 * nowhere: it gets `https://`. Only `http(s)://`, `mailto:` and `tel:` are kept as they are, so a link never runs a script.
 */
export function withScheme(url: string): string {
  if (/^https?:\/\//i.test(url) || /^(mailto|tel):/i.test(url)) return url;
  return `https://${url.replace(/^\/\//, "")}`;
}

// ---------------------------------------------------------------------------------------------------------------------
// Reading a kit written by someone else: an imported file, or the Host storage written by an older version.

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");

const themeOf = (value: unknown): Theme => (THEMES.includes(value as Theme) ? (value as Theme) : "t-green");

/** Gives a fresh id to each item whose id is missing or already taken, so that each item can be told apart. */
function uniqueIds<T extends { id: unknown }>(items: T[]): (T & { id: number })[] {
  const taken = new Set<number>();
  let next = Date.now();
  return items.map((item) => {
    let id = typeof item.id === "number" && Number.isFinite(item.id) && !taken.has(item.id) ? item.id : next++;
    while (taken.has(id)) id = next++;
    taken.add(id);
    return { ...item, id };
  });
}

/** The readable items of a list, `[]` when it is not a list. */
const readList = <T>(value: unknown, read: (item: Record<string, unknown>) => T | null): T[] =>
  Array.isArray(value) ? value.flatMap((item) => (isObject(item) ? (read(item) ?? []) : [])) : [];

export function readTasks(value: unknown): Task[] {
  const tasks = readList(value, (task) =>
    typeof task.text === "string"
      ? {
          id: task.id,
          text: task.text,
          priority: PRIORITIES.includes(task.priority as Priority) ? (task.priority as Priority) : "normal",
          done: task.done === true,
        }
      : null,
  );
  return uniqueIds(tasks);
}

function readBloc(bloc: Record<string, unknown>): Bloc | null {
  if ((bloc.type === "b" || bloc.type === "p" || bloc.type === "pre") && typeof bloc.content === "string") {
    return { type: bloc.type, content: bloc.content };
  }
  if (bloc.type === "ul" && isStrings(bloc.items)) return { type: "ul", items: bloc.items };
  if (bloc.type === "table" && isStrings(bloc.headers) && Array.isArray(bloc.rows) && bloc.rows.every(isStrings)) {
    return { type: "table", headers: bloc.headers, rows: bloc.rows };
  }
  return null;
}

export function readNotes(value: unknown): Note[] {
  const notes = readList(value, (note) =>
    typeof note.titre === "string"
      ? { id: note.id, theme: themeOf(note.theme), titre: note.titre, blocs: readList(note.blocs, readBloc) }
      : null,
  );
  return uniqueIds(notes);
}

const readLink = (link: Record<string, unknown>): Link | null =>
  typeof link.nom === "string" && typeof link.url === "string"
    ? { nom: link.nom, desc: typeof link.desc === "string" ? link.desc : "", url: link.url }
    : null;

export function readLinks(value: unknown): Category[] {
  return readList(value, (category) =>
    typeof category.titre === "string"
      ? { titre: category.titre, theme: themeOf(category.theme), liens: readList(category.liens, readLink) }
      : null,
  );
}

/**
 * The kit in the text of a `.survival-kit.json`. A missing or invalid list is read as empty; a file that is not JSON,
 * or holds none of the three lists, is refused.
 */
export function readKit(text: string): Kit {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file is not a Survival Kit: it is not JSON.");
  }
  if (!isObject(data) || !["tasks", "notes", "links"].some((list) => Array.isArray(data[list]))) {
    throw new Error("This file is not a Survival Kit: it has no tasks, notes or links.");
  }
  return { tasks: readTasks(data.tasks), notes: readNotes(data.notes), links: readLinks(data.links) };
}

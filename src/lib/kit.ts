// The Survival Kit and its rules, without any user interface or storage.
// The readers also accept the shape of the original Survival Kit of living-documentation (`titre`, `liens`, `nom`,
// `blocs`, `theme: "t-green"`…), which version 1.0.0 of this Module kept: its `.survival-kit.json` imports as it is,
// and a kit written by 1.0.0 is read without loss.

export type Priority = "normal" | "urgent" | "later";

export const PRIORITIES: readonly Priority[] = ["normal", "urgent", "later"];

export interface Task {
  id: number;
  text: string;
  priority: Priority;
  done: boolean;
}

/** Heading, Text, Code, Bullet list and Table. */
export type BlockType = "b" | "p" | "pre" | "ul" | "table";

export const BLOCK_TYPES: readonly BlockType[] = ["b", "p", "pre", "ul", "table"];

export type Block =
  | { type: "b" | "p" | "pre"; content: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

/** The six colors of notes and categories; each has a light and a dark variant. */
export const COLORS = ["green", "violet", "amber", "sky", "rose", "teal"] as const;

export type Color = (typeof COLORS)[number];

export interface Note {
  id: number;
  color: Color;
  title: string;
  blocks: Block[];
}

export interface Link {
  name: string;
  description: string;
  url: string;
}

export interface Category {
  color: Color;
  title: string;
  links: Link[];
}

/** Everything the User keeps: the three panels myTasks, myNotes and myLinks. */
export interface Kit {
  tasks: Task[];
  notes: Note[];
  categories: Category[];
}

// ---------------------------------------------------------------------------------------------------------------------
// Rules.

export type Filter = "all" | "todo" | "done" | Priority;

export const FILTERS: readonly Filter[] = ["all", "todo", "done", "urgent", "normal", "later"];

/** To do and Done look at completion; a priority shows its tasks, done or not. */
export function matchesFilter(task: Task, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "todo") return !task.done;
  if (filter === "done") return task.done;
  return task.priority === filter;
}

/** An id that no item of the list has, even for two items added within the same millisecond. */
export const newId = (items: readonly { id: number }[]): number => Math.max(Date.now(), ...items.map((item) => item.id + 1));

/** The block typed by the User, or `null` when there is nothing in it. */
export function buildBlock(type: BlockType, raw: string): Block | null {
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
export function blockToText(block: Block): string {
  if (block.type === "ul") return block.items.join("\n");
  if (block.type === "table") return [block.headers, ...block.rows].map((cells) => cells.join(" | ")).join("\n");
  return block.content;
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

type Fields = Record<string, unknown>;

const isObject = (value: unknown): value is Fields => typeof value === "object" && value !== null && !Array.isArray(value);

const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");

/** The first of these fields that is a string, or null. */
const stringOf = (fields: Fields, ...names: string[]): string | null => {
  const value = names.map((name) => fields[name]).find((value) => typeof value === "string");
  return (value as string | undefined) ?? null;
};

/** A color, also as the original wrote it ("t-sky"); green when it is unknown. */
function colorOf(fields: Fields): Color {
  const color = stringOf(fields, "color", "theme")?.replace(/^t-/, "");
  return COLORS.includes(color as Color) ? (color as Color) : "green";
}

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
const readList = <T>(value: unknown, read: (item: Fields) => T | null): T[] =>
  Array.isArray(value) ? value.flatMap((item) => (isObject(item) ? (read(item) ?? []) : [])) : [];

export function readTasks(value: unknown): Task[] {
  const tasks = readList(value, (task) => {
    const text = stringOf(task, "text");
    if (text === null) return null;
    const priority = PRIORITIES.includes(task.priority as Priority) ? (task.priority as Priority) : "normal";
    return { id: task.id, text, priority, done: task.done === true };
  });
  return uniqueIds(tasks);
}

function readBlock(block: Fields): Block | null {
  if ((block.type === "b" || block.type === "p" || block.type === "pre") && typeof block.content === "string") {
    return { type: block.type, content: block.content };
  }
  if (block.type === "ul" && isStrings(block.items)) return { type: "ul", items: block.items };
  if (block.type === "table" && isStrings(block.headers) && Array.isArray(block.rows) && block.rows.every(isStrings)) {
    return { type: "table", headers: block.headers, rows: block.rows };
  }
  return null;
}

export function readNotes(value: unknown): Note[] {
  const notes = readList(value, (note) => {
    const title = stringOf(note, "title", "titre");
    if (title === null) return null;
    return { id: note.id, color: colorOf(note), title, blocks: readList(note.blocks ?? note.blocs, readBlock) };
  });
  return uniqueIds(notes);
}

function readLink(link: Fields): Link | null {
  const name = stringOf(link, "name", "nom");
  const url = stringOf(link, "url");
  if (name === null || url === null) return null;
  return { name, description: stringOf(link, "description", "desc") ?? "", url: withScheme(url) };
}

export function readCategories(value: unknown): Category[] {
  return readList(value, (category) => {
    const title = stringOf(category, "title", "titre");
    if (title === null) return null;
    return { color: colorOf(category), title, links: readList(category.links ?? category.liens, readLink) };
  });
}

/**
 * The kit in the text of a `.survival-kit.json`, whose lists are `tasks`, `notes` and `links`. A missing or invalid
 * list is read as empty; a file that is not JSON, or holds none of the three lists, is refused.
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
  return { tasks: readTasks(data.tasks), notes: readNotes(data.notes), categories: readCategories(data.links) };
}

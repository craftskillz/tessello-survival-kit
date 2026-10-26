// What the browser tests of Survival Kit share: its built package served from dist/, its View and Widget opened in
// Chromium against the Test Host of the SDK, and the gestures of the View. Every wait goes through `until`, which reads
// again until a deadline (E2E_CPU_SLOWDOWN multiplies it), or through Playwright's own wait for an element, never
// through a fixed time.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { after, before } from "node:test";
import { type Browser, chromium, type Locator, type Page } from "playwright";
import { createTestHost, type FolderServer, serveFolder, slowDownCpu, type TestHost, type TestHostOptions, type TestSurface, until, WIDGET_SIZES } from "@tessello/sdk/testing";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const manifest = JSON.parse(await readFile(`${DIST}manifest.json`, "utf8").catch(() => {
  throw new Error("No dist/: run `npm run build` before the browser tests.");
}));
const module = { id: manifest.id as string, version: manifest.version as string };

let browser: Browser;
let server: FolderServer;

/** Serves dist/ and starts Chromium for the tests of the file that calls it. */
export function useBrowser(): void {
  before(async () => {
    server = await serveFolder(DIST);
    browser = await chromium.launch();
  });
  after(async () => {
    await browser?.close();
    await server?.close();
  });
}

/** A page in a new browser context, slowed down by E2E_CPU_SLOWDOWN. */
async function newPage(options: { viewport?: { width: number; height: number }; clipboard?: boolean } = {}): Promise<Page> {
  const context = await browser.newContext(options.viewport ? { viewport: options.viewport } : {});
  if (options.clipboard) await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(server.url).origin });
  const page = await context.newPage();
  await slowDownCpu(page);
  return page;
}

export interface Opened {
  page: Page;
  host: TestHost;
  surface: TestSurface;
}

/** A Test Host for Survival Kit, under the Identifier of its Manifest. */
export const survivalKitHost = (options: Omit<TestHostOptions, "module"> = {}) => createTestHost({ module, ...options });

interface OpenOptions {
  host?: TestHost;
  storage?: TestHostOptions["storage"];
  /** Grants the page the clipboard, to read what the View copied. */
  clipboard?: boolean;
  /** View only: the params it is opened with, as from the Widget's `openView`. */
  params?: Record<string, string>;
}

/** Opens the View, in English, on a Test Host of its own unless one is given, and waits until it has read the kit. */
export async function openView(options: OpenOptions = {}): Promise<Opened> {
  const host = options.host ?? survivalKitHost({ storage: options.storage });
  const page = await newPage({ clipboard: options.clipboard });
  const surface = await host.attach(page, { surface: "view", params: options.params });
  await page.goto(`${server.url}/${manifest.view.entry}`);
  await loaded(page);
  return { page, host, surface };
}

/** Opens the Widget, at the size its Manifest declares, on a Test Host of its own unless one is given. */
export async function openWidget(options: Pick<OpenOptions, "host" | "storage"> = {}): Promise<Opened> {
  const host = options.host ?? survivalKitHost({ storage: options.storage });
  const page = await newPage({ viewport: WIDGET_SIZES[manifest.widget.size as keyof typeof WIDGET_SIZES] });
  const surface = await host.attach(page, { surface: "widget" });
  await page.goto(`${server.url}/${manifest.widget.entry}`);
  return { page, host, surface };
}

/** Waits until the View has read the kit: its heading shows. */
const loaded = (page: Page) => page.getByRole("heading", { name: "myTasks." }).waitFor();

/** Reloads the View, and waits until it has read the kit again. */
export async function reload(page: Page) {
  await page.reload();
  await loaded(page);
}

// The storage, as the Test Host holds it.

type Key = "tasks" | "notes" | "links";

/** Waits until a key of the kit passes `written`, so that a reload cannot cut a write short, and returns its value. */
export const stored = (host: TestHost, key: Key, written: (value: any) => boolean) =>
  until(async () => {
    const value = await host.storage.get(key);
    return value !== null && written(value) && { value };
  }, `"${key}" to be written`).then((found) => found.value as any);

// The gestures of the View.

/** The panel of the View: "myTasks", "myNotes" or "myLinks". */
export const panel = (page: Page, name: "myTasks" | "myNotes" | "myLinks"): Locator => page.getByRole("region", { name, exact: true });
export const alert = (page: Page) => page.getByRole("alert");

/** Creates a note through its dialog. */
export async function addNote(page: Page, title: string) {
  await panel(page, "myNotes").getByRole("button", { name: "+ new note" }).click();
  await page.getByRole("dialog", { name: "New note" }).getByRole("textbox", { name: "Title" }).fill(title);
  await page.getByRole("button", { name: "Create" }).click();
}

/** Creates a note, adds a Code block to it in edit mode, and waits for the block. */
export async function addCodeNote(page: Page, title: string, code: string) {
  const notes = panel(page, "myNotes");
  await addNote(page, title);
  await notes.getByRole("button", { name: "edit mode" }).click();
  await notes.getByRole("button", { name: "+ add a block" }).click();
  const dialog = page.getByRole("dialog", { name: "New block" });
  await dialog.getByRole("combobox", { name: "Type" }).selectOption({ label: "Code" });
  await dialog.getByRole("textbox", { name: "Content" }).fill(code);
  await dialog.getByRole("button", { name: "Save" }).click();
  await notes.locator("pre").getByText(code).waitFor();
}

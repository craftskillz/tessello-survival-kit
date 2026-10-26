// Importing a .survival-kit.json through the file input of the View: a file that is not a kit is refused by name, a kit
// is counted in a confirmation, and "Replace" replaces the kit in the storage of the Test Host.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { alert, openView, panel, stored, useBrowser } from "./survival-kit.ts";

useBrowser();

describe("import", () => {
  test("refuses a file that is not a kit by name, counts a kit in a confirmation, and replaces the kit and writes it", async () => {
    const { page, host } = await openView({
      storage: { tasks: [{ id: 1, text: "Replaced by the import", priority: "later", done: false }] },
    });
    await page.getByRole("checkbox", { name: "Replaced by the import" }).waitFor();
    const file = page.locator("input[type=file]");

    await file.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not a kit") });
    await alert(page).getByText("notes.txt can't be imported: it is not a Survival Kit.").waitFor();

    const kit = {
      tasks: [
        { id: 1, text: "Imported task", priority: "urgent", done: false },
        { id: 2, text: "Imported done task", priority: "normal", done: true },
      ],
      // Three notes against two tasks and one category, so that a count read from the wrong list differs.
      notes: [
        { id: 3, theme: "t-violet", titre: "Imported note", blocs: [{ type: "ul", items: ["one", "two"] }] },
        { id: 4, theme: "t-sky", titre: "Second note", blocs: [] },
        { id: 5, theme: "t-sky", titre: "Third note", blocs: [] },
      ],
      links: [{ theme: "t-sky", titre: "Imported links", liens: [{ nom: "MDN", desc: "", url: "https://developer.mozilla.org" }] }],
    };
    await file.setInputFiles({ name: ".survival-kit.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(kit)) });
    const dialog = page.getByRole("dialog", { name: "Replace your kit?" });
    await dialog.getByText("This file holds 2 tasks, 3 notes and 1 categories of links.").waitFor();
    await dialog.getByRole("button", { name: "Replace" }).click();

    await page.getByRole("checkbox", { name: "Imported task" }).waitFor();
    assert.equal(await page.getByRole("checkbox", { name: "Replaced by the import" }).count(), 0);
    await panel(page, "myNotes").getByRole("region", { name: "Imported note" }).waitFor();
    await panel(page, "myLinks").getByRole("region", { name: "Imported links" }).waitFor();

    const tasks = await stored(host, "tasks", (value) => value.length === 2);
    assert.deepEqual(tasks.map((task: { text: string }) => task.text), ["Imported task", "Imported done task"]);
    const notes = await stored(host, "notes", (value) => value[0]?.title === "Imported note");
    assert.equal(notes.length, 3);
    const links = await stored(host, "links", (value) => value[0]?.title === "Imported links");
    assert.equal(links.length, 1);
    assert.equal(links[0].links[0].url, "https://developer.mozilla.org");
  });
});

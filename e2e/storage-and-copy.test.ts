// What the View tells the User when the Host refuses a write (a full storage), and the "copy" button of a Code block
// against the real clipboard of the browser.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { until } from "@tessello/sdk/testing";
import { addCodeNote, addNote, alert, openView, panel, useBrowser } from "./survival-kit.ts";

useBrowser();

describe("storage and clipboard", () => {
  test("tells the User when a change cannot be saved because the storage is full", async () => {
    const { page, host } = await openView();
    host.refuseWrites({ code: "quota_exceeded" });
    await addNote(page, "Too big");
    await alert(page).getByText(/Your last change could not be saved: the storage of the Survival Kit is full/).waitFor();
  });

  test("the copy button of a Code block puts the code in the clipboard and becomes \"copied ✓\"", async () => {
    const { page } = await openView({ clipboard: true });
    await addCodeNote(page, "Git", "git stash pop");
    await panel(page, "myNotes").getByRole("button", { name: "copy" }).click();
    await panel(page, "myNotes").getByRole("button", { name: "copied ✓" }).waitFor();
    assert.equal(await until(() => page.evaluate(() => navigator.clipboard.readText()), "the clipboard to hold the code"), "git stash pop");
  });
});

// The notes and the links of the View: a note with a Code block, a category and a link created through their dialogs,
// the link opening in a new tab, and both coming back from the storage of the Test Host, expanded by "expand all".

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { addCodeNote, openView, panel, reload, stored, useBrowser } from "./survival-kit.ts";

useBrowser();

describe("notes and links", () => {
  test("a note shows its Code block in a pre, a link opens in a new tab, and both come back expanded by \"expand all\"", async () => {
    const { page, host } = await openView();
    await addCodeNote(page, "Git shortcuts", "git log --oneline --graph");

    const links = panel(page, "myLinks");
    await links.getByRole("button", { name: "+ new category" }).click();
    await page.getByRole("dialog", { name: "New category" }).getByRole("textbox", { name: "Name" }).fill("Monitoring");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await links.getByRole("button", { name: "edit mode" }).click();
    await links.getByRole("button", { name: "Add a link" }).click();
    const dialog = page.getByRole("dialog", { name: "New link" });
    await dialog.getByRole("textbox", { name: "Name" }).fill("Grafana");
    await dialog.getByRole("textbox", { name: "Description" }).fill("production dashboards");
    await dialog.getByRole("textbox", { name: "URL" }).fill("grafana.example.com");
    await dialog.getByRole("button", { name: "Add" }).click();

    const categories = await stored(host, "links", (value) => value[0]?.links?.length === 1);
    assert.equal(categories[0].title, "Monitoring");
    await stored(host, "notes", (value) => value.length === 1);

    await reload(page);
    await panel(page, "myNotes").getByRole("button", { name: "expand all" }).click();
    await panel(page, "myNotes").locator("pre").getByText("git log --oneline --graph").waitFor();
    await links.getByRole("button", { name: "expand all" }).click();
    const link = links.getByRole("link", { name: /Grafana — production dashboards/ });
    await link.waitFor();
    assert.equal(await link.getAttribute("href"), "https://grafana.example.com", "a URL without a scheme gets https://");
    assert.equal(await link.getAttribute("target"), "_blank");
  });
});

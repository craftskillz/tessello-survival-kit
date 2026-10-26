// The Widget: the urgent tasks still to do, checked in place and written to the storage, the View reading the kit again
// when shown, and the Widget's way into the View filtered on Urgent. Both open on one Test Host, as in the Home.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { until } from "@tessello/sdk/testing";
import { openView, openWidget, stored, survivalKitHost, useBrowser } from "./survival-kit.ts";

useBrowser();

const tasks = [
  { id: 1, text: "Renew the certificate", priority: "urgent", done: false },
  { id: 2, text: "Water the plants", priority: "normal", done: false },
];

describe("widget", () => {
  test("shows only the urgent tasks to do, writes a task checked in it as done, and the View reads the kit again when shown", async () => {
    const host = survivalKitHost({ storage: { tasks } });
    const { page: widget } = await openWidget({ host });
    const { page: view, surface } = await openView({ host });

    const urgent = widget.getByRole("checkbox", { name: "Renew the certificate" });
    await urgent.waitFor();
    assert.equal(await widget.getByRole("checkbox", { name: "Water the plants" }).count(), 0, "only urgent tasks");
    await widget.getByText("1 urgent").waitFor();
    await widget.getByText("2 to do").waitFor();

    await urgent.click();
    await widget.getByText("No urgent task.").waitFor();
    await widget.getByText("1 to do").waitFor();
    const written = await stored(host, "tasks", (value) => value.some((task: { done: boolean }) => task.done));
    assert.deepEqual(written.map((task: { id: number; done: boolean }) => [task.id, task.done]), [[1, true], [2, false]]);

    // The View, hidden behind the Home, reads the kit again when it is shown.
    surface.setVisible(false);
    await host.storage.set("tasks", written);
    const certificate = view.getByRole("checkbox", { name: "Renew the certificate" });
    assert.equal(await certificate.getAttribute("aria-checked"), "false", "the View has not read the kit again yet");
    surface.setVisible(true);
    await view.getByRole("checkbox", { name: "Renew the certificate", checked: true }).waitFor();
    assert.equal(await view.getByRole("checkbox", { name: "Water the plants" }).getAttribute("aria-checked"), "false");
  });

  test("the urgent count asks for the View filtered on Urgent, which applies the filter it is opened with or receives", async () => {
    const host = survivalKitHost({ storage: { tasks } });
    const { page: widget } = await openWidget({ host });
    await widget.getByRole("button", { name: "1 urgent" }).click();
    await until(() => host.openedViews.length === 1, "the urgent count to open the View");
    assert.deepEqual(host.openedViews, [{ filter: "urgent" }]);

    // The View is not loaded: it gets the params in its handshake.
    const filtered = await openView({ storage: { tasks }, params: { filter: "urgent" } });
    await filtered.page.locator("button[aria-pressed='true']", { hasText: "Urgent" }).waitFor();
    await filtered.page.getByRole("checkbox", { name: "Renew the certificate" }).waitFor();
    assert.equal(await filtered.page.getByRole("checkbox", { name: "Water the plants" }).count(), 0);

    // The View is loaded without a filter: it gets the params as an event.
    const unfiltered = await openView({ host });
    const urgentFilter = unfiltered.page.getByRole("button", { name: "Urgent", exact: true });
    assert.equal(await urgentFilter.getAttribute("aria-pressed"), "false");
    await unfiltered.page.getByRole("checkbox", { name: "Water the plants" }).waitFor();
    host.openView({ filter: "urgent" });
    await unfiltered.page.locator("button[aria-pressed='true']", { hasText: "Urgent" }).waitFor();
    await until(async () => (await unfiltered.page.getByRole("checkbox", { name: "Water the plants" }).count()) === 0, "the View to show only urgent tasks");
    await unfiltered.page.getByRole("checkbox", { name: "Renew the certificate" }).waitFor();
  });
});

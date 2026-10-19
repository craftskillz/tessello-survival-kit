import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { type Json, type Storage, TesselloError } from "@tessello/sdk";
import { kitStorage } from "../src/lib/storage.ts";

/** The Host storage of the Module, in memory; `failWith` makes every write fail. */
function memoryStorage(initial: Record<string, Json> = {}, failWith?: Error) {
  const values = new Map(Object.entries(initial));
  const storage: Storage = {
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => {
      if (failWith) throw failWith;
      values.set(key, structuredClone(value));
    },
    delete: async (key) => void values.delete(key),
    keys: async () => [...values.keys()],
  };
  return { storage, values };
}

describe("the kit in the Host storage", () => {
  test("a list never written is read as empty", async () => {
    const { storage } = memoryStorage();
    assert.deepEqual(await kitStorage(storage).read("tasks", "notes", "categories"), { tasks: [], notes: [], categories: [] });
  });

  test("reads only the lists asked for", async () => {
    const { storage } = memoryStorage({ tasks: [{ id: 1, text: "Renew the certificate", priority: "urgent", done: false }] });
    assert.deepEqual(await kitStorage(storage).read("tasks"), { tasks: [{ id: 1, text: "Renew the certificate", priority: "urgent", done: false }] });
  });

  test("keeps the categories of myLinks under the key of the original, links, and reads back what it wrote", async () => {
    const { storage, values } = memoryStorage();
    const categories = [{ color: "sky" as const, title: "Monitoring", links: [{ name: "Grafana", description: "", url: "https://grafana.example.com" }] }];
    await kitStorage(storage).write({ categories });
    assert.deepEqual([...values.keys()], ["links"]);
    assert.deepEqual(await kitStorage(storage).read("categories"), { categories });
  });

  test("reads a kit written by version 1.0.0, in the shape of the original", async () => {
    const { storage } = memoryStorage({
      notes: [{ id: 2, theme: "t-violet", titre: "Git", blocs: [{ type: "pre", content: "git log" }] }],
      links: [{ theme: "t-sky", titre: "Monitoring", liens: [{ nom: "Grafana", desc: "prod", url: "grafana.example.com" }] }],
    });
    assert.deepEqual(await kitStorage(storage).read("notes", "categories"), {
      notes: [{ id: 2, color: "violet", title: "Git", blocks: [{ type: "pre", content: "git log" }] }],
      categories: [{ color: "sky", title: "Monitoring", links: [{ name: "Grafana", description: "prod", url: "https://grafana.example.com" }] }],
    });
  });

  test("a full storage is a message for the User", async () => {
    const { storage } = memoryStorage({}, new TesselloError("quota_exceeded", "The storage is full."));
    await assert.rejects(kitStorage(storage).write({ tasks: [] }), { message: /the storage of the Survival Kit is full/ });
  });

  test("any other failure is a message for the User, with its reason", async () => {
    const { storage } = memoryStorage({}, new TesselloError("internal", "disk unplugged"));
    await assert.rejects(kitStorage(storage).write({ tasks: [] }), { message: /could not be saved \(disk unplugged\)/ });
  });
});

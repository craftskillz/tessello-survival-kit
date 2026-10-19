import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { blockToText, buildBlock, matchesFilter, newId, readCategories, readKit, readNotes, readTasks, withScheme, type Task } from "../src/lib/kit.ts";

describe("building a block from what the User typed", () => {
  test("refuses content made only of spaces", () => {
    for (const type of ["b", "p", "pre", "ul", "table"] as const) assert.equal(buildBlock(type, "  \n \t"), null, type);
  });

  test("keeps a heading, a text and a code exactly as typed", () => {
    assert.deepEqual(buildBlock("pre", "  git log\n    --graph "), { type: "pre", content: "  git log\n    --graph " });
    assert.deepEqual(buildBlock("p", " two\nlines"), { type: "p", content: " two\nlines" });
    assert.deepEqual(buildBlock("b", "Git"), { type: "b", content: "Git" });
  });

  test("a bullet list keeps one trimmed item per non-blank line", () => {
    assert.deepEqual(buildBlock("ul", " first \n\n  second\n "), { type: "ul", items: ["first", "second"] });
  });

  test("a table takes its headers from the first non-blank line, and rows may have different lengths", () => {
    assert.deepEqual(buildBlock("table", "\n Command | Effect \ngit stash | shelve changes\n\ngit pop"), {
      type: "table",
      headers: ["Command", "Effect"],
      rows: [["git stash", "shelve changes"], ["git pop"]],
    });
  });

  test("a block turns back into the text it was built from", () => {
    assert.equal(blockToText({ type: "ul", items: ["a", "b"] }), "a\nb");
    assert.equal(blockToText({ type: "table", headers: ["A", "B"], rows: [["1", "2"]] }), "A | B\n1 | 2");
    assert.equal(blockToText({ type: "pre", content: " x " }), " x ");
  });
});

describe("a link URL", () => {
  test("without a scheme gets https://", () => {
    assert.equal(withScheme("grafana.example.com"), "https://grafana.example.com");
    assert.equal(withScheme("localhost:3000/path"), "https://localhost:3000/path");
    assert.equal(withScheme("//cdn.example.com/x"), "https://cdn.example.com/x");
  });

  test("with a scheme is kept", () => {
    assert.equal(withScheme("https://grafana.example.com"), "https://grafana.example.com");
    assert.equal(withScheme("HTTP://intranet"), "HTTP://intranet");
    assert.equal(withScheme("mailto:ops@example.com"), "mailto:ops@example.com");
  });

  test("never runs a script", () => {
    assert.equal(withScheme("javascript:alert(1)"), "https://javascript:alert(1)");
  });
});

describe("filtering the tasks", () => {
  const tasks: Task[] = [
    { id: 1, text: "urgent, to do", priority: "urgent", done: false },
    { id: 2, text: "urgent, done", priority: "urgent", done: true },
    { id: 3, text: "later, to do", priority: "later", done: false },
  ];
  const shown = (filter: Parameters<typeof matchesFilter>[1]) => tasks.filter((task) => matchesFilter(task, filter)).map((task) => task.id);

  test("To do and Done look at completion", () => {
    assert.deepEqual(shown("all"), [1, 2, 3]);
    assert.deepEqual(shown("todo"), [1, 3]);
    assert.deepEqual(shown("done"), [2]);
  });

  test("a priority shows its tasks, done or not", () => {
    assert.deepEqual(shown("urgent"), [1, 2]);
    assert.deepEqual(shown("normal"), []);
  });
});

describe("a new id", () => {
  test("is taken by no item, even when an item's id is in the future", () => {
    const future = Date.now() + 60_000;
    assert.equal(newId([{ id: 1 }, { id: future }]), future + 1);
  });

  test("differs for two items added within the same millisecond", () => {
    const first = { id: newId([]) };
    assert.notEqual(newId([first]), first.id);
  });
});

describe("reading a kit defensively", () => {
  const kit = {
    tasks: [{ id: 1, text: "Rotate the API key", priority: "urgent", done: false }],
    notes: [{ id: 2, color: "violet", title: "Git", blocks: [{ type: "pre", content: "git log" }] }],
    categories: [{ color: "sky", title: "Monitoring", links: [{ name: "Grafana", description: "", url: "https://grafana.example.com" }] }],
  };
  /** The same kit, as the original Survival Kit, and version 1.0.0 of this Module, wrote it. */
  const original = {
    tasks: kit.tasks,
    notes: [{ id: 2, theme: "t-violet", titre: "Git", blocs: [{ type: "pre", content: "git log" }] }],
    links: [{ theme: "t-sky", titre: "Monitoring", liens: [{ nom: "Grafana", desc: "", url: "https://grafana.example.com" }] }],
  };

  test("reads a .survival-kit.json of the original Survival Kit", () => {
    assert.deepEqual(readKit(JSON.stringify(original)), kit);
  });

  test("reads the lists as this version writes them", () => {
    assert.deepEqual(readNotes(kit.notes), kit.notes);
    assert.deepEqual(readCategories(kit.categories), kit.categories);
  });

  test("ignores a missing or invalid list", () => {
    assert.deepEqual(readKit(JSON.stringify({ tasks: kit.tasks, notes: "oops" })), { tasks: kit.tasks, notes: [], categories: [] });
  });

  test("leaves out the items it cannot read, and fills in what it can", () => {
    assert.deepEqual(readTasks([{ id: 1, text: "ok", priority: "soon", done: "yes" }, { text: 3 }, null, "task"]), [
      { id: 1, text: "ok", priority: "normal", done: false },
    ]);
    assert.deepEqual(readNotes([{ id: 2, title: "Git", color: "pink", blocks: [{ type: "p", content: "x" }, { type: "video" }] }]), [
      { id: 2, title: "Git", color: "green", blocks: [{ type: "p", content: "x" }] },
    ]);
    assert.deepEqual(readCategories([{ title: "Docs", links: [{ name: "MDN", url: "https://developer.mozilla.org" }, { name: "no url" }] }]), [
      { title: "Docs", color: "green", links: [{ name: "MDN", description: "", url: "https://developer.mozilla.org" }] },
    ]);
  });

  test("gives https:// to a link URL without a scheme, so that an imported link opens", () => {
    assert.equal(readCategories([{ title: "Docs", links: [{ name: "MDN", url: "developer.mozilla.org" }] }])[0].links[0].url, "https://developer.mozilla.org");
  });

  test("gives a fresh id to a task or a note whose id is missing or already taken", () => {
    const tasks = readTasks([
      { id: 5, text: "a", priority: "normal", done: false },
      { id: 5, text: "b", priority: "normal", done: false },
      { text: "c", priority: "later", done: true },
    ]);
    assert.equal(new Set(tasks.map((task) => task.id)).size, 3);
    assert.equal(tasks[0].id, 5);
  });

  test("refuses a file that is not JSON, or not a kit", () => {
    for (const text of ["not json", "[]", "42", "null", JSON.stringify({ title: "something else" })]) {
      assert.throws(() => readKit(text), /not a Survival Kit/, text);
    }
  });
});

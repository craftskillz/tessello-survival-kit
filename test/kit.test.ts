import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { blocToText, buildBloc, readKit, readLinks, readNotes, readTasks, withScheme } from "../src/lib/kit.ts";

describe("building a block from what the User typed", () => {
  test("refuses content made only of spaces", () => {
    for (const type of ["b", "p", "pre", "ul", "table"] as const) assert.equal(buildBloc(type, "  \n \t"), null, type);
  });

  test("keeps a heading, a text and a code exactly as typed", () => {
    assert.deepEqual(buildBloc("pre", "  git log\n    --graph "), { type: "pre", content: "  git log\n    --graph " });
    assert.deepEqual(buildBloc("p", " two\nlines"), { type: "p", content: " two\nlines" });
    assert.deepEqual(buildBloc("b", "Git"), { type: "b", content: "Git" });
  });

  test("a bullet list keeps one trimmed item per non-blank line", () => {
    assert.deepEqual(buildBloc("ul", " first \n\n  second\n "), { type: "ul", items: ["first", "second"] });
  });

  test("a table takes its headers from the first non-blank line, and rows may have different lengths", () => {
    assert.deepEqual(buildBloc("table", "\n Command | Effect \ngit stash | shelve changes\n\ngit pop"), {
      type: "table",
      headers: ["Command", "Effect"],
      rows: [["git stash", "shelve changes"], ["git pop"]],
    });
  });

  test("a block turns back into the text it was built from", () => {
    assert.equal(blocToText({ type: "ul", items: ["a", "b"] }), "a\nb");
    assert.equal(blocToText({ type: "table", headers: ["A", "B"], rows: [["1", "2"]] }), "A | B\n1 | 2");
    assert.equal(blocToText({ type: "pre", content: " x " }), " x ");
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

describe("reading a kit defensively", () => {
  const kit = {
    tasks: [{ id: 1, text: "Rotate the API key", priority: "urgent", done: false }],
    notes: [{ id: 2, theme: "t-violet", titre: "Git", blocs: [{ type: "pre", content: "git log" }] }],
    links: [{ theme: "t-sky", titre: "Monitoring", liens: [{ nom: "Grafana", desc: "", url: "https://grafana.example.com" }] }],
  };

  test("reads a .survival-kit.json of the original Survival Kit as it is", () => {
    assert.deepEqual(readKit(JSON.stringify(kit)), kit);
  });

  test("ignores a missing or invalid list", () => {
    assert.deepEqual(readKit(JSON.stringify({ tasks: kit.tasks, notes: "oops" })), { tasks: kit.tasks, notes: [], links: [] });
  });

  test("leaves out the items it cannot read, and fills in what it can", () => {
    assert.deepEqual(
      readTasks([{ id: 1, text: "ok", priority: "soon", done: "yes" }, { text: 3 }, null, "task"]),
      [{ id: 1, text: "ok", priority: "normal", done: false }],
    );
    assert.deepEqual(readNotes([{ id: 2, titre: "Git", theme: "t-pink", blocs: [{ type: "p", content: "x" }, { type: "video" }] }]), [
      { id: 2, titre: "Git", theme: "t-green", blocs: [{ type: "p", content: "x" }] },
    ]);
    assert.deepEqual(readLinks([{ titre: "Docs", liens: [{ nom: "MDN", url: "https://developer.mozilla.org" }, { nom: "no url" }] }]), [
      { titre: "Docs", theme: "t-green", liens: [{ nom: "MDN", desc: "", url: "https://developer.mozilla.org" }] },
    ]);
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

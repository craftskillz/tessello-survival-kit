<script lang="ts">
  import { ask } from "../lib/confirmation.svelte.ts";
  import { t } from "../lib/i18n.ts";
  import { FILTERS, matchesFilter, newId, PRIORITIES, type Filter, type Priority } from "../lib/kit.ts";
  import { kit, save, ui } from "../lib/store.svelte.ts";
  import Modal from "./Modal.svelte";
  import PanelHead from "./PanelHead.svelte";

  let newText = $state("");
  let newPriority = $state<Priority>("normal");
  /** The task being edited; null when its dialog is closed. */
  let draft = $state<{ id: number; text: string; priority: Priority } | null>(null);

  let filtered = $derived(kit.tasks.filter((task) => matchesFilter(task, ui.filter)));

  const filterLabel = (filter: Filter) =>
    filter === "all" || filter === "todo" || filter === "done" ? t(`filter_${filter}`) : t(`priority_${filter}`);

  function addTask() {
    const text = newText.trim();
    if (!text) return;
    kit.tasks.unshift({ id: newId(kit.tasks), text, priority: newPriority, done: false });
    newText = "";
    void save("tasks");
  }

  function toggle(id: number) {
    const task = kit.tasks.find((task) => task.id === id);
    if (task) task.done = !task.done;
    void save("tasks");
  }

  function confirmEdit() {
    if (!draft) return;
    const { id, priority } = draft;
    const text = draft.text.trim();
    const task = kit.tasks.find((task) => task.id === id);
    if (!text || !task) return;
    Object.assign(task, { text, priority });
    draft = null;
    void save("tasks");
  }

  async function remove(id: number) {
    if (!(await ask(t("confirm_del_task_title"), t("irreversible")))) return;
    kit.tasks = kit.tasks.filter((task) => task.id !== id);
    void save("tasks");
  }
</script>

<PanelHead title={t("tasks_title")} subtitle={t("tasks_subtitle")} />

<div class="sk-add-bar">
  <input
    type="text"
    bind:value={newText}
    placeholder={t("tasks_input_placeholder")}
    aria-label={t("tasks_input_label")}
    onkeydown={(event) => event.key === "Enter" && addTask()}
  />
  <select bind:value={newPriority} aria-label={t("tasks_priority_label")}>
    {#each PRIORITIES as priority}
      <option value={priority}>{t(`priority_${priority}`)}</option>
    {/each}
  </select>
  <button type="button" class="sk-add-btn" aria-label={t("tasks_add")} onclick={addTask}>+</button>
</div>

<div class="sk-filters" role="group">
  {#each FILTERS as filter}
    <button type="button" class:active={ui.filter === filter} aria-pressed={ui.filter === filter} onclick={() => (ui.filter = filter)}
      >{filterLabel(filter)}</button
    >
  {/each}
</div>

<ul class="sk-tasks" aria-label={t("tasks_title")}>
  {#each filtered as task (task.id)}
    <li class="sk-task sk-task--{task.priority}" class:done={task.done}>
      <button
        type="button"
        class="sk-check"
        class:checked={task.done}
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.text}
        onclick={() => toggle(task.id)}
      ></button>
      <span class="sk-task-text">{task.text}</span>
      <span class="sk-task-tag">{t(`priority_${task.priority}`)}</span>
      <button
        type="button"
        class="sk-task-btn"
        title={t("tasks_edit_title")}
        aria-label={t("tasks_edit_title")}
        onclick={() => (draft = { id: task.id, text: task.text, priority: task.priority })}>✎</button
      >
      <button type="button" class="sk-task-btn sk-task-btn--del" title={t("delete")} aria-label={t("delete")} onclick={() => remove(task.id)}
        >✕</button
      >
    </li>
  {:else}
    <li class="sk-empty">{t("tasks_empty")}</li>
  {/each}
</ul>

<Modal open={draft !== null} title={t("tasks_edit_title")} onConfirm={confirmEdit} onClose={() => (draft = null)}>
  {#if draft}
    <label for="sk-task-text">{t("tasks_label_text")}</label>
    <input id="sk-task-text" type="text" bind:value={draft.text} onkeydown={(event) => event.key === "Enter" && confirmEdit()} />
    <label for="sk-task-priority">{t("tasks_priority_label")}</label>
    <select id="sk-task-priority" bind:value={draft.priority}>
      {#each PRIORITIES as priority}
        <option value={priority}>{t(`priority_${priority}`)}</option>
      {/each}
    </select>
  {/if}
</Modal>

<style>
  .sk-add-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  .sk-add-bar input {
    flex: 1;
    min-width: 0;
    padding: 8px 10px;
    font-size: 13px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel-soft);
    color: var(--ink);
    font-family: inherit;
  }
  .sk-add-bar select {
    padding: 8px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel-soft);
    color: var(--ink);
    font-family: inherit;
  }
  .sk-add-bar input:focus,
  .sk-add-bar select:focus {
    outline: none;
    border-color: var(--accent);
  }
  .sk-add-btn {
    width: 36px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #fff;
    border-radius: 8px;
    font-size: 18px;
    cursor: pointer;
    line-height: 1;
  }
  .sk-add-btn:hover {
    background: var(--accent-strong);
  }

  .sk-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
  }
  .sk-filters button {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-family: inherit;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .sk-filters button.active {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent-strong);
  }

  .sk-tasks {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .sk-task {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border: 1px solid var(--sk-border);
    border-radius: 10px;
    background: var(--sk-bg);
    color: var(--sk-color);
  }
  .sk-task-text {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    word-break: break-word;
  }
  .sk-task.done {
    opacity: 0.5;
  }
  .sk-task.done .sk-task-text {
    text-decoration: line-through;
  }
  .sk-task-tag {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 3px 8px;
    border-radius: 5px;
    background: var(--sk-tag-bg);
    color: var(--sk-tag-fg);
    flex-shrink: 0;
  }
  .sk-task-btn {
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-size: 12px;
    flex-shrink: 0;
    padding: 2px 4px;
  }
  .sk-task-btn:hover {
    color: var(--accent-strong);
  }
  .sk-task-btn--del:hover {
    color: var(--red);
  }
</style>

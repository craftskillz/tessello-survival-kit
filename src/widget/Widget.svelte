<script lang="ts">
  import type { ConnectedModule } from "@tessello/sdk";
  import { onMount } from "svelte";
  import { t } from "../lib/i18n.ts";
  import type { Category, Task } from "../lib/kit.ts";
  import { kitStorage } from "../lib/storage.ts";

  let { host }: { host: ConnectedModule } = $props();

  const storage = $derived(kitStorage(host.storage));

  let tasks = $state<Task[]>([]);
  let categories = $state<Category[]>([]);
  let loaded = $state(false);
  let error = $state("");

  let urgent = $derived(tasks.filter((task) => task.priority === "urgent" && !task.done));
  let todo = $derived(tasks.filter((task) => !task.done).length);

  async function refresh() {
    try {
      ({ tasks, categories } = await storage.read("tasks", "categories"));
      loaded = true;
      error = "";
    } catch {
      error = t("widget_error");
    }
  }

  /** Reads the tasks again before writing them, so that a change made in the View meanwhile is kept. */
  async function check(id: number) {
    try {
      const latest = (await storage.read("tasks")).tasks;
      const task = latest.find((task) => task.id === id);
      if (task) task.done = true;
      await storage.write({ tasks: latest });
      tasks = latest;
    } catch (failure) {
      error = (failure as Error).message;
    }
  }

  onMount(() => {
    void refresh();
    // The View may have changed the kit while the Widget was hidden behind it.
    return host.onVisibilityChange((visible) => visible && void refresh());
  });
</script>

<div class="widget">
  <header>
    <h1>{t("title")}</h1>
    <button type="button" class="open" onclick={() => host.openView()}>{t("widget_open")} ↗</button>
  </header>

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}

  {#if loaded}
    <p class="counts">
      <button type="button" class="urgent-count" onclick={() => host.openView({ filter: "urgent" })}>{t("widget_urgent", { count: urgent.length })}</button>
      <span>{t("widget_todo", { count: todo })}</span>
    </p>

    <ul class="tasks" aria-label={t("priority_urgent")}>
      {#each urgent as task (task.id)}
        <li class="sk-task--urgent">
          <button type="button" class="sk-check" role="checkbox" aria-checked="false" aria-label={task.text} onclick={() => check(task.id)}></button>
          <span>{task.text}</span>
        </li>
      {:else}
        <li class="none">{t("widget_no_urgent")}</li>
      {/each}
    </ul>

    <div class="links">
      {#each categories as category, index (index)}
        <section class="color-{category.color}" aria-label={category.title}>
          <h2>{category.title}</h2>
          <ul>
            {#each category.links as link}
              <li><a href={link.url} target="_blank" rel="noopener noreferrer">{link.name}</a></li>
            {/each}
          </ul>
        </section>
      {:else}
        <p class="none">{t("links_empty")}</p>
      {/each}
    </div>
  {/if}
</div>

<style>
  /* The Widget fills its cell and never scrolls (CONVENTION.md §7.1): what does not fit is cut off. */
  .widget {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100vh;
    padding: 12px 14px;
    overflow: hidden;
    font-size: 12px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  h1 {
    flex: 1;
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  button {
    font: inherit;
    cursor: pointer;
  }
  .open,
  .urgent-count {
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 2px 10px;
    background: var(--panel-soft);
    color: var(--accent-strong);
    font-size: 11px;
    white-space: nowrap;
  }
  .open:hover,
  .urgent-count:hover {
    border-color: var(--accent);
  }
  .counts {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: var(--muted);
  }
  .urgent-count {
    color: var(--red);
  }
  .error {
    margin: 0;
    color: var(--red);
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .tasks {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 0 1 auto;
    min-height: 0;
    max-height: 45%;
    overflow: hidden;
  }
  .tasks li:not(.none) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    border: 1px solid var(--sk-border);
    border-radius: 8px;
    background: var(--sk-bg);
    color: var(--sk-color);
  }
  .tasks li span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sk-check {
    width: 14px;
    height: 14px;
  }
  .none {
    margin: 0;
    color: var(--muted);
    font-style: italic;
  }
  .links {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-top: 1px solid var(--line);
    padding-top: 8px;
  }
  .links h2 {
    margin: 0 0 2px;
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-ink);
  }
  .links ul {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .links a {
    display: inline-block;
    max-width: 100%;
    padding: 1px 8px;
    border-radius: 999px;
    background: var(--color-soft);
    color: var(--ink);
    text-decoration: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .links a:hover {
    text-decoration: underline;
  }
</style>

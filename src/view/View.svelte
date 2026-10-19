<script lang="ts">
  import { t } from "../lib/i18n.ts";
  import { readKit, type Kit } from "../lib/kit.ts";
  import { load, replaceKit, status } from "../lib/store.svelte.ts";
  import LinksPanel from "./LinksPanel.svelte";
  import Modal from "./Modal.svelte";
  import NotesPanel from "./NotesPanel.svelte";
  import TasksPanel from "./TasksPanel.svelte";

  // ── Confirmation dialog, shared by every deletion and by the import ──
  let confirmation = $state<{ title: string; message: string; label: string; resolve: (ok: boolean) => void } | null>(null);

  function ask(title: string, message: string, label = t("delete")): Promise<boolean> {
    return new Promise((resolve) => (confirmation = { title, message, label, resolve }));
  }
  function answer(ok: boolean) {
    confirmation?.resolve(ok);
    confirmation = null;
  }
  const confirmDelete = (title: string, message: string) => ask(title, message);

  // ── Import of a .survival-kit.json ──
  let fileInput = $state<HTMLInputElement>();
  let importError = $state("");

  async function importFile() {
    const file = fileInput?.files?.[0];
    if (!file || !fileInput) return;
    fileInput.value = "";
    importError = "";
    let imported: Kit;
    try {
      imported = readKit(await file.text());
    } catch {
      importError = t("import_invalid", { file: file.name });
      return;
    }
    const message = t("import_msg", { tasks: imported.tasks.length, notes: imported.notes.length, categories: imported.links.length });
    if (await ask(t("import_title"), message, t("import_confirm"))) await replaceKit(imported);
  }
</script>

<div class="sk-root">
  <header class="sk-topbar">
    <div class="sk-heading">
      <h1>{t("title")}</h1>
      <p>{t("subtitle")}</p>
    </div>
    <button type="button" class="sk-tool" disabled={!status.loaded} onclick={() => fileInput?.click()}>{t("import_btn")}</button>
    <input bind:this={fileInput} type="file" accept=".json,application/json" hidden onchange={importFile} />
  </header>

  {#if status.saveError}
    <p class="sk-banner" role="alert">
      <span>{status.saveError}</span>
      <button type="button" class="sk-tool" onclick={() => (status.saveError = "")}>{t("dismiss")}</button>
    </p>
  {/if}
  {#if importError}
    <p class="sk-banner" role="alert">
      <span>{importError}</span>
      <button type="button" class="sk-tool" onclick={() => (importError = "")}>{t("dismiss")}</button>
    </p>
  {/if}

  {#if status.loadError}
    <div class="sk-blocked" role="alert">
      <p>{status.loadError}</p>
      <button type="button" class="sk-tool sk-tool--add" onclick={load}>{t("load_retry")}</button>
    </div>
  {:else if !status.loaded}
    <p class="sk-loading">{t("loading")}</p>
  {:else}
    <main class="sk-grid">
      <section class="sk-col" aria-label={t("tasks_title")}><div class="sk-inner"><TasksPanel {confirmDelete} /></div></section>
      <section class="sk-col" aria-label={t("notes_title")}><div class="sk-inner"><NotesPanel {confirmDelete} /></div></section>
      <section class="sk-col" aria-label={t("links_title")}><div class="sk-inner"><LinksPanel {confirmDelete} /></div></section>
    </main>
  {/if}
</div>

<Modal
  open={confirmation !== null}
  title={confirmation?.title}
  confirmLabel={confirmation?.label}
  danger
  onConfirm={() => answer(true)}
  onClose={() => answer(false)}
>
  <p>{confirmation?.message}</p>
</Modal>

<style>
  .sk-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg);
    color: var(--ink);
  }
  .sk-topbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 24px;
    border-bottom: 1px solid var(--line);
  }
  .sk-heading {
    flex: 1;
    min-width: 0;
  }
  .sk-heading h1 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
  }
  .sk-heading p {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--muted);
  }
  .sk-banner,
  .sk-blocked {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 12px 24px 0;
    padding: 10px 14px;
    border: 1px solid var(--red);
    border-radius: 10px;
    background: var(--red-soft);
    font-size: 13px;
  }
  .sk-banner span {
    flex: 1;
  }
  .sk-blocked {
    flex-direction: column;
    align-items: flex-start;
  }
  .sk-blocked p {
    margin: 0;
  }
  .sk-loading {
    text-align: center;
    color: var(--muted);
    padding: 48px 0;
    font-size: 14px;
  }

  /* Wide screens: three full-height columns split by hairlines. */
  .sk-grid {
    flex: 1;
    display: flex;
    min-height: 0;
  }
  .sk-col {
    flex: 1 1 0;
    min-width: 0;
    overflow-y: auto;
    padding: 28px 36px 80px;
    border-right: 1px solid var(--line);
  }
  .sk-col:last-child {
    border-right: none;
  }
  .sk-inner {
    max-width: 520px;
    margin: 0 auto;
  }

  /* Narrow screens: stacked cards, in the order tasks, notes, links. */
  @media (max-width: 1024px) {
    .sk-grid {
      flex-direction: column;
      overflow-y: auto;
      gap: 16px;
      padding: 16px;
    }
    .sk-col {
      flex: none;
      width: 100%;
      max-width: 720px;
      margin: 0 auto;
      overflow: visible;
      padding: 20px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--panel);
    }
    .sk-col:last-child {
      border-right: 1px solid var(--line);
    }
    .sk-topbar {
      padding: 12px 16px;
    }
    .sk-banner,
    .sk-blocked {
      margin: 12px 16px 0;
    }
  }
</style>

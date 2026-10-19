<script lang="ts">
  import { copyCode, type CopyOutcome } from "../lib/clipboard.ts";
  import { colorLabel, t } from "../lib/i18n.ts";
  import { blocToText, buildBloc, THEMES, type BlocType, type Theme } from "../lib/kit.ts";
  import { kit, save } from "../lib/store.svelte.ts";
  import Modal from "./Modal.svelte";

  let { confirmDelete }: { confirmDelete: (title: string, message: string) => Promise<boolean> } = $props();

  const BLOC_TYPES: BlocType[] = ["b", "p", "pre", "ul", "table"];

  let editMode = $state(false);
  let expanded = $state<Record<number, boolean>>({});
  /** The Code block whose copy button tells what happened, keyed `<note id>-<block index>`. */
  let copy = $state<{ key: string; outcome: CopyOutcome } | null>(null);

  // ── Note modal ──
  let noteOpen = $state(false);
  let noteId = $state<number | null>(null); // null = adding
  let noteTitre = $state("");
  let noteTheme = $state<Theme>("t-green");

  // ── Bloc modal ──
  let blocOpen = $state(false);
  let blocNoteId = $state(0);
  let blocIdx = $state(-1); // -1 = adding
  let blocType = $state<BlocType>("p");
  let blocContent = $state("");

  const noteOf = (id: number) => kit.notes.find((note) => note.id === id);

  let allExpanded = $derived(kit.notes.length > 0 && kit.notes.every((note) => expanded[note.id]));

  function toggleAll() {
    expanded = allExpanded ? {} : Object.fromEntries(kit.notes.map((note) => [note.id, true]));
  }

  // ── Note CRUD ──
  function openAddNote() {
    noteId = null;
    noteTitre = "";
    noteTheme = "t-green";
    noteOpen = true;
  }
  function openEditNote(id: number) {
    const note = noteOf(id);
    if (!note) return;
    noteId = id;
    noteTitre = note.titre;
    noteTheme = note.theme;
    noteOpen = true;
  }
  function confirmNote() {
    const titre = noteTitre.trim();
    if (!titre) return;
    if (noteId === null) {
      const id = Date.now();
      kit.notes.push({ id, theme: noteTheme, titre, blocs: [] });
      expanded[id] = true;
    } else {
      const note = noteOf(noteId);
      if (note) Object.assign(note, { titre, theme: noteTheme });
    }
    noteOpen = false;
    void save("notes");
  }
  async function deleteNote(id: number) {
    if (!(await confirmDelete(t("confirm_del_note_title"), t("confirm_del_note_msg")))) return;
    kit.notes = kit.notes.filter((note) => note.id !== id);
    void save("notes");
  }

  // ── Bloc CRUD ──
  function openAddBloc(noteId: number) {
    blocNoteId = noteId;
    blocIdx = -1;
    blocType = "p";
    blocContent = "";
    blocOpen = true;
  }
  function openEditBloc(noteId: number, index: number) {
    const bloc = noteOf(noteId)?.blocs[index];
    if (!bloc) return;
    blocNoteId = noteId;
    blocIdx = index;
    blocType = bloc.type;
    blocContent = blocToText(bloc);
    blocOpen = true;
  }
  function confirmBloc() {
    const bloc = buildBloc(blocType, blocContent);
    const note = noteOf(blocNoteId);
    if (!bloc || !note) return;
    if (blocIdx === -1) note.blocs.push(bloc);
    else note.blocs[blocIdx] = bloc;
    blocOpen = false;
    void save("notes");
  }
  async function deleteBloc(noteId: number, index: number) {
    if (!(await confirmDelete(t("confirm_del_bloc_title"), t("irreversible")))) return;
    noteOf(noteId)?.blocs.splice(index, 1);
    void save("notes");
  }

  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  async function copyPre(event: MouseEvent, content: string, key: string) {
    const pre = (event.currentTarget as HTMLElement).parentElement!.querySelector("pre")!;
    const outcome = await copyCode(content, pre);
    copy = { key, outcome };
    clearTimeout(copyTimer);
    if (outcome === "copied") copyTimer = setTimeout(() => (copy = null), 1500);
  }

  let blocPlaceholder = $derived(t(`bloc_placeholder_${blocType}`));
</script>

<div class="sk-panel-head">
  <h2 class="sk-panel-title">{t("notes_title")}<span class="sk-accent">.</span></h2>
  <p class="sk-panel-sub">{t("notes_subtitle")}</p>
</div>

<div class="sk-toolbar">
  <button type="button" class="sk-tool" onclick={() => (editMode = !editMode)}>
    {editMode ? t("read_mode") : t("edit_mode")}
  </button>
  <button type="button" class="sk-tool" onclick={toggleAll}>
    {allExpanded ? t("collapse_all") : t("expand_all")}
  </button>
  <button type="button" class="sk-tool sk-tool--add" onclick={openAddNote}>{t("notes_btn_add")}</button>
</div>

<div class="sk-cards" class:edit-mode={editMode}>
  {#each kit.notes as note (note.id)}
    {@const collapsed = !expanded[note.id]}
    <section class="sk-card {note.theme}" class:collapsed aria-label={note.titre}>
      <div class="sk-card-head">
        <h3>{note.titre}</h3>
        <div class="sk-edit-only">
          <button type="button" class="sk-mini" title={t("notes_edit_note")} aria-label={t("notes_edit_note")} onclick={() => openEditNote(note.id)}>✎</button>
          <button type="button" class="sk-mini sk-mini--del" title={t("notes_delete_note")} aria-label={t("notes_delete_note")} onclick={() => deleteNote(note.id)}
            >✕</button
          >
        </div>
        <button type="button" class="sk-toggle" aria-label={t("toggle")} aria-expanded={!collapsed} onclick={() => (expanded[note.id] = !expanded[note.id])}>
          <svg viewBox="0 0 10 6" width="10" height="6"
            ><path d="M1 1 L5 5 L9 1" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg
          >
        </button>
      </div>
      <div class="sk-card-body">
        {#each note.blocs as bloc, index}
          <div class="sk-bloc">
            <div class="sk-bloc-content">
              {#if bloc.type === "b"}
                <strong>{bloc.content}</strong>
              {:else if bloc.type === "p"}
                <p>{bloc.content}</p>
              {:else if bloc.type === "pre"}
                {@const key = `${note.id}-${index}`}
                <div class="sk-pre-wrap">
                  <pre>{bloc.content}</pre>
                  <button type="button" class="sk-copy" onclick={(event) => copyPre(event, bloc.content, key)}>
                    {copy?.key !== key ? t("notes_btn_copy") : copy.outcome === "copied" ? t("notes_btn_copied") : t("notes_btn_selected")}
                  </button>
                </div>
              {:else if bloc.type === "ul"}
                <ul>
                  {#each bloc.items as item}<li>{item}</li>{/each}
                </ul>
              {:else if bloc.type === "table"}
                <div class="sk-table-wrap">
                  <table>
                    <thead><tr>{#each bloc.headers as header}<th>{header}</th>{/each}</tr></thead>
                    <tbody>
                      {#each bloc.rows as row}<tr>{#each row as cell}<td>{cell}</td>{/each}</tr>{/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
            <div class="sk-edit-only">
              <button type="button" class="sk-mini" title={t("notes_edit_bloc")} aria-label={t("notes_edit_bloc")} onclick={() => openEditBloc(note.id, index)}>✎</button>
              <button
                type="button"
                class="sk-mini sk-mini--del"
                title={t("notes_delete_bloc")}
                aria-label={t("notes_delete_bloc")}
                onclick={() => deleteBloc(note.id, index)}>✕</button
              >
            </div>
          </div>
        {/each}
        <div class="sk-edit-only sk-note-foot">
          <button type="button" class="sk-add-bloc" onclick={() => openAddBloc(note.id)}>{t("notes_btn_add_bloc")}</button>
        </div>
      </div>
    </section>
  {:else}
    <p class="sk-empty">{t("notes_empty")}</p>
  {/each}
</div>

<Modal
  open={noteOpen}
  title={noteId === null ? t("modal_note_title") : t("notes_edit_note")}
  confirmLabel={noteId === null ? t("create") : t("save")}
  onConfirm={confirmNote}
  onClose={() => (noteOpen = false)}
>
  <label for="sk-note-titre">{t("modal_note_label_title")}</label>
  <input
    id="sk-note-titre"
    type="text"
    bind:value={noteTitre}
    placeholder={t("modal_note_placeholder")}
    onkeydown={(event) => event.key === "Enter" && confirmNote()}
  />
  <label for="sk-note-color">{t("label_color")}</label>
  <select id="sk-note-color" bind:value={noteTheme}>
    {#each THEMES as theme}
      <option value={theme}>{colorLabel(theme)}</option>
    {/each}
  </select>
</Modal>

<Modal open={blocOpen} title={blocIdx === -1 ? t("modal_bloc_new") : t("notes_edit_bloc")} onConfirm={confirmBloc} onClose={() => (blocOpen = false)}>
  <label for="sk-bloc-type">{t("modal_bloc_label_type")}</label>
  <select id="sk-bloc-type" bind:value={blocType}>
    {#each BLOC_TYPES as type}
      <option value={type}>{t(`bloc_type_${type}`)}</option>
    {/each}
  </select>
  <label for="sk-bloc-content">{t("modal_bloc_label_content")}</label>
  {#if blocType === "b"}
    <input
      id="sk-bloc-content"
      type="text"
      bind:value={blocContent}
      placeholder={blocPlaceholder}
      onkeydown={(event) => event.key === "Enter" && confirmBloc()}
    />
  {:else}
    <textarea id="sk-bloc-content" rows="6" bind:value={blocContent} placeholder={blocPlaceholder}></textarea>
  {/if}
</Modal>

<style>
  .sk-bloc {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .sk-bloc-content {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: var(--ink);
  }
  .sk-bloc-content p {
    margin: 6px 0;
    white-space: pre-wrap;
  }
  .sk-bloc-content strong {
    display: block;
    margin: 10px 0 4px;
  }
  .sk-bloc-content ul {
    margin: 6px 0;
    padding-left: 18px;
  }
  .sk-bloc-content li {
    margin: 2px 0;
  }
  .sk-pre-wrap {
    position: relative;
    margin: 6px 0;
  }
  .sk-pre-wrap pre {
    margin: 0;
    padding: 10px 12px;
    padding-right: 64px;
    background: var(--panel-soft);
    border: 1px solid var(--line);
    border-radius: 8px;
    font-size: 12px;
    font-family: var(--mono);
    overflow-x: auto;
    white-space: pre;
  }
  .sk-copy {
    position: absolute;
    top: 6px;
    right: 6px;
    font-size: 10px;
    padding: 2px 8px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--panel);
    color: var(--muted);
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .sk-copy:hover {
    border-color: var(--accent);
    color: var(--accent-strong);
  }
  .sk-table-wrap {
    overflow-x: auto;
    margin: 6px 0;
  }
  .sk-table-wrap table {
    border-collapse: collapse;
    width: 100%;
    font-size: 12px;
  }
  .sk-table-wrap th,
  .sk-table-wrap td {
    border: 1px solid var(--line);
    padding: 5px 8px;
    text-align: left;
  }
  .sk-table-wrap th {
    background: var(--panel-soft);
    font-weight: 600;
  }
  .sk-note-foot {
    margin-top: 8px;
  }
  .sk-add-bloc {
    font-size: 11px;
    padding: 5px 11px;
    border: 1px dashed var(--line-strong);
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-family: inherit;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .sk-add-bloc:hover {
    border-color: var(--accent);
    color: var(--accent-strong);
  }
</style>

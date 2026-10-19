<script lang="ts">
  import { ask } from "../lib/confirmation.svelte.ts";
  import { colorLabel, t } from "../lib/i18n.ts";
  import { BLOCK_TYPES, blockToText, buildBlock, COLORS, newId, type BlockType, type Color } from "../lib/kit.ts";
  import { kit, save } from "../lib/store.svelte.ts";
  import Card from "./Card.svelte";
  import CardsToolbar from "./CardsToolbar.svelte";
  import Modal from "./Modal.svelte";
  import NoteBlock from "./NoteBlock.svelte";
  import PanelHead from "./PanelHead.svelte";

  let editMode = $state(false);
  let expanded = $state<Record<number, boolean>>({});
  let allExpanded = $derived(kit.notes.length > 0 && kit.notes.every((note) => expanded[note.id]));

  /** The note being added (`id: null`) or edited; null when its dialog is closed. */
  let noteDraft = $state<{ id: number | null; title: string; color: Color } | null>(null);
  /** The block being added (`index: null`) or edited in a note; null when its dialog is closed. */
  let blockDraft = $state<{ noteId: number; index: number | null; type: BlockType; content: string } | null>(null);

  const noteOf = (id: number) => kit.notes.find((note) => note.id === id);

  function toggleAll() {
    expanded = allExpanded ? {} : Object.fromEntries(kit.notes.map((note) => [note.id, true]));
  }

  function confirmNote() {
    if (!noteDraft) return;
    const title = noteDraft.title.trim();
    if (!title) return;
    if (noteDraft.id === null) {
      const id = newId(kit.notes);
      kit.notes.push({ id, color: noteDraft.color, title, blocks: [] });
      expanded[id] = true;
    } else {
      const note = noteOf(noteDraft.id);
      if (note) Object.assign(note, { title, color: noteDraft.color });
    }
    noteDraft = null;
    void save("notes");
  }

  async function deleteNote(id: number) {
    if (!(await ask(t("confirm_del_note_title"), t("confirm_del_note_msg")))) return;
    kit.notes = kit.notes.filter((note) => note.id !== id);
    void save("notes");
  }

  function editBlock(noteId: number, index: number) {
    const block = noteOf(noteId)?.blocks[index];
    if (block) blockDraft = { noteId, index, type: block.type, content: blockToText(block) };
  }

  function confirmBlock() {
    if (!blockDraft) return;
    const block = buildBlock(blockDraft.type, blockDraft.content);
    const note = noteOf(blockDraft.noteId);
    if (!block || !note) return;
    if (blockDraft.index === null) note.blocks.push(block);
    else note.blocks[blockDraft.index] = block;
    blockDraft = null;
    void save("notes");
  }

  async function deleteBlock(noteId: number, index: number) {
    if (!(await ask(t("confirm_del_bloc_title"), t("irreversible")))) return;
    noteOf(noteId)?.blocks.splice(index, 1);
    void save("notes");
  }
</script>

<PanelHead title={t("notes_title")} subtitle={t("notes_subtitle")} />

<CardsToolbar
  bind:editMode
  {allExpanded}
  onToggleAll={toggleAll}
  addLabel={t("notes_btn_add")}
  onAdd={() => (noteDraft = { id: null, title: "", color: "green" })}
/>

<div class="sk-cards" class:edit-mode={editMode}>
  {#each kit.notes as note (note.id)}
    <Card title={note.title} color={note.color} expanded={!!expanded[note.id]} onToggle={() => (expanded[note.id] = !expanded[note.id])}>
      {#snippet actions()}
        <button
          type="button"
          class="sk-mini"
          title={t("notes_edit_note")}
          aria-label={t("notes_edit_note")}
          onclick={() => (noteDraft = { id: note.id, title: note.title, color: note.color })}>✎</button
        >
        <button type="button" class="sk-mini sk-mini--del" title={t("notes_delete_note")} aria-label={t("notes_delete_note")} onclick={() => deleteNote(note.id)}
          >✕</button
        >
      {/snippet}
      {#each note.blocks as block, index}
        <div class="sk-block-row">
          <NoteBlock {block} />
          <div class="sk-edit-only">
            <button type="button" class="sk-mini" title={t("notes_edit_bloc")} aria-label={t("notes_edit_bloc")} onclick={() => editBlock(note.id, index)}
              >✎</button
            >
            <button
              type="button"
              class="sk-mini sk-mini--del"
              title={t("notes_delete_bloc")}
              aria-label={t("notes_delete_bloc")}
              onclick={() => deleteBlock(note.id, index)}>✕</button
            >
          </div>
        </div>
      {/each}
      <div class="sk-edit-only sk-note-foot">
        <button type="button" class="sk-add-block" onclick={() => (blockDraft = { noteId: note.id, index: null, type: "p", content: "" })}
          >{t("notes_btn_add_bloc")}</button
        >
      </div>
    </Card>
  {:else}
    <p class="sk-empty">{t("notes_empty")}</p>
  {/each}
</div>

<Modal
  open={noteDraft !== null}
  title={noteDraft?.id === null ? t("modal_note_title") : t("notes_edit_note")}
  confirmLabel={noteDraft?.id === null ? t("create") : t("save")}
  onConfirm={confirmNote}
  onClose={() => (noteDraft = null)}
>
  {#if noteDraft}
    <label for="sk-note-title">{t("modal_note_label_title")}</label>
    <input
      id="sk-note-title"
      type="text"
      bind:value={noteDraft.title}
      placeholder={t("modal_note_placeholder")}
      onkeydown={(event) => event.key === "Enter" && confirmNote()}
    />
    <label for="sk-note-color">{t("label_color")}</label>
    <select id="sk-note-color" bind:value={noteDraft.color}>
      {#each COLORS as color}
        <option value={color}>{colorLabel(color)}</option>
      {/each}
    </select>
  {/if}
</Modal>

<Modal
  open={blockDraft !== null}
  title={blockDraft?.index === null ? t("modal_bloc_new") : t("notes_edit_bloc")}
  onConfirm={confirmBlock}
  onClose={() => (blockDraft = null)}
>
  {#if blockDraft}
    <label for="sk-block-type">{t("modal_bloc_label_type")}</label>
    <select id="sk-block-type" bind:value={blockDraft.type}>
      {#each BLOCK_TYPES as type}
        <option value={type}>{t(`bloc_type_${type}`)}</option>
      {/each}
    </select>
    <label for="sk-block-content">{t("modal_bloc_label_content")}</label>
    {#if blockDraft.type === "b"}
      <input
        id="sk-block-content"
        type="text"
        bind:value={blockDraft.content}
        placeholder={t("bloc_placeholder_b")}
        onkeydown={(event) => event.key === "Enter" && confirmBlock()}
      />
    {:else}
      <textarea id="sk-block-content" rows="6" bind:value={blockDraft.content} placeholder={t(`bloc_placeholder_${blockDraft.type}`)}></textarea>
    {/if}
  {/if}
</Modal>

<style>
  .sk-block-row {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .sk-note-foot {
    margin-top: 8px;
  }
  .sk-add-block {
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
  .sk-add-block:hover {
    border-color: var(--accent);
    color: var(--accent-strong);
  }
</style>

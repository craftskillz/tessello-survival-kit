<script lang="ts">
  import { colorLabel, t } from "../lib/i18n.ts";
  import { THEMES, withScheme, type Theme } from "../lib/kit.ts";
  import { kit, save } from "../lib/store.svelte.ts";
  import Modal from "./Modal.svelte";

  let { confirmDelete }: { confirmDelete: (title: string, message: string) => Promise<boolean> } = $props();

  let editMode = $state(false);
  // Keyed by category name, as in the original: categories with the same name expand together.
  let expanded = $state<Record<string, boolean>>({});

  // ── Category modal (add or edit) ──
  let catOpen = $state(false);
  let catIdx = $state(-1); // -1 = adding
  let catName = $state("");
  let catTheme = $state<Theme>("t-green");

  // ── Link modal (add or edit) ──
  let linkOpen = $state(false);
  let linkCatIdx = $state(-1);
  let linkIdx = $state(-1); // -1 = adding
  let linkNom = $state("");
  let linkDesc = $state("");
  let linkUrl = $state("");

  let allExpanded = $derived(kit.links.length > 0 && kit.links.every((category) => expanded[category.titre]));

  function toggleAll() {
    expanded = allExpanded ? {} : Object.fromEntries(kit.links.map((category) => [category.titre, true]));
  }

  // ── Category CRUD ──
  function openAddCat() {
    catIdx = -1;
    catName = "";
    catTheme = "t-green";
    catOpen = true;
  }
  function openEditCat(index: number) {
    catIdx = index;
    catName = kit.links[index].titre;
    catTheme = kit.links[index].theme;
    catOpen = true;
  }
  function confirmCat() {
    const titre = catName.trim();
    if (!titre) return;
    if (catIdx === -1) {
      kit.links.push({ theme: catTheme, titre, liens: [] });
    } else {
      const category = kit.links[catIdx];
      if (expanded[category.titre]) expanded[titre] = true;
      Object.assign(category, { titre, theme: catTheme });
    }
    catOpen = false;
    void save("links");
  }
  async function deleteCat(index: number) {
    if (!(await confirmDelete(t("confirm_del_cat_title"), t("confirm_del_cat_msg")))) return;
    kit.links.splice(index, 1);
    void save("links");
  }

  // ── Link CRUD ──
  function openAddLink(categoryIdx: number) {
    linkCatIdx = categoryIdx;
    linkIdx = -1;
    linkNom = linkDesc = linkUrl = "";
    linkOpen = true;
  }
  function openEditLink(event: Event, categoryIdx: number, index: number) {
    event.preventDefault();
    const link = kit.links[categoryIdx].liens[index];
    linkCatIdx = categoryIdx;
    linkIdx = index;
    linkNom = link.nom;
    linkDesc = link.desc;
    linkUrl = link.url;
    linkOpen = true;
  }
  function confirmLink() {
    const nom = linkNom.trim();
    const url = linkUrl.trim();
    const category = kit.links[linkCatIdx];
    if (!nom || !url || !category) return;
    const link = { nom, desc: linkDesc.trim(), url: withScheme(url) };
    if (linkIdx === -1) category.liens.push(link);
    else category.liens[linkIdx] = link;
    linkOpen = false;
    void save("links");
  }
  async function deleteLink(event: Event, categoryIdx: number, index: number) {
    event.preventDefault();
    if (!(await confirmDelete(t("confirm_del_link_title"), t("irreversible")))) return;
    kit.links[categoryIdx].liens.splice(index, 1);
    void save("links");
  }
</script>

<div class="sk-panel-head">
  <h2 class="sk-panel-title">{t("links_title")}<span class="sk-accent">.</span></h2>
  <p class="sk-panel-sub">{t("links_subtitle")}</p>
</div>

<div class="sk-toolbar">
  <button type="button" class="sk-tool" onclick={() => (editMode = !editMode)}>
    {editMode ? t("read_mode") : t("edit_mode")}
  </button>
  <button type="button" class="sk-tool" onclick={toggleAll}>
    {allExpanded ? t("collapse_all") : t("expand_all")}
  </button>
  <button type="button" class="sk-tool sk-tool--add" onclick={openAddCat}>{t("links_btn_add_cat")}</button>
</div>

<div class="sk-cards" class:edit-mode={editMode}>
  {#each kit.links as category, index (index)}
    {@const collapsed = !expanded[category.titre]}
    <section class="sk-card {category.theme}" class:collapsed aria-label={category.titre}>
      <div class="sk-card-head">
        <h3>{category.titre}</h3>
        <div class="sk-edit-only">
          <button type="button" class="sk-mini" title={t("links_add_link_title")} aria-label={t("links_add_link_title")} onclick={() => openAddLink(index)}
            >＋</button
          >
          <button type="button" class="sk-mini" title={t("links_edit_cat_title")} aria-label={t("links_edit_cat_title")} onclick={() => openEditCat(index)}
            >✎</button
          >
          <button
            type="button"
            class="sk-mini sk-mini--del"
            title={t("links_del_cat_title")}
            aria-label={t("links_del_cat_title")}
            onclick={() => deleteCat(index)}>✕</button
          >
        </div>
        <button
          type="button"
          class="sk-toggle"
          aria-label={t("toggle")}
          aria-expanded={!collapsed}
          onclick={() => (expanded[category.titre] = !expanded[category.titre])}
        >
          <svg viewBox="0 0 10 6" width="10" height="6"
            ><path d="M1 1 L5 5 L9 1" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg
          >
        </button>
      </div>
      <div class="sk-card-body sk-links">
        {#each category.liens as link, linkIndex}
          <a href={withScheme(link.url)} target="_blank" rel="noopener noreferrer" class="sk-link">
            <span class="sk-link-text">
              <span class="sk-link-name">{link.nom}</span>{#if link.desc}<span class="sk-link-desc">{` — ${link.desc}`}</span>{/if}
            </span>
            <span class="sk-arrow" aria-hidden="true">↗</span>
            <span class="sk-edit-only">
              <button
                type="button"
                class="sk-mini"
                title={t("links_edit_link_title")}
                aria-label={t("links_edit_link_title")}
                onclick={(event) => openEditLink(event, index, linkIndex)}>✎</button
              >
              <button
                type="button"
                class="sk-mini sk-mini--del"
                title={t("links_del_link_title")}
                aria-label={t("links_del_link_title")}
                onclick={(event) => deleteLink(event, index, linkIndex)}>✕</button
              >
            </span>
          </a>
        {/each}
      </div>
    </section>
  {:else}
    <p class="sk-empty">{t("links_empty")}</p>
  {/each}
</div>

<Modal
  open={catOpen}
  title={catIdx === -1 ? t("modal_cat_title") : t("links_edit_cat_title")}
  confirmLabel={catIdx === -1 ? t("add") : t("save")}
  onConfirm={confirmCat}
  onClose={() => (catOpen = false)}
>
  <label for="sk-cat-name">{t("modal_cat_label_name")}</label>
  <input
    id="sk-cat-name"
    type="text"
    bind:value={catName}
    placeholder={t("modal_cat_placeholder_name")}
    onkeydown={(event) => event.key === "Enter" && confirmCat()}
  />
  <label for="sk-cat-color">{t("label_color")}</label>
  <select id="sk-cat-color" bind:value={catTheme}>
    {#each THEMES as theme}
      <option value={theme}>{colorLabel(theme)}</option>
    {/each}
  </select>
</Modal>

<Modal
  open={linkOpen}
  title={linkIdx === -1 ? t("modal_link_title") : t("links_edit_link_title")}
  confirmLabel={linkIdx === -1 ? t("add") : t("save")}
  onConfirm={confirmLink}
  onClose={() => (linkOpen = false)}
>
  <label for="sk-link-nom">{t("modal_link_label_name")}</label>
  <input id="sk-link-nom" type="text" bind:value={linkNom} placeholder={t("modal_link_placeholder_name")} />
  <label for="sk-link-desc">{t("modal_link_label_desc")}</label>
  <input id="sk-link-desc" type="text" bind:value={linkDesc} placeholder={t("modal_link_placeholder_desc")} />
  <label for="sk-link-url">{t("modal_link_label_url")}</label>
  <input id="sk-link-url" type="text" bind:value={linkUrl} placeholder="https://…" onkeydown={(event) => event.key === "Enter" && confirmLink()} />
</Modal>

<style>
  .sk-links {
    display: flex;
    flex-direction: column;
    padding: 0;
  }
  .sk-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
    text-decoration: none;
    border-bottom: 1px solid var(--line);
    color: var(--ink);
  }
  .sk-link:last-child {
    border-bottom: none;
  }
  .sk-link:hover {
    background: var(--panel-soft);
  }
  .sk-link-text {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sk-link-name {
    font-weight: 500;
  }
  .sk-link-desc,
  .sk-arrow {
    color: var(--muted);
  }
  .sk-arrow {
    font-size: 12px;
    flex-shrink: 0;
  }
</style>

<script lang="ts">
  import { ask } from "../lib/confirmation.svelte.ts";
  import { colorLabel, t } from "../lib/i18n.ts";
  import { COLORS, withScheme, type Color } from "../lib/kit.ts";
  import { kit, save } from "../lib/store.svelte.ts";
  import Card from "./Card.svelte";
  import CardsToolbar from "./CardsToolbar.svelte";
  import Modal from "./Modal.svelte";
  import PanelHead from "./PanelHead.svelte";

  let editMode = $state(false);
  // Keyed by category title, as in the original: categories with the same title expand together.
  let expanded = $state<Record<string, boolean>>({});
  let allExpanded = $derived(kit.categories.length > 0 && kit.categories.every((category) => expanded[category.title]));

  /** The category being added (`index: null`) or edited; null when its dialog is closed. */
  let categoryDraft = $state<{ index: number | null; title: string; color: Color } | null>(null);
  /** The link being added (`index: null`) or edited in a category; null when its dialog is closed. */
  let linkDraft = $state<{ categoryIndex: number; index: number | null; name: string; description: string; url: string } | null>(null);

  function toggleAll() {
    expanded = allExpanded ? {} : Object.fromEntries(kit.categories.map((category) => [category.title, true]));
  }

  function confirmCategory() {
    if (!categoryDraft) return;
    const title = categoryDraft.title.trim();
    if (!title) return;
    if (categoryDraft.index === null) {
      kit.categories.push({ color: categoryDraft.color, title, links: [] });
    } else {
      const category = kit.categories[categoryDraft.index];
      if (expanded[category.title]) expanded[title] = true;
      Object.assign(category, { title, color: categoryDraft.color });
    }
    categoryDraft = null;
    void save("categories");
  }

  async function deleteCategory(index: number) {
    if (!(await ask(t("confirm_del_cat_title"), t("confirm_del_cat_msg")))) return;
    kit.categories.splice(index, 1);
    void save("categories");
  }

  /** The buttons of a link row sit inside its <a>: a click on them must not open the link. */
  function editLink(event: Event, categoryIndex: number, index: number) {
    event.preventDefault();
    const { name, description, url } = kit.categories[categoryIndex].links[index];
    linkDraft = { categoryIndex, index, name, description, url };
  }

  function confirmLink() {
    if (!linkDraft) return;
    const name = linkDraft.name.trim();
    const url = linkDraft.url.trim();
    const category = kit.categories[linkDraft.categoryIndex];
    if (!name || !url || !category) return;
    const link = { name, description: linkDraft.description.trim(), url: withScheme(url) };
    if (linkDraft.index === null) category.links.push(link);
    else category.links[linkDraft.index] = link;
    linkDraft = null;
    void save("categories");
  }

  async function deleteLink(event: Event, categoryIndex: number, index: number) {
    event.preventDefault();
    if (!(await ask(t("confirm_del_link_title"), t("irreversible")))) return;
    kit.categories[categoryIndex].links.splice(index, 1);
    void save("categories");
  }
</script>

<PanelHead title={t("links_title")} subtitle={t("links_subtitle")} />

<CardsToolbar
  bind:editMode
  {allExpanded}
  onToggleAll={toggleAll}
  addLabel={t("links_btn_add_cat")}
  onAdd={() => (categoryDraft = { index: null, title: "", color: "green" })}
/>

<div class="sk-cards" class:edit-mode={editMode}>
  {#each kit.categories as category, index (index)}
    <Card
      title={category.title}
      color={category.color}
      expanded={!!expanded[category.title]}
      onToggle={() => (expanded[category.title] = !expanded[category.title])}
      flush
    >
      {#snippet actions()}
        <button
          type="button"
          class="sk-mini"
          title={t("links_add_link_title")}
          aria-label={t("links_add_link_title")}
          onclick={() => (linkDraft = { categoryIndex: index, index: null, name: "", description: "", url: "" })}>＋</button
        >
        <button
          type="button"
          class="sk-mini"
          title={t("links_edit_cat_title")}
          aria-label={t("links_edit_cat_title")}
          onclick={() => (categoryDraft = { index, title: category.title, color: category.color })}>✎</button
        >
        <button
          type="button"
          class="sk-mini sk-mini--del"
          title={t("links_del_cat_title")}
          aria-label={t("links_del_cat_title")}
          onclick={() => deleteCategory(index)}>✕</button
        >
      {/snippet}
      {#each category.links as link, linkIndex}
        <a href={link.url} target="_blank" rel="noopener noreferrer" class="sk-link">
          <span class="sk-link-text">
            <span class="sk-link-name">{link.name}</span>{#if link.description}<span class="sk-link-desc">{` — ${link.description}`}</span>{/if}
          </span>
          <span class="sk-arrow" aria-hidden="true">↗</span>
          <span class="sk-edit-only">
            <button
              type="button"
              class="sk-mini"
              title={t("links_edit_link_title")}
              aria-label={t("links_edit_link_title")}
              onclick={(event) => editLink(event, index, linkIndex)}>✎</button
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
    </Card>
  {:else}
    <p class="sk-empty">{t("links_empty")}</p>
  {/each}
</div>

<Modal
  open={categoryDraft !== null}
  title={categoryDraft?.index === null ? t("modal_cat_title") : t("links_edit_cat_title")}
  confirmLabel={categoryDraft?.index === null ? t("add") : t("save")}
  onConfirm={confirmCategory}
  onClose={() => (categoryDraft = null)}
>
  {#if categoryDraft}
    <label for="sk-category-title">{t("modal_cat_label_name")}</label>
    <input
      id="sk-category-title"
      type="text"
      bind:value={categoryDraft.title}
      placeholder={t("modal_cat_placeholder_name")}
      onkeydown={(event) => event.key === "Enter" && confirmCategory()}
    />
    <label for="sk-category-color">{t("label_color")}</label>
    <select id="sk-category-color" bind:value={categoryDraft.color}>
      {#each COLORS as color}
        <option value={color}>{colorLabel(color)}</option>
      {/each}
    </select>
  {/if}
</Modal>

<Modal
  open={linkDraft !== null}
  title={linkDraft?.index === null ? t("modal_link_title") : t("links_edit_link_title")}
  confirmLabel={linkDraft?.index === null ? t("add") : t("save")}
  onConfirm={confirmLink}
  onClose={() => (linkDraft = null)}
>
  {#if linkDraft}
    <label for="sk-link-name">{t("modal_link_label_name")}</label>
    <input id="sk-link-name" type="text" bind:value={linkDraft.name} placeholder={t("modal_link_placeholder_name")} />
    <label for="sk-link-description">{t("modal_link_label_desc")}</label>
    <input id="sk-link-description" type="text" bind:value={linkDraft.description} placeholder={t("modal_link_placeholder_desc")} />
    <label for="sk-link-url">{t("modal_link_label_url")}</label>
    <input
      id="sk-link-url"
      type="text"
      bind:value={linkDraft.url}
      placeholder="https://…"
      onkeydown={(event) => event.key === "Enter" && confirmLink()}
    />
  {/if}
</Modal>

<style>
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

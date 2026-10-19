<script lang="ts">
  // The toolbar of myNotes and myLinks: read or edit mode, expand or collapse every card, and add a card.
  import { t } from "../lib/i18n.ts";

  let {
    editMode = $bindable(),
    allExpanded,
    onToggleAll,
    addLabel,
    onAdd,
  }: { editMode: boolean; allExpanded: boolean; onToggleAll: () => void; addLabel: string; onAdd: () => void } = $props();
</script>

<div class="sk-toolbar">
  <button type="button" class="sk-tool" onclick={() => (editMode = !editMode)}>{editMode ? t("read_mode") : t("edit_mode")}</button>
  <button type="button" class="sk-tool" onclick={onToggleAll}>{allExpanded ? t("collapse_all") : t("expand_all")}</button>
  <button type="button" class="sk-tool sk-tool--add" onclick={onAdd}>{addLabel}</button>
</div>

<style>
  .sk-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
  }
</style>

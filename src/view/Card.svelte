<script lang="ts">
  // A note or a category: a colored card with its title, its edit-mode actions and a chevron that expands or collapses
  // its body. A `flush` body has no padding, for rows that run edge to edge.
  import type { Snippet } from "svelte";
  import { t } from "../lib/i18n.ts";
  import type { Color } from "../lib/kit.ts";

  let {
    title,
    color,
    expanded,
    onToggle,
    actions,
    children,
    flush = false,
  }: { title: string; color: Color; expanded: boolean; onToggle: () => void; actions: Snippet; children: Snippet; flush?: boolean } = $props();
</script>

<section class="sk-card color-{color}" class:collapsed={!expanded} aria-label={title}>
  <div class="sk-card-head">
    <h3>{title}</h3>
    <div class="sk-edit-only">{@render actions()}</div>
    <button type="button" class="sk-toggle" aria-label={t("toggle")} aria-expanded={expanded} onclick={onToggle}>
      <svg viewBox="0 0 10 6" width="10" height="6"
        ><path d="M1 1 L5 5 L9 1" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg
      >
    </button>
  </div>
  <div class="sk-card-body" class:flush>{@render children()}</div>
</section>

<style>
  .sk-card {
    border: 1px solid var(--line);
    border-radius: 12px;
    overflow: hidden;
    background: var(--panel);
  }
  .sk-card-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--color-soft);
    border-bottom: 1px solid var(--line);
  }
  .collapsed .sk-card-head {
    border-bottom: none;
  }
  h3 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-family: var(--mono);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-ink);
    overflow-wrap: anywhere;
  }
  .sk-card-body {
    padding: 12px 14px;
  }
  .sk-card-body.flush {
    padding: 0;
  }
  .collapsed .sk-card-body {
    display: none;
  }
  .sk-toggle {
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    display: flex;
    padding: 4px;
    transition: transform 0.15s;
  }
  .sk-card:not(.collapsed) .sk-toggle {
    transform: rotate(180deg);
  }
</style>

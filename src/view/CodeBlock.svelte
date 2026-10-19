<script lang="ts">
  // A Code block and its "copy" button, which says for a moment that the code was copied, or that it is selected for
  // the User to copy with the keyboard when the sandbox lets nothing copy it (lib/clipboard.ts).
  import { onDestroy } from "svelte";
  import { copyCode, type CopyOutcome } from "../lib/clipboard.ts";
  import { t, type MessageKey } from "../lib/i18n.ts";

  let { content }: { content: string } = $props();

  let pre = $state<HTMLElement>();
  let outcome = $state<CopyOutcome | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function copy() {
    clearTimeout(timer);
    outcome = await copyCode(content, pre!);
    if (outcome === "copied") timer = setTimeout(() => (outcome = null), 1500);
  }

  onDestroy(() => clearTimeout(timer));

  const LABELS: Record<CopyOutcome, MessageKey> = { copied: "notes_btn_copied", selected: "notes_btn_selected" };
</script>

<div class="sk-pre-wrap">
  <pre bind:this={pre}>{content}</pre>
  <button type="button" class="sk-copy" onclick={copy}>{t(outcome ? LABELS[outcome] : "notes_btn_copy")}</button>
</div>

<style>
  .sk-pre-wrap {
    position: relative;
    margin: 6px 0;
  }
  pre {
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
</style>

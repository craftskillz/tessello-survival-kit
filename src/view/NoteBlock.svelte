<script lang="ts">
  // One block of a note: a Heading, a Text, a Code, a Bullet list or a Table.
  import type { Block } from "../lib/kit.ts";
  import CodeBlock from "./CodeBlock.svelte";

  let { block }: { block: Block } = $props();
</script>

<div class="sk-block">
  {#if block.type === "b"}
    <strong>{block.content}</strong>
  {:else if block.type === "p"}
    <p>{block.content}</p>
  {:else if block.type === "pre"}
    <CodeBlock content={block.content} />
  {:else if block.type === "ul"}
    <ul>
      {#each block.items as item}<li>{item}</li>{/each}
    </ul>
  {:else if block.type === "table"}
    <div class="sk-table-wrap">
      <table>
        <thead><tr>{#each block.headers as header}<th>{header}</th>{/each}</tr></thead>
        <tbody>
          {#each block.rows as row}<tr>{#each row as cell}<td>{cell}</td>{/each}</tr>{/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .sk-block {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: var(--ink);
  }
  p {
    margin: 6px 0;
    white-space: pre-wrap;
  }
  strong {
    display: block;
    margin: 10px 0 4px;
  }
  ul {
    margin: 6px 0;
    padding-left: 18px;
  }
  li {
    margin: 2px 0;
  }
  .sk-table-wrap {
    overflow-x: auto;
    margin: 6px 0;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 12px;
  }
  th,
  td {
    border: 1px solid var(--line);
    padding: 5px 8px;
    text-align: left;
  }
  th {
    background: var(--panel-soft);
    font-weight: 600;
  }
</style>

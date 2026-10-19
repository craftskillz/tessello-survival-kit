<script lang="ts">
  // The title of a panel, ending with the orange dot of the original kit, and its subtitle.
  let { title, subtitle }: { title: string; subtitle: string } = $props();
</script>

<div class="sk-panel-head">
  <h2 class="sk-panel-title">{title}<span class="sk-accent">.</span></h2>
  <p class="sk-panel-sub">{subtitle}</p>
</div>

<style>
  .sk-panel-head {
    margin-bottom: 36px;
  }
  .sk-panel-title {
    margin: 0;
    font-size: 2.2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .sk-accent {
    color: #f97316;
  }
  .sk-panel-sub {
    margin: 8px 0 0;
    font-family: var(--mono);
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
  }
</style>

<script lang="ts">
  const deployedAt = new Date().toISOString();
</script>

<svelte:head>
  <title>SvelteKit on AWS Lambda</title>
</svelte:head>

<main>
  <h1>SvelteKit on AWS Lambda</h1>
  <p>
    This page is server-rendered by SvelteKit running in AWS Lambda, with static
    assets served from CloudFront CDN.
  </p>
  <p>Rendered at: <code>{deployedAt}</code></p>
  <p><a href="/api/hello">Try the API endpoint &rarr;</a></p>
</main>

<style>
  main {
    font-family: system-ui, sans-serif;
    max-width: 640px;
    margin: 2rem auto;
    padding: 0 1rem;
    color: #333;
  }
  h1 {
    color: #ff3e00;
  }
  code {
    background: #f3f4f6;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.9rem;
  }
</style>

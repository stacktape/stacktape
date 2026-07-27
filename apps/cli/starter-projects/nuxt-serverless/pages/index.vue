<script setup lang="ts">
const renderedAt = new Date().toISOString();
</script>

<template>
  <main>
    <h1>Nuxt on AWS Lambda</h1>
    <p>This page is server-rendered by Nuxt running in AWS Lambda, with static assets served from CloudFront CDN.</p>
    <p>
      Rendered at: <code>{{ renderedAt }}</code>
    </p>
    <p>
      <NuxtLink to="/api/hello">Try the API endpoint &rarr;</NuxtLink>
    </p>
  </main>
</template>

<style>
main {
  font-family: system-ui, sans-serif;
  max-width: 640px;
  margin: 2rem auto;
  padding: 0 1rem;
  color: #333;
}
h1 {
  color: #00dc82;
}
code {
  background: #f3f4f6;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.9rem;
}
</style>

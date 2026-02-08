<template>
  <div>
    <h1>Nuxt on Stacktape</h1>
    <p>Server-rendered at {{ timestamp }}</p>
  </div>
</template>

<script setup>
const timestamp = new Date().toISOString();
</script>

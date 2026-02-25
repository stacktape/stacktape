<template>
  <div>
    <h1>Nuxt short</h1>
    <p id="ts">{{ timestamp }}</p>
  </div>
</template>

<script setup>
const timestamp = new Date().toISOString();
</script>

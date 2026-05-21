<template>
  <NuxtLayout>
    <NuxtLoadingIndicator color="var(--p-primary-500)" :height="3" :duration="3000" />
    <NuxtPage />
    <Toast position="top-right" />
  </NuxtLayout>
</template>

<script setup lang="ts">
import Toast from 'primevue/toast';
</script>

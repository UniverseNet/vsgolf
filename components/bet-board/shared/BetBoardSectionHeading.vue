<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  value?: string
}>()
</script>

<template>
  <div class="section-heading">
    <div>
      <p class="section-heading__eyebrow">{{ eyebrow }}</p>
      <h2>{{ title }}</h2>
    </div>
    <output v-if="value" class="section-heading__value">{{ value }}</output>
    <slot name="actions" />
  </div>
</template>

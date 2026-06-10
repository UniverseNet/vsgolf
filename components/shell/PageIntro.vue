<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description?: string
}>()
</script>

<template>
  <header class="page-intro">
    <p v-if="eyebrow" class="page-intro__eyebrow">{{ eyebrow }}</p>
    <h2 class="page-intro__title">{{ title }}</h2>
    <p v-if="description" class="page-intro__description">{{ description }}</p>
    <slot />
  </header>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.page-intro {
  display: grid;
  gap: 8px;

  &__eyebrow {
    @include eyebrow-text;
  }

  &__title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  &__description {
    margin: 0;
    color: var(--muted);
    font-size: 0.92rem;
    font-weight: 500;
    line-height: 1.5;
  }
}
</style>

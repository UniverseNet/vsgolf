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

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.section-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.section-heading__eyebrow {
  @include eyebrow-text;
  color: var(--teal);
}

.section-heading h2 {
  margin: 0;
  font-size: 1.2rem;
  line-height: 1.2;
  font-weight: 800;
}

.section-heading__value {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.86);
  border-color: rgba(7, 137, 135, 0.22);
  background: linear-gradient(135deg, rgba(221, 246, 243, 0.95), rgba(255, 241, 213, 0.84));
  transform-origin: center;
}
</style>

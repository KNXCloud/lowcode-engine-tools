<template>
  <button :style="{ color }">
    <slot></slot>
  </button>
</template>

<script lang="ts" setup>
defineExpose<{ color: string }>();
</script>

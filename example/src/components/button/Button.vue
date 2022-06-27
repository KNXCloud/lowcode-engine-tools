<template>
  <div className="example">
    {{ title }}
    <n-button v-bind="$attrs">
      <slot></slot>
    </n-button>
  </div>
</template>

<script lang="ts" setup>
import { NButton } from 'naive-ui';
defineProps<{ title?: string }>();
</script>

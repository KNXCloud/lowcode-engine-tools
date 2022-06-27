<template>
  <div className="example">
    {{ title }}
    <n-input v-bind="$attrs" />
  </div>
</template>

<script lang="ts" setup>
import { NInput } from 'naive-ui';

defineProps<{ title: string }>();
</script>

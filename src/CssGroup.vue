<template>
  <transition-group
    tag="span"
    :name="name"
  >
    <slot />
  </transition-group>
</template>

<script setup lang="ts">
import { defineProps, toRefs } from 'vue-demi';

const props = defineProps({
  name: { type: String, required: true },
});

const { name } = toRefs(props);
</script>

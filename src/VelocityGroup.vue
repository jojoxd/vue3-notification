<template>
  <transition-group
    tag="span"
    :css="false"
    @enter="enter"
    @leave="leave"
    @after-leave="afterLeave"
  >
    <slot />
  </transition-group>
</template>

<script setup lang="ts">
import { defineEmit } from "vue-demi";

const emit = defineEmit(['afterLeave', 'leave', 'enter']);

const enter = (el: Element, complete: () => void) => emit('enter', { el, complete });

const leave = (el: Element, complete: () => void) => emit('leave', { el, complete });

const afterLeave = () => emit('afterLeave');
</script>

<script lang="ts" setup>
import { SwitchIcon } from 'vue-dark-switch'
</script>

<template>
  <nav
    aria-label="Site Nav"
    class="mx-auto max-w-3xl flex items-center justify-between p-4"
  >
    <span class="h-10 w-10 flex items-center justify-center">
      <SwitchIcon unmount-persets />
    </span>

    <ul class="flex items-center gap-2 text-sm font-medium" text="sm">
      <li class="hidden !block">
        <Dropdown />
      </li>
    </ul>
  </nav>
</template>

<style scoped></style>

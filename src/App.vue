<script lang="ts" setup>
import { NConfigProvider } from 'naive-ui'
import { naiveTheme } from 'vue-dark-switch'
</script>

<template>
  <NConfigProvider :theme="naiveTheme">
    <n-message-provider>
      <router-view />
    </n-message-provider>
    <n-global-style />
  </NConfigProvider>
</template>

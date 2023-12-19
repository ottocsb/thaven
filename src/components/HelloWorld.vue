<script lang="ts" setup>
defineProps<{ msg: string }>()
const { data, loading, run } = greet()
const { t } = useI18n()
const msgS = ref<string>('World!')

onMounted(() => {
  run(msgS.value)
})
</script>

<template>
  <div class="mt-10 flex flex-col items-center space-y-7">
    <n-input
      v-model:value="msgS"
      placeholder="Input your name"
    />
    <n-button
      :loading="loading"
      @click="run(msgS)"
    >
      sub
    </n-button>
    <p>{{ data }}{{ msg }}</p>
    <Counter />
    <p>
      {{ t('edit') }}
      <code>components/HelloWorld.vue</code> {{ t('to test HMR') }}
    </p>
  </div>
</template>

<style scoped>
@keyframes slide-up { from {transform: translateY(20px);opacity: 0;} to {transform: translateY(0);opacity: 1;} }
</style>

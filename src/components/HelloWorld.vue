<script lang="ts" setup>
const {data, error, loading, run} = greet()
defineProps<{ msg: string }>()

const {t} = useI18n()
const msg = ref('World!')

onMounted(() => {
  run(msg.value)
})
</script>

<template>
  <div class="mt-10 flex flex-col items-center space-y-7">
    <n-input v-model:value="msg" placeholder="Input your name"/>
    <n-button @click="run(msg)" :loading="loading" >{{ data }}</n-button>
    <Counter/>
    <p>
      {{ t('edit') }}
      <code>components/HelloWorld.vue</code> {{ t('to test HMR') }}
    </p>
  </div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
  font-size: 1.2rem;
  animation: slide-up 0.5s ease-out;
}

@keyframes slide-up {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>

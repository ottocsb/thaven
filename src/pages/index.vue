<script lang = "ts" setup>
import { useMessage } from 'naive-ui'
import type { Meta } from '~/plugins/type'

const { t } = useI18n()
const { data, error, runAsync } = search()
const message = useMessage()

const meta = ref<Meta>({
  lastPage: 0,
  currentPage: 0,
  sections: [],
})

async function getWap() {
  await runAsync()
  meta.value.lastPage = data.value.meta.last_page
  meta.value.currentPage = data.value.meta.current_page
  meta.value.sections.push(data.value.data)
  console.log('meta：', meta.value)
}

watchEffect(() => {
  if (error.value)
    message.error(t('error'))
})

onMounted(() => {
  getWap()
})
</script>

<template>
  <div mx="8" min-w="4xl">
    <Navigation />
    <div v-for="(item, index) in meta.sections" :key="index">
      {{ index }}
      <div flex-wrap flex text-center gap="6" content="center" w="90%" m="a" justify="center">
        <n-image v-for="(i, k) in item" :key="k" :width="300" :height="200" :src="i.thumbs.small" :preview-src="i.path" />
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>

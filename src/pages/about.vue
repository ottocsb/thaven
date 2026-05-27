<script lang="ts" setup>
import { getVersion } from '@tauri-apps/api/app'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useMessage } from 'naive-ui'
import { onMounted, ref } from 'vue'

const message = useMessage()
const version = ref('0.1.0')

const links = [
  { label: '项目仓库', url: 'https://github.com/ottocsb/thaven' },
  { label: 'Wallhaven API 文档', url: 'https://wallhaven.cc/help/api' },
]

async function openExternal(url: string) {
  try {
    await openUrl(url)
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : String(err || '打开链接失败'))
  }
}

onMounted(async () => {
  try {
    version.value = await getVersion()
  }
  catch {}
})
</script>

<template>
  <div class="about-page">
    <n-space vertical size="large">
      <n-card title="关于 thaven" size="small">
        <n-space vertical>
          <p class="description">
            thaven 是基于 Tauri 的 Wallhaven 壁纸工具，用于浏览在线壁纸、下载图片，并管理本地壁纸。
          </p>

          <n-descriptions bordered label-placement="left" :column="1" size="small">
            <n-descriptions-item label="当前版本">
              {{ version }}
            </n-descriptions-item>
            <n-descriptions-item label="许可证">
              MIT License
            </n-descriptions-item>
          </n-descriptions>
        </n-space>
      </n-card>

      <n-card title="相关链接" size="small">
        <n-space>
          <n-button
            v-for="link in links"
            :key="link.url"
            @click="openExternal(link.url)"
          >
            {{ link.label }}
          </n-button>
        </n-space>
      </n-card>
    </n-space>
  </div>
</template>

<style scoped>
.about-page {
  min-width: 720px;
  padding: 24px 24px 32px;
}

.description {
  line-height: 1.7;
  margin: 0;
}

@media (max-width: 900px) {
  .about-page {
    min-width: 0;
    padding: 12px 12px 24px;
  }
}
</style>

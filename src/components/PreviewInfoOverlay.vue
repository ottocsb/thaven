<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  alt?: string
  src: string
}>()

const loadProgress = ref(0)
const showInfoHint = ref(false)
const isInfoHovered = ref(false)
const imageOpacity = computed(() => loadProgress.value / 100)

let loadingTimer: ReturnType<typeof window.setInterval> | undefined
let hintTimer: ReturnType<typeof window.setTimeout> | undefined
let loadToken = 0

function clearLoadingTimer() {
  if (!loadingTimer)
    return

  window.clearInterval(loadingTimer)
  loadingTimer = undefined
}

function clearHintTimer() {
  if (!hintTimer)
    return

  window.clearTimeout(hintTimer)
  hintTimer = undefined
}

watch(
  () => props.src,
  (src) => {
    loadToken += 1
    const currentToken = loadToken

    clearLoadingTimer()
    clearHintTimer()
    loadProgress.value = 0
    showInfoHint.value = true
    isInfoHovered.value = false
    hintTimer = window.setTimeout(() => {
      if (currentToken !== loadToken)
        return

      showInfoHint.value = false
      isInfoHovered.value = false
      hintTimer = undefined
    }, 1000)

    if (!src)
      return

    const image = new Image()

    image.onload = () => {
      if (currentToken !== loadToken)
        return

      clearLoadingTimer()
      loadProgress.value = 100
    }

    image.onerror = () => {
      if (currentToken !== loadToken)
        return

      clearLoadingTimer()
      loadProgress.value = 100
    }

    image.src = src

    loadingTimer = window.setInterval(() => {
      if (currentToken !== loadToken) {
        clearLoadingTimer()
        return
      }

      if (loadProgress.value >= 90)
        return

      loadProgress.value += Math.max(1, Math.round((90 - loadProgress.value) * 0.12))
    }, 120)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  loadToken += 1
  clearLoadingTimer()
  clearHintTimer()
})

function showInfo() {
  if (showInfoHint.value)
    return

  isInfoHovered.value = true
}

function hideInfo() {
  isInfoHovered.value = false
}
</script>

<template>
  <div class="preview-content">
    <div class="preview-image-wrap">
      <n-image
        class="preview-image"
        object-fit="contain"
        :alt="alt"
        :preview-disabled="true"
        :src="src"
        :style="{ opacity: imageOpacity }"
      />

      <div v-if="loadProgress < 100" class="preview-loading" aria-hidden="true">
        <div class="preview-loading-ring" />
        <div class="preview-loading-bar">
          <span :style="{ transform: `scaleX(${imageOpacity})` }" />
        </div>
      </div>
    </div>

    <div
      class="preview-info-trigger"
      :class="{ 'is-info-visible': showInfoHint || isInfoHovered }"
      @mouseenter="showInfo"
      @mouseleave="hideInfo"
    >
      <div class="preview-info">
        <slot name="info" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-content {
  height: min(72vh, 720px);
  overflow: hidden;
  position: relative;
}

.preview-image-wrap {
  align-items: center;
  background:
    linear-gradient(120deg, rgb(255 255 255 / 6%), transparent 42%),
    rgb(0 0 0 / 4%);
  display: flex;
  height: 100%;
  justify-content: center;
  position: relative;
}

.preview-image {
  display: block;
  height: 100%;
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  transition: opacity 0.16s linear;
  width: 100%;
}

:deep(.preview-image img) {
  height: 100%;
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  width: 100%;
}

.preview-loading {
  align-items: center;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  justify-content: center;
  left: 0;
  pointer-events: none;
  position: absolute;
  right: 0;
  top: 0;
}

.preview-loading-ring {
  animation: preview-loading-spin 1s linear infinite;
  border: 2px solid rgb(255 255 255 / 28%);
  border-radius: 999px;
  border-top-color: var(--n-primary-color);
  height: 34px;
  width: 34px;
}

.preview-loading-bar {
  background: rgb(255 255 255 / 24%);
  border-radius: 999px;
  height: 3px;
  overflow: hidden;
  width: min(180px, 42%);
}

.preview-loading-bar span {
  background: var(--n-primary-color);
  display: block;
  height: 100%;
  transform-origin: left center;
  transition: transform 0.16s linear;
}

.preview-info-trigger {
  align-items: flex-end;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  min-height: 96px;
  padding: 16px;
  position: absolute;
  right: 0;
  width: min(420px, 100%);
}

.preview-info {
  backdrop-filter: blur(8px);
  background: rgb(255 255 255 / 68%);
  border: 1px solid rgb(255 255 255 / 56%);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 18%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 34vh;
  min-width: 0;
  opacity: 0;
  overflow: auto;
  padding: 12px;
  transform: translateY(10px);
  transition: opacity 0.45s ease, transform 0.45s ease;
  width: min(360px, 100%);
}

:global(.dark) .preview-info {
  background: rgb(24 24 28 / 68%);
  border-color: rgb(255 255 255 / 14%);
}

.preview-info :deep(.preview-meta) {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.preview-info :deep(.preview-meta-item) {
  align-items: baseline;
  display: inline-flex;
  gap: 6px;
  min-width: 0;
}

.preview-info :deep(.preview-meta-label) {
  color: var(--n-text-color-3);
  flex: none;
  font-size: 11px;
}

.preview-info :deep(.preview-meta-value) {
  font-size: 12px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-info :deep(.preview-meta-value.long) {
  white-space: normal;
  word-break: break-all;
}

.preview-info :deep(.preview-actions) {
  flex-wrap: wrap;
}

.preview-info-trigger.is-info-visible .preview-info {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 900px) {
  .preview-info-trigger {
    padding: 12px;
  }
}

@keyframes preview-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

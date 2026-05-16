<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'

type PreviewImage = {
  alt: string
  src: string
  title: string
}

const props = defineProps<{
  activeIndex: number
  images: PreviewImage[]
}>()

const emit = defineEmits<{
  close: []
  'update:activeIndex': [index: number]
}>()

const zoom = shallowRef(1)

const hasImages = computed(() => props.images.length > 0)
const currentImage = computed(() => props.images[props.activeIndex] ?? null)
const caption = computed(() => currentImage.value?.title || currentImage.value?.alt || '')
const canGoPrev = computed(() => props.activeIndex > 0)
const canGoNext = computed(() => props.activeIndex < props.images.length - 1)
const zoomPercent = computed(() => `${Math.round(zoom.value * 100)}%`)

watch(
  () => [props.activeIndex, currentImage.value?.src] as const,
  () => {
    zoom.value = 1
  },
)

watch(hasImages, (opened) => {
  document.body.style.overflow = opened ? 'hidden' : ''
})

onMounted(() => {
  window.addEventListener('keydown', handleWindowKeydown)
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', handleWindowKeydown)
})

function closePreview() {
  emit('close')
}

function updateActiveIndex(nextIndex: number) {
  if (nextIndex < 0 || nextIndex >= props.images.length) {
    return
  }

  emit('update:activeIndex', nextIndex)
}

function goPrev() {
  updateActiveIndex(props.activeIndex - 1)
}

function goNext() {
  updateActiveIndex(props.activeIndex + 1)
}

function zoomIn() {
  zoom.value = Math.min(zoom.value + 0.25, 4)
}

function zoomOut() {
  zoom.value = Math.max(zoom.value - 0.25, 1)
}

function resetZoom() {
  zoom.value = 1
}

function toggleZoom() {
  zoom.value = zoom.value === 1 ? 2 : 1
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    closePreview()
  }
}

function handleWheel(event: WheelEvent) {
  if (!hasImages.value) {
    return
  }

  if (event.deltaY < 0) {
    zoomIn()
    return
  }

  zoomOut()
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (!hasImages.value) {
    return
  }

  if (event.key === 'Escape') {
    closePreview()
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    goPrev()
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    goNext()
    return
  }

  if (event.key === '+' || event.key === '=') {
    event.preventDefault()
    zoomIn()
    return
  }

  if (event.key === '-') {
    event.preventDefault()
    zoomOut()
    return
  }

  if (event.key === '0') {
    event.preventDefault()
    resetZoom()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="image-preview">
      <div
        v-if="currentImage"
        class="image-preview"
        role="dialog"
        aria-modal="true"
        :aria-label="caption || '图片预览'"
        @click="handleBackdropClick"
      >
        <div class="image-preview__toolbar">
          <div class="image-preview__toolbar-group">
            <button
              type="button"
              class="image-preview__tool"
              :disabled="!canGoPrev"
              aria-label="查看上一张图片"
              @click="goPrev"
            >
              ←
            </button>
            <button
              type="button"
              class="image-preview__tool"
              :disabled="!canGoNext"
              aria-label="查看下一张图片"
              @click="goNext"
            >
              →
            </button>
          </div>

          <div class="image-preview__toolbar-group image-preview__toolbar-group--meta">
            <span class="image-preview__counter">{{ activeIndex + 1 }} / {{ images.length }}</span>
            <span class="image-preview__zoom">{{ zoomPercent }}</span>
          </div>

          <div class="image-preview__toolbar-group">
            <button
              type="button"
              class="image-preview__tool"
              aria-label="缩小图片"
              @click="zoomOut"
            >
              −
            </button>
            <button
              type="button"
              class="image-preview__tool"
              aria-label="重置缩放"
              @click="resetZoom"
            >
              1:1
            </button>
            <button
              type="button"
              class="image-preview__tool"
              aria-label="放大图片"
              @click="zoomIn"
            >
              +
            </button>
            <button
              type="button"
              class="image-preview__tool image-preview__tool--close"
              aria-label="关闭图片预览"
              @click="closePreview"
            >
              ×
            </button>
          </div>
        </div>

        <figure class="image-preview__figure">
          <div
            class="image-preview__canvas scroll-shell"
            @wheel.prevent="handleWheel"
          >
            <img
              class="image-preview__image"
              :src="currentImage.src"
              :alt="currentImage.alt"
              :style="{ transform: `scale(${zoom})` }"
              @dblclick="toggleZoom"
            />
          </div>

          <figcaption
            v-if="caption"
            class="image-preview__caption"
          >
            {{ caption }}
          </figcaption>
        </figure>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.image-preview {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 1rem;
  padding: clamp(1rem, 3vw, 2rem);
  background:
    radial-gradient(circle at top, rgba(var(--color-accent-rgb), 0.22), transparent 38%),
    rgba(7, 11, 20, 0.82);
  backdrop-filter: blur(18px);
}

.image-preview__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(10, 16, 29, 0.72);
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.24);
}

.image-preview__toolbar-group {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.image-preview__toolbar-group--meta {
  justify-content: center;
  min-width: 0;
  flex: 1;
}

.image-preview__counter,
.image-preview__zoom {
  display: inline-flex;
  align-items: center;
  min-height: 2.25rem;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(244, 248, 255, 0.92);
  font-size: 0.9rem;
}

.image-preview__tool {
  min-width: 2.75rem;
  height: 2.75rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: #f4f8ff;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    opacity 0.18s ease;
}

.image-preview__tool:hover:not(:disabled) {
  transform: translateY(-1px);
  background: rgba(var(--color-accent-rgb), 0.22);
  border-color: rgba(var(--color-accent-rgb), 0.34);
}

.image-preview__tool:disabled {
  opacity: 0.34;
  cursor: not-allowed;
}

.image-preview__tool--close {
  font-size: 1.35rem;
}

.image-preview__figure {
  width: min(100%, 1240px);
  min-width: 0;
  max-height: min(100%, calc(100vh - 7.75rem));
  display: grid;
  gap: 0.9rem;
  justify-self: center;
  justify-items: center;
}

.image-preview__canvas {
  width: 100%;
  min-height: 0;
  overflow: auto;
  display: grid;
  place-items: center;
  padding: 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.04);
}

.image-preview__image {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - 16rem);
  width: auto;
  height: auto;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 24px 54px rgba(0, 0, 0, 0.34);
  transform-origin: center center;
  transition: transform 0.16s ease;
  cursor: zoom-in;
}

.image-preview__caption {
  margin: 0;
  padding: 0.7rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(10, 16, 29, 0.68);
  color: rgba(244, 248, 255, 0.92);
  font-size: 0.92rem;
  text-align: center;
}

.image-preview-enter-active,
.image-preview-leave-active {
  transition: opacity 0.24s ease;
}

.image-preview-enter-active .image-preview__figure,
.image-preview-leave-active .image-preview__figure {
  transition: transform 0.24s ease, opacity 0.24s ease;
}

.image-preview-enter-from,
.image-preview-leave-to {
  opacity: 0;
}

.image-preview-enter-from .image-preview__figure,
.image-preview-leave-to .image-preview__figure {
  transform: translateY(12px) scale(0.97);
  opacity: 0;
}

@media (max-width: 820px) {
  .image-preview {
    padding: 0.85rem;
  }

  .image-preview__toolbar {
    display: grid;
    grid-template-columns: 1fr;
    border-radius: 24px;
  }

  .image-preview__toolbar-group {
    justify-content: center;
    flex-wrap: wrap;
  }

  .image-preview__toolbar-group--meta {
    order: -1;
  }

  .image-preview__figure {
    max-height: calc(100vh - 11.5rem);
  }

  .image-preview__canvas {
    padding: 0.85rem;
    border-radius: 20px;
  }

  .image-preview__image {
    max-height: calc(100vh - 19rem);
    border-radius: 16px;
  }

  .image-preview__caption {
    width: 100%;
    border-radius: 16px;
  }
}
</style>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'

type PreviewImage = {
  alt: string
  src: string
  title: string
}

const MAX_ZOOM = 4
const MIN_ZOOM = 1
const ZOOM_STEP = 0.25

const props = defineProps<{
  activeIndex: number
  images: PreviewImage[]
}>()

const emit = defineEmits<{
  close: []
  'update:activeIndex': [index: number]
}>()

const canvasRef = useTemplateRef<HTMLDivElement>('canvas')
const imageRef = useTemplateRef<HTMLImageElement>('image')

const zoom = shallowRef(1)
const panX = shallowRef(0)
const panY = shallowRef(0)
const isDragging = shallowRef(false)

let pointerId: number | null = null
let dragStartX = 0
let dragStartY = 0
let dragOriginX = 0
let dragOriginY = 0

const hasImages = computed(() => props.images.length > 0)
const currentImage = computed(() => props.images[props.activeIndex] ?? null)
const caption = computed(() => currentImage.value?.title || currentImage.value?.alt || '')
const canGoPrev = computed(() => props.activeIndex > 0)
const canGoNext = computed(() => props.activeIndex < props.images.length - 1)
const zoomPercent = computed(() => `${Math.round(zoom.value * 100)}%`)
const imageCursor = computed(() => {
  if (zoom.value <= 1) {
    return 'zoom-in'
  }

  return isDragging.value ? 'grabbing' : 'grab'
})
const imageTransform = computed(
  () => `translate3d(${panX.value}px, ${panY.value}px, 0) scale(${zoom.value})`,
)

watch(
  () => [props.activeIndex, currentImage.value?.src] as const,
  () => {
    resetViewport()
  },
)

watch(hasImages, (opened) => {
  document.body.style.overflow = opened ? 'hidden' : ''
})

watch(zoom, () => {
  if (zoom.value <= 1) {
    panX.value = 0
    panY.value = 0
    return
  }

  void nextTick(() => {
    clampPanWithinBounds()
  })
})

onMounted(() => {
  window.addEventListener('keydown', handleWindowKeydown)
  window.addEventListener('resize', handleWindowResize)
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', handleWindowKeydown)
  window.removeEventListener('resize', handleWindowResize)
})

function closePreview() {
  endDrag()
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

function updateZoom(nextZoom: number) {
  zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(nextZoom.toFixed(2))))
}

function zoomIn() {
  updateZoom(zoom.value + ZOOM_STEP)
}

function zoomOut() {
  updateZoom(zoom.value - ZOOM_STEP)
}

function resetViewport() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  endDrag()
}

function toggleZoom() {
  if (zoom.value === 1) {
    updateZoom(2)
    return
  }

  resetViewport()
}

function centerImage() {
  panX.value = 0
  panY.value = 0
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

function handleImageLoad() {
  void nextTick(() => {
    clampPanWithinBounds()
  })
}

function handlePointerDown(event: PointerEvent) {
  if (zoom.value <= 1 || event.button !== 0) {
    return
  }

  const canvas = canvasRef.value
  if (!canvas) {
    return
  }

  pointerId = event.pointerId
  dragStartX = event.clientX
  dragStartY = event.clientY
  dragOriginX = panX.value
  dragOriginY = panY.value
  isDragging.value = true
  canvas.setPointerCapture(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value || pointerId !== event.pointerId) {
    return
  }

  const nextX = dragOriginX + event.clientX - dragStartX
  const nextY = dragOriginY + event.clientY - dragStartY
  clampPanWithinBounds(nextX, nextY)
}

function handlePointerUp(event: PointerEvent) {
  if (pointerId !== event.pointerId) {
    return
  }

  const canvas = canvasRef.value
  if (canvas?.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId)
  }

  endDrag()
}

function endDrag() {
  isDragging.value = false
  pointerId = null
}

function handleWindowResize() {
  if (!hasImages.value) {
    return
  }

  clampPanWithinBounds()
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
    resetViewport()
  }
}

function clampPanWithinBounds(nextX = panX.value, nextY = panY.value) {
  const canvas = canvasRef.value
  const image = imageRef.value

  if (!canvas || !image || zoom.value <= 1) {
    panX.value = 0
    panY.value = 0
    return
  }

  const maxOffsetX = Math.max((image.clientWidth * zoom.value - canvas.clientWidth) / 2, 0)
  const maxOffsetY = Math.max((image.clientHeight * zoom.value - canvas.clientHeight) / 2, 0)

  panX.value = clamp(nextX, -maxOffsetX, maxOffsetX)
  panY.value = clamp(nextY, -maxOffsetY, maxOffsetY)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
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
        <button
          type="button"
          class="image-preview__close"
          aria-label="关闭图片预览"
          @click="closePreview"
        >
          <svg
            aria-hidden="true"
            class="image-preview__icon"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M6.75 6.75L17.25 17.25"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.8"
            />
            <path
              d="M17.25 6.75L6.75 17.25"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.8"
            />
          </svg>
        </button>

        <div class="image-preview__stage">
          <button
            v-if="images.length > 1"
            type="button"
            class="image-preview__nav image-preview__nav--prev"
            :disabled="!canGoPrev"
            aria-label="查看上一张图片"
            @click="goPrev"
          >
            <svg
              aria-hidden="true"
              class="image-preview__icon"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="M14.5 6.5L9 12L14.5 17.5"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.9"
              />
            </svg>
          </button>

          <figure class="image-preview__figure">
            <div
              ref="canvas"
              :class="['image-preview__canvas', { 'image-preview__canvas--dragging': isDragging }]"
              @wheel.prevent="handleWheel"
              @pointerdown="handlePointerDown"
              @pointermove="handlePointerMove"
              @pointerup="handlePointerUp"
              @pointercancel="handlePointerUp"
              @lostpointercapture="endDrag"
            >
              <img
                ref="image"
                :alt="currentImage.alt"
                :class="['image-preview__image', { 'image-preview__image--dragging': isDragging }]"
                :src="currentImage.src"
                :style="{ cursor: imageCursor, transform: imageTransform }"
                @dblclick="toggleZoom"
                @load="handleImageLoad"
              />
            </div>

            <figcaption
              v-if="caption"
              class="image-preview__caption"
            >
              {{ caption }}
            </figcaption>
          </figure>

          <button
            v-if="images.length > 1"
            type="button"
            class="image-preview__nav image-preview__nav--next"
            :disabled="!canGoNext"
            aria-label="查看下一张图片"
            @click="goNext"
          >
            <svg
              aria-hidden="true"
              class="image-preview__icon"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="M9.5 6.5L15 12L9.5 17.5"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.9"
              />
            </svg>
          </button>
        </div>

        <div class="image-preview__dock">
          <button
            type="button"
            class="image-preview__dock-button"
            aria-label="缩小图片"
            @click="zoomOut"
          >
            <svg
              aria-hidden="true"
              class="image-preview__icon"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                cx="10.5"
                cy="10.5"
                r="5.5"
                stroke="currentColor"
                stroke-width="1.7"
              />
              <path
                d="M7.8 10.5H13.2"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1.7"
              />
              <path
                d="M15.5 15.5L19 19"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1.7"
              />
            </svg>
          </button>

          <button
            type="button"
            class="image-preview__dock-button"
            aria-label="放大图片"
            @click="zoomIn"
          >
            <svg
              aria-hidden="true"
              class="image-preview__icon"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                cx="10.5"
                cy="10.5"
                r="5.5"
                stroke="currentColor"
                stroke-width="1.7"
              />
              <path
                d="M10.5 7.8V13.2"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1.7"
              />
              <path
                d="M7.8 10.5H13.2"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1.7"
              />
              <path
                d="M15.5 15.5L19 19"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1.7"
              />
            </svg>
          </button>

          <button
            type="button"
            class="image-preview__dock-value"
            aria-label="重置缩放到 100%"
            @click="resetViewport"
          >
            {{ zoomPercent }}
          </button>

          <button
            type="button"
            class="image-preview__dock-button"
            aria-label="图片回到中心位置"
            @click="centerImage"
          >
            <svg
              aria-hidden="true"
              class="image-preview__icon"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 4V8"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1.7"
              />
              <path
                d="M12 16V20"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1.7"
              />
              <path
                d="M4 12H8"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1.7"
              />
              <path
                d="M16 12H20"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1.7"
              />
              <circle
                cx="12"
                cy="12"
                r="2.8"
                stroke="currentColor"
                stroke-width="1.7"
              />
            </svg>
          </button>

          <button
            type="button"
            class="image-preview__dock-button"
            aria-label="重置视图"
            @click="resetViewport"
          >
            <svg
              aria-hidden="true"
              class="image-preview__icon"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="M6.5 9.5V5.5H10.5"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.7"
              />
              <path
                d="M17.5 14.5V18.5H13.5"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.7"
              />
              <path
                d="M17.1 6.9C15.8 5.7 14 5 12 5C8.13 5 5 8.13 5 12"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1.7"
              />
              <path
                d="M6.9 17.1C8.2 18.3 10 19 12 19C15.87 19 19 15.87 19 12"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1.7"
              />
            </svg>
          </button>
        </div>
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
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 1rem;
  padding: clamp(1rem, 2.8vw, 2rem);
  background:
    radial-gradient(circle at top, rgba(var(--color-accent-rgb), 0.18), transparent 42%),
    var(--preview-overlay);
  backdrop-filter: blur(18px) saturate(1.15);
}

.image-preview__stage {
  position: relative;
  display: grid;
  align-items: center;
  justify-items: center;
  min-height: 0;
}

.image-preview__close,
.image-preview__nav,
.image-preview__dock-button,
.image-preview__dock-value {
  border: 1px solid rgba(var(--color-accent-rgb), 0.12);
  background: var(--preview-button-bg);
  color: var(--preview-button-fg);
  box-shadow: var(--preview-frame-shadow);
}

.image-preview__close,
.image-preview__nav,
.image-preview__dock-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    opacity 0.18s ease,
    color 0.18s ease;
}

.image-preview__close:hover,
.image-preview__nav:hover:not(:disabled),
.image-preview__dock-button:hover,
.image-preview__dock-value:hover {
  transform: translateY(-1px);
  border-color: rgba(var(--color-accent-rgb), 0.28);
  background: rgba(var(--color-accent-rgb), 0.12);
  color: var(--color-accent-deep);
}

.image-preview__close {
  position: absolute;
  top: max(1rem, env(safe-area-inset-top));
  right: max(1rem, env(safe-area-inset-right));
  z-index: 2;
  width: 3.55rem;
  height: 3.55rem;
  border-radius: 999px;
}

.image-preview__nav {
  position: absolute;
  top: 50%;
  z-index: 2;
  width: 3.6rem;
  height: 3.6rem;
  border-radius: 999px;
  transform: translateY(-50%);
}

.image-preview__nav:hover:not(:disabled) {
  transform: translateY(calc(-50% - 1px));
}

.image-preview__nav--prev {
  left: max(0.35rem, env(safe-area-inset-left));
}

.image-preview__nav--next {
  right: max(0.35rem, env(safe-area-inset-right));
}

.image-preview__nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.image-preview__figure {
  width: 100%;
  min-width: 0;
  min-height: 100%;
  display: grid;
  gap: 1rem;
  justify-items: center;
}

.image-preview__canvas {
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 10rem);
  overflow: hidden;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  touch-action: none;
}

.image-preview__canvas--dragging {
  user-select: none;
}

.image-preview__image {
  display: block;
  max-width: calc(100vw - 6.5rem);
  max-height: calc(100vh - 10.5rem);
  width: auto;
  height: auto;
  border-radius: 0.9rem;
  background: transparent;
  box-shadow: 0 20px 48px rgba(var(--theme-shadow-rgb), 0.18);
  transform-origin: center center;
  transition: transform 0.16s ease;
  will-change: transform;
}

.image-preview__image--dragging {
  transition: none;
}

.image-preview__caption {
  max-width: min(70ch, calc(100vw - 4rem));
  padding: 0.68rem 1rem;
  border: 1px solid rgba(var(--color-accent-rgb), 0.14);
  border-radius: 999px;
  background: var(--preview-caption-bg);
  color: var(--preview-button-fg);
  text-align: center;
  box-shadow: 0 14px 32px rgba(var(--theme-shadow-rgb), 0.14);
}

.image-preview__dock {
  justify-self: center;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.38rem;
  border: 1px solid rgba(var(--color-accent-rgb), 0.12);
  border-radius: 999px;
  background: var(--preview-surface-strong);
  box-shadow: var(--preview-frame-shadow);
}

.image-preview__dock-button,
.image-preview__dock-value {
  min-width: 3rem;
  height: 3rem;
  border-radius: 999px;
}

.image-preview__dock-button {
  padding: 0;
}

.image-preview__dock-value {
  min-width: 5.3rem;
  padding: 0 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.image-preview__icon {
  width: 1.35rem;
  height: 1.35rem;
}

.image-preview-enter-active,
.image-preview-leave-active {
  transition: opacity 0.24s ease;
}

.image-preview-enter-active .image-preview__figure,
.image-preview-leave-active .image-preview__figure,
.image-preview-enter-active .image-preview__dock,
.image-preview-leave-active .image-preview__dock {
  transition: transform 0.24s ease, opacity 0.24s ease;
}

.image-preview-enter-from,
.image-preview-leave-to {
  opacity: 0;
}

.image-preview-enter-from .image-preview__figure,
.image-preview-leave-to .image-preview__figure {
  transform: translateY(14px) scale(0.985);
  opacity: 0;
}

.image-preview-enter-from .image-preview__dock,
.image-preview-leave-to .image-preview__dock {
  transform: translateY(10px);
  opacity: 0;
}

@media (max-width: 900px) {
  .image-preview {
    padding: 0.85rem;
  }

  .image-preview__close {
    width: 3rem;
    height: 3rem;
  }

  .image-preview__nav {
    width: 3.2rem;
    height: 3.2rem;
  }

  .image-preview__nav--prev {
    left: 0;
  }

  .image-preview__nav--next {
    right: 0;
  }

  .image-preview__canvas {
    min-height: calc(100vh - 11.25rem);
  }

  .image-preview__image {
    max-width: calc(100vw - 2rem);
    max-height: calc(100vh - 12.5rem);
    border-radius: 0.75rem;
  }

  .image-preview__dock {
    gap: 0.22rem;
    max-width: calc(100vw - 1.7rem);
    overflow-x: auto;
  }

  .image-preview__dock-button,
  .image-preview__dock-value {
    height: 2.8rem;
  }

  .image-preview__dock-value {
    min-width: 4.65rem;
  }
}
</style>

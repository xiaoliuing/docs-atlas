<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'

type PreviewImage = {
  alt: string
  src: string
  title: string
}

const MAX_ZOOM = 4
const MIN_ZOOM = 0.25
const ZOOM_STEP = 0.25

const props = defineProps<{
  activeIndex: number
  images: PreviewImage[]
}>()

const emit = defineEmits<{
  close: []
  'update:activeIndex': [index: number]
}>()

const imageRef = useTemplateRef<HTMLImageElement>('image')
const wrapperRef = useTemplateRef<HTMLDivElement>('wrapper')
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

const zoom = shallowRef(1)
const rotate = shallowRef(0)
const translateX = shallowRef(0)
const translateY = shallowRef(0)
const isDragging = shallowRef(false)
const wrapperMouseDownTarget = shallowRef<EventTarget | null>(null)

let pointerId: number | null = null
let startX = 0
let startY = 0
let originX = 0
let originY = 0
let lastTapTime = 0
let lastTapX = 0
let lastTapY = 0
let activeTouchCount = 0
let pinchStartDistance = 0
let pinchStartZoom = 1
let pinchCenterX = 0
let pinchCenterY = 0
let isPinching = false
let pinchOriginX = 0
let pinchOriginY = 0

const currentImage = computed(() => props.images[props.activeIndex] ?? null)
const currentSrc = computed(() => currentImage.value?.src ?? '')
const currentAlt = computed(() => currentImage.value?.alt || currentImage.value?.title || '图片预览')
const currentTitle = computed(() => currentImage.value?.title || currentImage.value?.alt || '')
const zoomPercent = computed(() => `${Math.round(zoom.value * 100)}%`)
const imageStyle = computed(() => ({
  cursor: isDragging.value ? 'grabbing' : zoom.value > 1 ? 'grab' : 'zoom-in',
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${zoom.value}) rotate(${rotate.value}deg)`,
  transition: isDragging.value ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
}))

watch(
  () => currentSrc.value,
  () => {
    reset()
  },
)

watch(
  () => Boolean(currentImage.value),
  (visible) => {
    if (!isBrowser) {
      return
    }

    document.body.style.overflow = visible ? 'hidden' : ''
  },
  { immediate: true },
)

onMounted(() => {
  if (!isBrowser) {
    return
  }

  window.addEventListener('keydown', handleWindowKeydown)
  window.addEventListener('resize', handleWindowResize)
})

onBeforeUnmount(() => {
  if (!isBrowser) {
    return
  }

  document.body.style.overflow = ''
  window.removeEventListener('keydown', handleWindowKeydown)
  window.removeEventListener('resize', handleWindowResize)
})

function handleClose() {
  stopDrag()
  emit('close')
}

function updateActiveIndex(nextIndex: number) {
  if (nextIndex < 0 || nextIndex >= props.images.length) {
    return
  }

  emit('update:activeIndex', nextIndex)
}

function zoomIn() {
  zoom.value = Math.min(MAX_ZOOM, Number((zoom.value + ZOOM_STEP).toFixed(2)))
}

function zoomOut() {
  zoom.value = Math.max(MIN_ZOOM, Number((zoom.value - ZOOM_STEP).toFixed(2)))
}

function rotateLeft() {
  rotate.value -= 90
}

function rotateRight() {
  rotate.value += 90
}

function reset() {
  zoom.value = 1
  rotate.value = 0
  translateX.value = 0
  translateY.value = 0
  stopDrag()
}

function prevImage() {
  if (props.images.length <= 1) {
    return
  }

  updateActiveIndex((props.activeIndex - 1 + props.images.length) % props.images.length)
}

function nextImage() {
  if (props.images.length <= 1) {
    return
  }

  updateActiveIndex((props.activeIndex + 1) % props.images.length)
}

function handleWheel(event: WheelEvent) {
  if (event.deltaY < 0) {
    zoomIn()
    return
  }

  zoomOut()
}

function getTouchDistance(touches: TouchList) {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.hypot(dx, dy)
}

function getTouchCenter(touches: TouchList) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  }
}

function handleTouchStart(event: TouchEvent) {
  activeTouchCount = event.touches.length

  if (event.touches.length === 2) {
    isPinching = true
    isDragging.value = false
    pinchStartDistance = getTouchDistance(event.touches)
    pinchStartZoom = zoom.value
    const center = getTouchCenter(event.touches)
    pinchCenterX = center.x
    pinchCenterY = center.y
    pinchOriginX = translateX.value
    pinchOriginY = translateY.value
    event.preventDefault()
  } else if (event.touches.length === 1) {
    const now = Date.now()
    const touch = event.touches[0]
    const dx = Math.abs(touch.clientX - lastTapX)
    const dy = Math.abs(touch.clientY - lastTapY)

    if (now - lastTapTime < 300 && dx < 30 && dy < 30) {
      if (zoom.value > 1) {
        zoom.value = 1
        translateX.value = 0
        translateY.value = 0
      } else {
        zoom.value = 2
        const rect = wrapperRef.value?.getBoundingClientRect()
        if (rect) {
          const centerX = rect.width / 2
          const centerY = rect.height / 2
          translateX.value = (centerX - touch.clientX) * (2 - 1)
          translateY.value = (centerY - touch.clientY) * (2 - 1)
        }
      }
      lastTapTime = 0
    } else {
      lastTapTime = now
      lastTapX = touch.clientX
      lastTapY = touch.clientY
    }
  }
}

function handleTouchMove(event: TouchEvent) {
  if (event.touches.length === 2 && isPinching) {
    const distance = getTouchDistance(event.touches)
    const scale = distance / pinchStartDistance
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStartZoom * scale))
    zoom.value = Number(newZoom.toFixed(2))

    const center = getTouchCenter(event.touches)
    const dx = center.x - pinchCenterX
    const dy = center.y - pinchCenterY
    translateX.value = pinchOriginX + dx
    translateY.value = pinchOriginY + dy
    event.preventDefault()
  }
}

function handleTouchEnd(event: TouchEvent) {
  activeTouchCount = event.touches.length
  if (event.touches.length < 2) {
    isPinching = false
  }
}

function handleWrapperMouseDown(event: MouseEvent) {
  wrapperMouseDownTarget.value = event.target
}

function handleWrapperClick(event: MouseEvent) {
  if (event.target === event.currentTarget && wrapperMouseDownTarget.value === event.currentTarget) {
    handleClose()
  }
}

function handlePointerDown(event: PointerEvent) {
  if (event.button !== 0) {
    return
  }

  const wrapper = wrapperRef.value
  if (!wrapper) {
    return
  }

  pointerId = event.pointerId
  isDragging.value = true
  startX = event.clientX
  startY = event.clientY
  originX = translateX.value
  originY = translateY.value
  wrapper.setPointerCapture(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value || pointerId !== event.pointerId) {
    return
  }

  translateX.value = originX + event.clientX - startX
  translateY.value = originY + event.clientY - startY
}

function handlePointerUp(event: PointerEvent) {
  if (pointerId !== event.pointerId) {
    return
  }

  const wrapper = wrapperRef.value
  if (wrapper?.hasPointerCapture(event.pointerId)) {
    wrapper.releasePointerCapture(event.pointerId)
  }

  stopDrag()
}

function stopDrag() {
  isDragging.value = false
  pointerId = null
}

function handleWindowResize() {
  void nextTick(() => {
    if (!imageRef.value) {
      return
    }
  })
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (!props.images.length) {
    return
  }

  if (event.key === 'Escape') {
    handleClose()
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    prevImage()
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    nextImage()
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
    reset()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="currentImage"
        class="image-preview-mask"
        role="dialog"
        aria-modal="true"
        :aria-label="currentAlt"
      >
        <div class="preview-toolbar">
          <button
            type="button"
            class="toolbar-btn"
            title="放大"
            @click="zoomIn"
          >
            +
          </button>
          <button
            type="button"
            class="toolbar-btn"
            title="缩小"
            @click="zoomOut"
          >
            -
          </button>
          <div class="zoom-indicator">
            {{ zoomPercent }}
          </div>
          <div class="divider" />
          <button
            type="button"
            class="toolbar-btn"
            title="向左旋转"
            @click="rotateLeft"
          >
            ↺
          </button>
          <button
            type="button"
            class="toolbar-btn"
            title="向右旋转"
            @click="rotateRight"
          >
            ↻
          </button>
          <div class="divider" />
          <button
            type="button"
            class="toolbar-btn"
            title="重置视图"
            @click="reset"
          >
            1:1
          </button>
        </div>

        <button
          type="button"
          class="close-btn"
          title="关闭"
          @click="handleClose"
        >
          ×
        </button>

        <button
          v-if="props.images.length > 1"
          type="button"
          class="nav-btn prev"
          @click="prevImage"
        >
          ‹
        </button>

        <button
          v-if="props.images.length > 1"
          type="button"
          class="nav-btn next"
          @click="nextImage"
        >
          ›
        </button>

        <div
          ref="wrapper"
          class="image-wrapper"
          @click="handleWrapperClick"
          @mousedown="handleWrapperMouseDown"
          @pointermove="handlePointerMove"
          @pointerup="handlePointerUp"
          @pointercancel="handlePointerUp"
          @lostpointercapture="stopDrag"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
        >
          <img
            ref="image"
            :src="currentSrc"
            :alt="currentAlt"
            :style="imageStyle"
            class="preview-image"
            draggable="false"
            @mousedown.prevent
            @pointerdown="handlePointerDown"
            @wheel.prevent="handleWheel"
          />
        </div>

        <div
          v-if="currentTitle"
          class="preview-caption"
        >
          {{ currentTitle }}
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.image-preview-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  background: rgba(7, 12, 22, 0.76);
  backdrop-filter: blur(14px);
}

.preview-toolbar {
  position: absolute;
  left: 50%;
  bottom: 24px;
  display: flex;
  align-items: center;
  gap: 4px;
  transform: translateX(-50%);
  padding: 8px 16px;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #172033;
  z-index: 10000;
}

.toolbar-btn,
.close-btn,
.nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  cursor: pointer;
}

.toolbar-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: transparent;
  color: inherit;
}

.zoom-indicator {
  min-width: 48px;
  margin: 0 8px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.divider {
  width: 1px;
  height: 20px;
  margin: 0 8px;
  background-color: rgba(var(--desktop-accent-rgb), 0.14);
}

.close-btn {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 10000;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: #172033;
  font-size: 1.5rem;
}

.nav-btn {
  position: absolute;
  top: 50%;
  z-index: 10000;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: #172033;
  font-size: 2rem;
  transform: translateY(-50%);
}

.nav-btn.prev {
  left: 20px;
}

.nav-btn.next {
  right: 20px;
}

.image-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent;
  touch-action: none;
}

.preview-image {
  max-width: calc(100vw - 1.5rem);
  max-height: calc(100vh - 5.75rem);
  object-fit: contain;
}

.preview-caption {
  position: absolute;
  left: 50%;
  bottom: 88px;
  transform: translateX(-50%);
  max-width: min(72ch, calc(100vw - 3rem));
  padding: 0.65rem 0.95rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: #172033;
  text-align: center;
  z-index: 10000;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.28s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

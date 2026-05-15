<script setup lang="ts">
import { computed } from 'vue'

type PreviewImage = {
  alt: string
  src: string
  title: string
}

const props = defineProps<{
  image: PreviewImage | null
}>()

const emit = defineEmits<{
  close: []
}>()

const caption = computed(() => props.image?.title || props.image?.alt || '')

function closePreview() {
  emit('close')
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    closePreview()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="image-preview">
      <div
        v-if="image"
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
          <span aria-hidden="true">×</span>
        </button>

        <figure class="image-preview__figure">
          <img class="image-preview__image" :src="image.src" :alt="image.alt" />
          <figcaption v-if="caption" class="image-preview__caption">
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
    place-items: center;
    padding: clamp(1rem, 3vw, 2rem);
    background:
      radial-gradient(circle at top, rgba(var(--color-accent-rgb), 0.22), transparent 38%),
      rgba(7, 11, 20, 0.82);
    backdrop-filter: blur(18px);
  }

  .image-preview__close {
    position: absolute;
    top: max(1rem, env(safe-area-inset-top));
    right: max(1rem, env(safe-area-inset-right));
    width: 2.9rem;
    height: 2.9rem;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 999px;
    background: rgba(10, 16, 29, 0.72);
    color: #f4f8ff;
    font-size: 1.8rem;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 20px 36px rgba(0, 0, 0, 0.24);
  }

  .image-preview__figure {
    width: min(100%, 1080px);
    max-height: min(100%, 92vh);
    display: grid;
    gap: 0.9rem;
    justify-items: center;
  }

  .image-preview__image {
    display: block;
    max-width: 100%;
    max-height: calc(92vh - 4.5rem);
    width: auto;
    height: auto;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.04);
    box-shadow: 0 24px 54px rgba(0, 0, 0, 0.34);
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

  @media (max-width: 640px) {
    .image-preview {
      padding: 0.85rem;
    }

    .image-preview__close {
      top: max(0.85rem, env(safe-area-inset-top));
      right: max(0.85rem, env(safe-area-inset-right));
      width: 2.65rem;
      height: 2.65rem;
    }

    .image-preview__image {
      border-radius: 16px;
    }

    .image-preview__caption {
      width: 100%;
      border-radius: 16px;
    }
  }
</style>

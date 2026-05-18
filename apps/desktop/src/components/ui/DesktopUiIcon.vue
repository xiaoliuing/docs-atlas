<script setup lang="ts">
withDefaults(
  defineProps<{
    name:
      | 'atlas'
      | 'search'
      | 'settings'
      | 'plus'
      | 'close'
      | 'chevron-down'
      | 'chevron-left'
      | 'chevron-right'
      | 'zoom-in'
      | 'zoom-out'
      | 'rotate-left'
      | 'rotate-right'
      | 'reset-view'
    size?: number | string
    strokeWidth?: number
  }>(),
  {
    size: 20,
    strokeWidth: 1.8,
  },
)
</script>

<template>
  <svg
    class="desktop-ui-icon"
    :style="{ width: typeof size === 'number' ? `${size}px` : size, height: typeof size === 'number' ? `${size}px` : size }"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <template v-if="name === 'atlas'">
      <path
        d="M5 8.5C5 6.57 6.57 5 8.5 5H15.5C17.43 5 19 6.57 19 8.5V15.5C19 17.43 17.43 19 15.5 19H8.5C6.57 19 5 17.43 5 15.5V8.5Z"
        :stroke-width="strokeWidth"
      />
      <path d="M8.5 9.5H15.5" :stroke-width="strokeWidth" stroke-linecap="round" />
      <path d="M8.5 13H13.5" :stroke-width="strokeWidth" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="6.5" :stroke-width="strokeWidth" />
      <path d="M16 16L20.5 20.5" :stroke-width="strokeWidth" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'settings'">
      <path
        d="M12 4.15L13.37 5.52L15.31 5.14L16.12 6.91L18.02 7.6L17.74 9.56L19.1 10.9L17.74 12.24L18.02 14.2L16.12 14.89L15.31 16.66L13.37 16.28L12 17.65L10.63 16.28L8.69 16.66L7.88 14.89L5.98 14.2L6.26 12.24L4.9 10.9L6.26 9.56L5.98 7.6L7.88 6.91L8.69 5.14L10.63 5.52L12 4.15Z"
        :stroke-width="1.45"
        stroke-linejoin="round"
      />
      <circle cx="12" cy="10.9" r="2.3" :stroke-width="1.6" />
      <path d="M10.45 14.55H13.55" :stroke-width="1.6" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'plus'">
      <path d="M12 6V18" :stroke-width="strokeWidth" stroke-linecap="round" />
      <path d="M6 12H18" :stroke-width="strokeWidth" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'close'">
      <path d="M6.75 6.75L17.25 17.25" :stroke-width="strokeWidth" stroke-linecap="round" />
      <path d="M17.25 6.75L6.75 17.25" :stroke-width="strokeWidth" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'chevron-down'">
      <path d="M7 10L12 15L17 10" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    </template>

    <template v-else-if="name === 'chevron-left'">
      <path d="M14.75 6.5L9.25 12L14.75 17.5" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    </template>

    <template v-else-if="name === 'chevron-right'">
      <path d="M9.25 6.5L14.75 12L9.25 17.5" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    </template>

    <template v-else-if="name === 'zoom-in'">
      <circle cx="10.5" cy="10.5" r="5.5" :stroke-width="strokeWidth" />
      <path d="M14.7 14.7L19 19" :stroke-width="strokeWidth" stroke-linecap="round" />
      <path d="M10.5 8.2V12.8" :stroke-width="1.6" stroke-linecap="round" />
      <path d="M8.2 10.5H12.8" :stroke-width="1.6" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'zoom-out'">
      <circle cx="10.5" cy="10.5" r="5.5" :stroke-width="strokeWidth" />
      <path d="M14.7 14.7L19 19" :stroke-width="strokeWidth" stroke-linecap="round" />
      <path d="M8.2 10.5H12.8" :stroke-width="1.6" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'rotate-left'">
      <path d="M8 7H4.75V10.25" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M5 9.5A7 7 0 1 1 6.4 15.9" :stroke-width="strokeWidth" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'rotate-right'">
      <path d="M16 7H19.25V10.25" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M19 9.5A7 7 0 1 0 17.6 15.9" :stroke-width="strokeWidth" stroke-linecap="round" />
    </template>

    <template v-else-if="name === 'reset-view'">
      <path d="M8 5.5H5.5V8" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M16 5.5H18.5V8" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M8 18.5H5.5V16" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M16 18.5H18.5V16" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="12" cy="12" r="1.5" :stroke-width="1.5" />
    </template>
  </svg>
</template>

<style scoped>
.desktop-ui-icon {
  display: block;
  flex: none;
  stroke: currentColor;
}
</style>

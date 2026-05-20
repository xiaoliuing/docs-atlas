<script setup lang="ts">
withDefaults(
  defineProps<{
    name:
      | 'atlas'
      | 'search'
      | 'settings'
      | 'grip'
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
    :viewBox="name === 'settings' ? '0 0 1024 1024' : '0 0 24 24'"
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
        d="M581.818182 930.909091h-139.636364c-44.218182 0-81.454545-37.236364-81.454545-81.454546v-55.854545c0-6.981818-4.654545-9.309091-6.981818-9.309091-2.327273-2.327273-6.981818-2.327273-11.636364 0l-48.872727 27.927273c-39.563636 23.272727-88.436364 9.309091-111.709091-30.254546l-69.818182-121.018181c-11.636364-18.618182-13.963636-41.890909-6.981818-62.836364s18.618182-39.563636 37.236363-48.872727l48.872728-27.927273c4.654545-2.327273 6.981818-6.981818 6.981818-9.309091 0-2.327273 0-6.981818-6.981818-9.309091l-48.872728-27.927273c-18.618182-11.636364-32.581818-27.927273-37.236363-48.872727-4.654545-20.945455-2.327273-41.890909 6.981818-62.836364l69.818182-121.018181c23.272727-39.563636 72.145455-51.2 111.709091-30.254546l48.872727 27.927273c4.654545 2.327273 9.309091 2.327273 11.636364 0 2.327273-2.327273 6.981818-4.654545 6.981818-9.309091V174.545455C360.727273 130.327273 397.963636 93.090909 442.181818 93.090909h139.636364c44.218182 0 81.454545 37.236364 81.454545 81.454546v55.854545c0 6.981818 4.654545 9.309091 6.981818 9.309091 2.327273 2.327273 6.981818 2.327273 11.636364 0l48.872727-27.927273c39.563636-23.272727 88.436364-9.309091 111.709091 30.254546l69.818182 121.018181c23.272727 39.563636 9.309091 88.436364-30.254545 111.709091l-48.872728 27.927273c-4.654545 2.327273-6.981818 6.981818-6.981818 9.309091 0 2.327273 0 6.981818 6.981818 9.309091l48.872728 27.927273c39.563636 23.272727 51.2 72.145455 30.254545 111.709091l-69.818182 121.018181c-23.272727 39.563636-72.145455 51.2-111.709091 30.254546l-48.872727-27.927273c-4.654545-2.327273-9.309091-2.327273-11.636364 0-2.327273 2.327273-6.981818 4.654545-6.981818 9.309091v55.854545c0 44.218182-37.236364 81.454545-81.454545 81.454546z m-232.727273-218.763636c13.963636 0 27.927273 4.654545 39.563636 11.636363 25.6 13.963636 41.890909 41.890909 41.89091 69.818182v55.854545c0 6.981818 4.654545 11.636364 11.636363 11.636364h139.636364c6.981818 0 11.636364-4.654545 11.636363-11.636364v-55.854545c0-30.254545 16.290909-55.854545 41.89091-69.818182 25.6-13.963636 55.854545-13.963636 81.454545 0l48.872727 27.927273c4.654545 2.327273 11.636364 2.327273 16.290909-4.654546l69.818182-121.018181c2.327273-4.654545 2.327273-11.636364-4.654545-16.290909L798.254545 581.818182c-25.6-13.963636-41.890909-41.890909-41.890909-69.818182 0-30.254545 16.290909-55.854545 41.890909-69.818182l48.872728-27.927273c4.654545-2.327273 6.981818-9.309091 4.654545-16.290909l-69.818182-121.018181c-2.327273-4.654545-9.309091-6.981818-16.290909-4.654546l-48.872727 27.927273c-25.6 13.963636-55.854545 13.963636-81.454545 0s-41.890909-41.890909-41.89091-69.818182V174.545455c0-6.981818-4.654545-11.636364-11.636363-11.636364h-139.636364c-6.981818 0-11.636364 4.654545-11.636363 11.636364v55.854545c0 30.254545-16.290909 55.854545-41.89091 69.818182-25.6 13.963636-55.854545 13.963636-81.454545 0l-48.872727-27.927273c-4.654545-2.327273-11.636364-2.327273-16.290909 4.654546l-69.818182 121.018181c-2.327273 4.654545-2.327273 6.981818 0 9.309091 0 2.327273 2.327273 4.654545 4.654545 6.981818L228.072727 442.181818c25.6 13.963636 41.890909 41.890909 41.890909 69.818182 0 30.254545-16.290909 55.854545-41.890909 69.818182l-48.872727 27.927273c-4.654545 2.327273-4.654545 4.654545-4.654545 6.981818v9.309091l69.818181 121.018181c2.327273 4.654545 9.309091 6.981818 16.290909 4.654546l48.872728-27.927273c11.636364-6.981818 25.6-11.636364 39.563636-11.636363z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M512 663.272727c-83.781818 0-151.272727-67.490909-151.272727-151.272727s67.490909-151.272727 151.272727-151.272727 151.272727 67.490909 151.272727 151.272727-67.490909 151.272727-151.272727 151.272727z m0-232.727272c-44.218182 0-81.454545 37.236364-81.454545 81.454545s37.236364 81.454545 81.454545 81.454545 81.454545-37.236364 81.454545-81.454545-37.236364-81.454545-81.454545-81.454545z"
        fill="currentColor"
        stroke="none"
      />
    </template>

    <template v-else-if="name === 'grip'">
      <circle cx="9" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="16" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="16" r="1.2" fill="currentColor" stroke="none" />
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

<script setup lang="ts">
import type { DesktopAccentId, DesktopAccentOption, DesktopThemeMode } from '@/composables/useDesktopPreferences'

const props = defineProps<{
  accentId: DesktopAccentId
  accentOptions: DesktopAccentOption[]
  themeMode: DesktopThemeMode
}>()

const emit = defineEmits<{
  updateAccent: [accentId: DesktopAccentId]
  updateThemeMode: [themeMode: DesktopThemeMode]
}>()

const themeModeOptions: Array<{ value: DesktopThemeMode; label: string; description: string }> = [
  { value: 'system', label: '跟随系统', description: '自动匹配系统外观' },
  { value: 'light', label: '浅色', description: '更亮的阅读界面' },
  { value: 'dark', label: '深色', description: '适合夜间和长时间阅读' },
]
</script>

<template>
  <section class="desktop-system-settings-panel">
    <div class="desktop-system-settings-panel__section">
      <div class="desktop-system-settings-panel__heading">
        <p class="desktop-system-settings-panel__eyebrow">System</p>
        <h3 class="desktop-system-settings-panel__title">界面设置</h3>
      </div>

      <div class="desktop-system-settings-panel__segmented">
        <button
          v-for="option in themeModeOptions"
          :key="option.value"
          :class="[
            'desktop-system-settings-panel__segment',
            { 'desktop-system-settings-panel__segment--active': props.themeMode === option.value },
          ]"
          type="button"
          @click="emit('updateThemeMode', option.value)"
        >
          <strong>{{ option.label }}</strong>
          <span>{{ option.description }}</span>
        </button>
      </div>
    </div>

    <div class="desktop-system-settings-panel__section">
      <div class="desktop-system-settings-panel__heading">
        <p class="desktop-system-settings-panel__eyebrow">Theme</p>
        <h3 class="desktop-system-settings-panel__title">主题色</h3>
      </div>

      <div class="desktop-system-settings-panel__accents">
        <button
          v-for="option in props.accentOptions"
          :key="option.id"
          :aria-label="`切换主题色 ${option.label}`"
          :class="[
            'desktop-system-settings-panel__accent',
            { 'desktop-system-settings-panel__accent--active': props.accentId === option.id },
          ]"
          :style="{ '--accent-color': option.hex }"
          type="button"
          @click="emit('updateAccent', option.id)"
        >
          <span class="desktop-system-settings-panel__accent-swatch" />
          <span class="desktop-system-settings-panel__accent-copy">
            <strong>{{ option.label }}</strong>
            <span>{{ option.hex }}</span>
          </span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.desktop-system-settings-panel {
  width: min(28rem, calc(100vw - 2rem));
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--desktop-line);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.05), transparent 30%),
    var(--desktop-surface-strong);
  box-shadow: 0 18px 40px rgba(var(--desktop-shadow), 0.14);
}

.desktop-system-settings-panel__section {
  display: grid;
  gap: 0.7rem;
}

.desktop-system-settings-panel__heading {
  display: grid;
  gap: 0.14rem;
}

.desktop-system-settings-panel__eyebrow {
  margin: 0;
  color: var(--desktop-soft);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.desktop-system-settings-panel__title {
  margin: 0;
  color: var(--desktop-ink);
  font-size: 0.95rem;
  font-weight: 650;
}

.desktop-system-settings-panel__segmented {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
}

.desktop-system-settings-panel__segment,
.desktop-system-settings-panel__accent {
  border: 1px solid var(--desktop-line);
  border-radius: 14px;
  background: rgba(var(--desktop-accent-rgb), 0.03);
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.desktop-system-settings-panel__segment {
  display: grid;
  gap: 0.18rem;
  padding: 0.72rem;
  text-align: left;
}

.desktop-system-settings-panel__segment strong,
.desktop-system-settings-panel__accent-copy strong {
  color: var(--desktop-ink);
  font-size: 0.8rem;
  font-weight: 600;
}

.desktop-system-settings-panel__segment span,
.desktop-system-settings-panel__accent-copy span {
  color: var(--desktop-muted);
  font-size: 0.72rem;
  line-height: 1.45;
}

.desktop-system-settings-panel__segment:hover,
.desktop-system-settings-panel__segment--active,
.desktop-system-settings-panel__accent:hover,
.desktop-system-settings-panel__accent--active {
  border-color: var(--desktop-line-strong);
  background: rgba(var(--desktop-accent-rgb), 0.08);
  transform: translateY(-1px);
}

.desktop-system-settings-panel__accents {
  display: grid;
  gap: 0.55rem;
}

.desktop-system-settings-panel__accent {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.72rem;
  padding: 0.72rem;
  text-align: left;
}

.desktop-system-settings-panel__accent-swatch {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 999px;
  background: var(--accent-color);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-color) 16%, transparent);
}

.desktop-system-settings-panel__accent-copy {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
}
</style>

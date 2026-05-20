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
  { value: 'system', label: '跟随系统', description: '自动匹配系统外观。' },
  { value: 'light', label: '浅色', description: '更适合白天和文档整理。' },
  { value: 'dark', label: '深色', description: '适合夜间和长时间阅读。' },
]
</script>

<template>
  <section class="desktop-settings-panel">
    <header class="desktop-settings-panel__hero">
      <div class="desktop-settings-panel__hero-copy">
        <p class="desktop-settings-panel__kicker">Appearance</p>
        <h3 class="desktop-settings-panel__title">外观</h3>
        <p class="desktop-settings-panel__summary">管理主题模式和主题色，让标题栏、侧栏和正文风格保持一致。</p>
      </div>

      <div class="desktop-settings-panel__hero-badge">
        <span class="desktop-settings-panel__hero-label">当前主题</span>
        <strong>{{ props.accentOptions.find((item) => item.id === props.accentId)?.label ?? '默认' }}</strong>
      </div>
    </header>

    <section class="desktop-settings-panel__group">
      <div class="desktop-settings-panel__group-head">
        <h4>主题模式</h4>
        <p>控制应用跟随系统或固定使用浅色 / 深色外观。</p>
      </div>

      <div class="desktop-settings-panel__list">
        <button
          v-for="option in themeModeOptions"
          :key="option.value"
          :class="[
            'desktop-settings-panel__row',
            { 'desktop-settings-panel__row--active': props.themeMode === option.value },
          ]"
          type="button"
          @click="emit('updateThemeMode', option.value)"
        >
          <span class="desktop-settings-panel__row-copy">
            <strong>{{ option.label }}</strong>
            <span>{{ option.description }}</span>
          </span>
          <span class="desktop-settings-panel__row-state">
            {{ props.themeMode === option.value ? '已启用' : '切换' }}
          </span>
        </button>
      </div>
    </section>

    <section class="desktop-settings-panel__group">
      <div class="desktop-settings-panel__group-head">
        <h4>主题色</h4>
        <p>主题色会同步影响标题栏、侧边栏强调色和主要交互状态。</p>
      </div>

      <div class="desktop-settings-panel__accent-grid">
        <button
          v-for="option in props.accentOptions"
          :key="option.id"
          :aria-label="`切换主题色 ${option.label}`"
          :class="[
            'desktop-settings-panel__accent',
            { 'desktop-settings-panel__accent--active': props.accentId === option.id },
          ]"
          :style="{ '--accent-color': option.hex }"
          type="button"
          @click="emit('updateAccent', option.id)"
        >
          <span class="desktop-settings-panel__accent-swatch" />
          <span class="desktop-settings-panel__accent-copy">
            <strong>{{ option.label }}</strong>
            <span>{{ option.hex }}</span>
          </span>
        </button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.desktop-settings-panel {
  display: grid;
  gap: 1.1rem;
}

.desktop-settings-panel__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.15rem 0 0.2rem;
}

.desktop-settings-panel__hero-copy {
  display: grid;
  gap: 0.18rem;
  min-width: 0;
}

.desktop-settings-panel__kicker {
  margin: 0;
  color: var(--desktop-soft);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.desktop-settings-panel__title {
  margin: 0.12rem 0 0;
  color: var(--desktop-ink);
  font-size: 1.08rem;
  font-weight: 680;
}

.desktop-settings-panel__summary,
.desktop-settings-panel__group-head p {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.78rem;
  line-height: 1.6;
}

.desktop-settings-panel__hero-badge {
  display: grid;
  gap: 0.12rem;
  min-width: 10rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.12);
  border-radius: 16px;
  background: rgba(var(--desktop-accent-rgb), 0.05);
}

.desktop-settings-panel__hero-label {
  color: var(--desktop-soft);
  font-size: 0.7rem;
  font-weight: 600;
}

.desktop-settings-panel__hero-badge strong {
  color: var(--desktop-ink);
  font-size: 0.84rem;
  font-weight: 650;
}

.desktop-settings-panel__group {
  display: grid;
  gap: 0.75rem;
  padding: 1rem 1.05rem;
  border: 1px solid var(--desktop-line);
  border-radius: 18px;
  background: var(--desktop-surface);
}

.desktop-settings-panel__group-head {
  display: grid;
  gap: 0.2rem;
}

.desktop-settings-panel__group-head h4 {
  margin: 0;
  color: var(--desktop-ink);
  font-size: 0.86rem;
  font-weight: 650;
}

.desktop-settings-panel__list {
  display: grid;
  gap: 0;
  border: 1px solid var(--desktop-line);
  border-radius: 16px;
  overflow: hidden;
  background: var(--desktop-surface-strong);
}

.desktop-settings-panel__row,
.desktop-settings-panel__accent {
  border: 0;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.desktop-settings-panel__row + .desktop-settings-panel__row {
  border-top: 1px solid var(--desktop-line);
}

.desktop-settings-panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.88rem 0.95rem;
  text-align: left;
}

.desktop-settings-panel__row-copy {
  display: grid;
  gap: 0.16rem;
}

.desktop-settings-panel__row-copy strong,
.desktop-settings-panel__accent-copy strong {
  color: var(--desktop-ink);
  font-size: 0.8rem;
  font-weight: 600;
}

.desktop-settings-panel__row-copy span,
.desktop-settings-panel__accent-copy span {
  color: var(--desktop-muted);
  font-size: 0.72rem;
  line-height: 1.45;
}

.desktop-settings-panel__row-state {
  flex: none;
  color: var(--desktop-soft);
  font-size: 0.72rem;
  font-weight: 600;
}

.desktop-settings-panel__row:hover,
.desktop-settings-panel__row--active {
  background: rgba(var(--desktop-accent-rgb), 0.08);
}

.desktop-settings-panel__row--active .desktop-settings-panel__row-state {
  color: var(--desktop-accent);
}

.desktop-settings-panel__accent-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.desktop-settings-panel__accent {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.62rem;
  padding: 0.68rem 0.72rem;
  border: 1px solid var(--desktop-line);
  border-radius: 14px;
  background: var(--desktop-surface-strong);
  text-align: left;
}

.desktop-settings-panel__accent-swatch {
  width: 1.08rem;
  height: 1.08rem;
  border-radius: 999px;
  background: var(--accent-color);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-color) 16%, transparent);
}

.desktop-settings-panel__accent-copy {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
}

.desktop-settings-panel__accent:hover,
.desktop-settings-panel__accent--active {
  background: rgba(var(--desktop-accent-rgb), 0.08);
}

@media (max-width: 1040px) {
  .desktop-settings-panel__hero {
    flex-direction: column;
  }

  .desktop-settings-panel__hero-badge {
    min-width: 0;
  }

  .desktop-settings-panel__accent-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
export type DesktopSettingsSection = 'appearance' | 'updates' | 'workspace' | 'data'

const props = defineProps<{
  activeSection: DesktopSettingsSection
}>()

const emit = defineEmits<{
  select: [section: DesktopSettingsSection]
}>()

const items: Array<{
  id: DesktopSettingsSection
  title: string
}> = [
  {
    id: 'appearance',
    title: '外观',
  },
  {
    id: 'updates',
    title: '更新',
  },
  {
    id: 'workspace',
    title: '文档仓库',
  },
  {
    id: 'data',
    title: '数据与日志',
  },
]
</script>

<template>
  <nav class="desktop-settings-nav" aria-label="设置分组">
    <p class="desktop-settings-nav__title">设置</p>
    <button
      v-for="item in items"
      :key="item.id"
      :class="[
        'desktop-settings-nav__item',
        { 'desktop-settings-nav__item--active': props.activeSection === item.id },
      ]"
      type="button"
      @click="emit('select', item.id)"
    >
      <strong>{{ item.title }}</strong>
      <span class="desktop-settings-nav__indicator" aria-hidden="true" />
    </button>
  </nav>
</template>

<style scoped>
.desktop-settings-nav {
  display: grid;
  align-content: start;
  gap: 0.3rem;
}

.desktop-settings-nav__title {
  margin: 0 0 0.55rem;
  padding: 0 0.55rem;
  color: var(--desktop-soft);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.desktop-settings-nav__item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.72rem 0.82rem;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.desktop-settings-nav__item strong {
  color: var(--desktop-ink);
  font-size: 0.84rem;
  font-weight: 620;
}

.desktop-settings-nav__indicator {
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: transparent;
  transition: background-color 0.18s ease, transform 0.18s ease;
}

.desktop-settings-nav__item:hover {
  background: rgba(var(--desktop-accent-rgb), 0.06);
}

.desktop-settings-nav__item--active {
  background:
    linear-gradient(90deg, rgba(var(--desktop-accent-rgb), 0.14), rgba(var(--desktop-accent-rgb), 0.05)),
    var(--desktop-surface-strong);
}

.desktop-settings-nav__item--active strong {
  color: var(--desktop-accent);
}

.desktop-settings-nav__item--active .desktop-settings-nav__indicator {
  background: var(--desktop-accent);
  transform: scale(1.05);
}
</style>

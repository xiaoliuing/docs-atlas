<script setup lang="ts">
const props = defineProps<{
  actionMessage?: string
  busyAction?: 'app-data' | 'logs' | 'export' | null
}>()

const emit = defineEmits<{
  exportLogs: []
  openAppDataDirectory: []
  openLogsDirectory: []
}>()
</script>

<template>
  <section class="desktop-settings-panel">
    <header class="desktop-settings-panel__hero">
      <p class="desktop-settings-panel__kicker">Data</p>
      <h3 class="desktop-settings-panel__title">数据与日志</h3>
      <p class="desktop-settings-panel__summary">
        查看应用数据目录、定位日志文件，并导出诊断信息。后续恢复和健康检查入口也会放在这里。
      </p>
    </header>

    <section class="desktop-settings-panel__group">
      <div class="desktop-settings-panel__group-head">
        <h4>文件与诊断</h4>
        <p>这些入口都属于系统级操作，不会影响当前阅读位置。</p>
      </div>

      <div class="desktop-settings-panel__list">
        <button
          class="desktop-settings-panel__row"
          :disabled="props.busyAction !== null"
          type="button"
          @click="emit('openAppDataDirectory')"
        >
          <span class="desktop-settings-panel__row-copy">
            <strong>打开数据目录</strong>
            <span>{{ props.busyAction === 'app-data' ? '处理中…' : '查看数据库、缓存和导入导出文件。' }}</span>
          </span>
          <span class="desktop-settings-panel__row-state">打开</span>
        </button>

        <button
          class="desktop-settings-panel__row"
          :disabled="props.busyAction !== null"
          type="button"
          @click="emit('openLogsDirectory')"
        >
          <span class="desktop-settings-panel__row-copy">
            <strong>打开日志目录</strong>
            <span>{{ props.busyAction === 'logs' ? '处理中…' : '定位本地运行日志，便于排查问题。' }}</span>
          </span>
          <span class="desktop-settings-panel__row-state">打开</span>
        </button>

        <button
          class="desktop-settings-panel__row"
          :disabled="props.busyAction !== null"
          type="button"
          @click="emit('exportLogs')"
        >
          <span class="desktop-settings-panel__row-copy">
            <strong>导出日志文件</strong>
            <span>{{ props.busyAction === 'export' ? '处理中…' : '导出当前日志文件用于反馈和诊断。' }}</span>
          </span>
          <span class="desktop-settings-panel__row-state">导出</span>
        </button>
      </div>

      <p v-if="props.actionMessage" class="desktop-settings-panel__feedback">
        {{ props.actionMessage }}
      </p>
    </section>
  </section>
</template>

<style scoped>
.desktop-settings-panel {
  display: grid;
  gap: 1.1rem;
}

.desktop-settings-panel__hero,
.desktop-settings-panel__group {
  display: grid;
  gap: 0.75rem;
  padding: 1rem 1.05rem;
  border: 1px solid var(--desktop-line);
  border-radius: 18px;
  background: var(--desktop-surface);
}

.desktop-settings-panel__hero {
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.08), transparent 58%),
    var(--desktop-surface);
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
  font-size: 1.06rem;
  font-weight: 680;
}

.desktop-settings-panel__summary,
.desktop-settings-panel__group-head p,
.desktop-settings-panel__feedback {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.78rem;
  line-height: 1.6;
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

.desktop-settings-panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.88rem 0.95rem;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.18s ease;
}

.desktop-settings-panel__row + .desktop-settings-panel__row {
  border-top: 1px solid var(--desktop-line);
}

.desktop-settings-panel__row-copy {
  display: grid;
  gap: 0.16rem;
}

.desktop-settings-panel__row strong {
  color: var(--desktop-ink);
  font-size: 0.8rem;
  font-weight: 620;
}

.desktop-settings-panel__row-copy span,
.desktop-settings-panel__row-state {
  color: var(--desktop-muted);
  font-size: 0.72rem;
  line-height: 1.45;
}

.desktop-settings-panel__row-state {
  flex: none;
  font-weight: 600;
}

.desktop-settings-panel__row:hover {
  background: rgba(var(--desktop-accent-rgb), 0.08);
}

.desktop-settings-panel__row:disabled {
  cursor: progress;
  opacity: 0.72;
}

.desktop-settings-panel__feedback {
  padding: 0.65rem 0.72rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.14);
  border-radius: 12px;
  background: rgba(var(--desktop-accent-rgb), 0.05);
}
</style>

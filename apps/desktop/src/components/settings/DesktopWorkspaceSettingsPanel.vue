<script setup lang="ts">
import type { WorkspaceDetail } from '@docs-atlas/shared-types/workspace'

const props = defineProps<{
  currentWorkspace: WorkspaceDetail | null
  docCount: number
  isExportingWorkspace: boolean
  isImportingWorkspace: boolean
  sourceCount: number
  unhealthySourceCount: number
  workspaceCount: number
}>()

const emit = defineEmits<{
  createWorkspace: []
  editSources: []
  editWorkspace: []
  exportWorkspace: []
  importWorkspace: []
}>()
</script>

<template>
  <section class="desktop-settings-panel">
    <header class="desktop-settings-panel__hero">
      <div class="desktop-settings-panel__hero-copy">
        <p class="desktop-settings-panel__kicker">Repository Control</p>
        <h3 class="desktop-settings-panel__title">文档仓库</h3>
        <p class="desktop-settings-panel__summary">
          集中管理当前文档仓库的元信息、文档源和迁移动作。
        </p>
      </div>
    </header>

    <section class="desktop-settings-panel__group">
      <div class="desktop-settings-panel__group-head">
        <h4>当前文档仓库</h4>
        <p>这里处理当前文档仓库，不影响其他文档仓库的阅读状态。</p>
      </div>

      <div v-if="props.currentWorkspace" class="desktop-settings-panel__workspace-card">
        <div class="desktop-settings-panel__workspace-top">
          <span
            class="desktop-settings-panel__workspace-color"
            :style="{ '--workspace-color': props.currentWorkspace.color }"
          />

          <div class="desktop-settings-panel__workspace-copy">
            <strong>{{ props.currentWorkspace.name }}</strong>
            <span>{{ props.currentWorkspace.description || '当前文档仓库还没有补充描述。' }}</span>
          </div>
        </div>

        <dl class="desktop-settings-panel__metrics">
          <div>
            <dt>文档仓库总数</dt>
            <dd>{{ props.workspaceCount }}</dd>
          </div>
          <div>
            <dt>文档源</dt>
            <dd>{{ props.sourceCount }}</dd>
          </div>
          <div>
            <dt>文档数</dt>
            <dd>{{ props.docCount }}</dd>
          </div>
          <div>
            <dt>异常源</dt>
            <dd>{{ props.unhealthySourceCount }}</dd>
          </div>
        </dl>
      </div>

      <div class="desktop-settings-panel__list">
        <button class="desktop-settings-panel__row" type="button" @click="emit('editWorkspace')">
          <span class="desktop-settings-panel__row-copy">
            <strong>编辑文档仓库</strong>
            <span>修改名称、描述、主题色和默认搜索范围。</span>
          </span>
          <span class="desktop-settings-panel__row-state">编辑</span>
        </button>

        <button class="desktop-settings-panel__row" type="button" @click="emit('editSources')">
          <span class="desktop-settings-panel__row-copy">
            <strong>管理文档源</strong>
            <span>维护文档源树、分组结构、路径和启用状态。</span>
          </span>
          <span class="desktop-settings-panel__row-state">管理</span>
        </button>

        <button
          class="desktop-settings-panel__row"
          :disabled="props.isExportingWorkspace"
          type="button"
          @click="emit('exportWorkspace')"
        >
          <span class="desktop-settings-panel__row-copy">
            <strong>导出文档仓库</strong>
            <span>{{ props.isExportingWorkspace ? '导出中…' : '导出当前文档仓库配置，便于迁移和备份。' }}</span>
          </span>
          <span class="desktop-settings-panel__row-state">导出</span>
        </button>

        <button
          class="desktop-settings-panel__row"
          :disabled="props.isImportingWorkspace"
          type="button"
          @click="emit('importWorkspace')"
        >
          <span class="desktop-settings-panel__row-copy">
            <strong>导入文档仓库</strong>
            <span>{{ props.isImportingWorkspace ? '导入中…' : '从配置文件导入新的文档仓库。' }}</span>
          </span>
          <span class="desktop-settings-panel__row-state">导入</span>
        </button>

        <button class="desktop-settings-panel__row" type="button" @click="emit('createWorkspace')">
          <span class="desktop-settings-panel__row-copy">
            <strong>新建文档仓库</strong>
            <span>为新的项目、团队或知识域创建独立入口。</span>
          </span>
          <span class="desktop-settings-panel__row-state">新建</span>
        </button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.desktop-settings-panel {
  display: grid;
  gap: 0.9rem;
}

.desktop-settings-panel__hero,
.desktop-settings-panel__group {
  display: grid;
  gap: 0.7rem;
  padding: 0.96rem 1rem;
  border: 1px solid var(--desktop-line);
  border-radius: 20px;
  background: var(--desktop-surface);
}

.desktop-settings-panel__hero {
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.06), transparent 56%),
    var(--desktop-surface);
}

.desktop-settings-panel__hero-copy {
  display: grid;
  gap: 0.18rem;
}

.desktop-settings-panel__kicker {
  margin: 0;
  color: var(--desktop-soft);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.desktop-settings-panel__title {
  margin: 0.12rem 0 0;
  color: var(--desktop-ink);
  font-size: 1rem;
  font-weight: 670;
}

.desktop-settings-panel__summary,
.desktop-settings-panel__group-head p {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.76rem;
  line-height: 1.55;
}

.desktop-settings-panel__group-head {
  display: grid;
  gap: 0.2rem;
}

.desktop-settings-panel__group-head h4 {
  margin: 0;
  color: var(--desktop-ink);
  font-size: 0.82rem;
  font-weight: 650;
}

.desktop-settings-panel__workspace-card {
  display: grid;
  gap: 0.72rem;
  padding: 0.82rem 0.86rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.12);
  border-radius: 18px;
  background: rgba(var(--desktop-accent-rgb), 0.04);
}

.desktop-settings-panel__workspace-top {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.8rem;
  align-items: start;
}

.desktop-settings-panel__workspace-color {
  width: 0.92rem;
  height: 0.92rem;
  margin-top: 0.18rem;
  border-radius: 999px;
  background: var(--workspace-color);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--workspace-color) 18%, transparent);
}

.desktop-settings-panel__workspace-copy {
  display: grid;
  gap: 0.16rem;
}

.desktop-settings-panel__workspace-copy strong {
  color: var(--desktop-ink);
  font-size: 0.84rem;
  font-weight: 650;
}

.desktop-settings-panel__workspace-copy span,
.desktop-settings-panel__metrics dt {
  color: var(--desktop-muted);
  font-size: 0.72rem;
  line-height: 1.48;
}

.desktop-settings-panel__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.46rem;
  margin: 0;
}

.desktop-settings-panel__metrics div {
  display: grid;
  gap: 0.12rem;
  padding: 0.62rem 0.68rem;
  border: 1px solid var(--desktop-line);
  border-radius: 12px;
  background: var(--desktop-surface-strong);
}

.desktop-settings-panel__metrics dd {
  margin: 0;
  color: var(--desktop-ink);
  font-size: 0.92rem;
  font-weight: 670;
}

.desktop-settings-panel__list {
  display: grid;
  gap: 0.5rem;
}

.desktop-settings-panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.9rem;
  padding: 0.78rem 0.84rem;
  border: 1px solid var(--desktop-line);
  border-radius: 14px;
  background: var(--desktop-surface-strong);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.86rem;
  min-height: 1.66rem;
  padding: 0 0.62rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  color: var(--desktop-accent);
  font-size: 0.66rem;
  font-weight: 700;
}

.desktop-settings-panel__row:hover {
  border-color: rgba(var(--desktop-accent-rgb), 0.16);
  background: rgba(var(--desktop-accent-rgb), 0.05);
  transform: translateY(-1px);
}

.desktop-settings-panel__row:disabled {
  cursor: progress;
  opacity: 0.72;
}

@media (max-width: 1120px) {
  .desktop-settings-panel__metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

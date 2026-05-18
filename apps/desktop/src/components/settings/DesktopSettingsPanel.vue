<template>
  <section class="desktop-settings-panel">
    <header class="desktop-settings-panel__header">
      <p class="desktop-settings-panel__eyebrow">Roadmap</p>
      <h2 class="desktop-settings-panel__title">当前阶段</h2>
    </header>

    <div class="desktop-settings-panel__timeline">
      <article class="desktop-settings-panel__step">
        <strong>Monorepo</strong>
        <p>Web 与 Desktop 已分离，后续共享核心可以独立演进。</p>
      </article>

      <article class="desktop-settings-panel__step">
        <strong>SQLite</strong>
        <p>Workspace schema 与 repository 已设计完成，下一步接真实读写。</p>
      </article>

      <article class="desktop-settings-panel__step">
        <strong>Next</strong>
        <p>继续实现 Workspace CRUD、目录选择器和运行时索引。</p>
      </article>
    </div>

    <div class="desktop-settings-panel__note">
      <span class="desktop-settings-panel__note-label">Design Goal</span>
      <p>界面保持简单、耐看、适合长时间阅读和频繁切换多个项目文档。</p>
    </div>
  </section>
</template>

<style scoped>
.desktop-settings-panel {
  display: grid;
  gap: 0.95rem;
  padding: 1.15rem;
  border-radius: var(--desktop-radius-lg);
}

.desktop-settings-panel__header {
  display: grid;
  gap: 0.45rem;
}

.desktop-settings-panel__eyebrow {
  margin: 0;
  color: var(--desktop-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.desktop-settings-panel__title {
  margin: 0;
  font-size: 1.18rem;
}

.desktop-settings-panel__timeline {
  display: grid;
  gap: 0.7rem;
}

.desktop-settings-panel__step {
  position: relative;
  display: grid;
  gap: 0.45rem;
  padding: 0.9rem 0.95rem 0.9rem 1rem;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-md);
  background: var(--desktop-surface-strong);
}

.desktop-settings-panel__step::before {
  content: '';
  position: absolute;
  top: 0.9rem;
  left: 0;
  bottom: 0.9rem;
  width: 3px;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.72);
}

.desktop-settings-panel__step strong,
.desktop-settings-panel__step p,
.desktop-settings-panel__note p {
  margin: 0;
}

.desktop-settings-panel__step p,
.desktop-settings-panel__note p {
  color: var(--desktop-muted);
  line-height: 1.6;
}

.desktop-settings-panel__note {
  display: grid;
  gap: 0.45rem;
  padding: 0.95rem 1rem;
  border: 1px dashed var(--desktop-line-strong);
  border-radius: var(--desktop-radius-md);
  background: rgba(var(--desktop-accent-rgb), 0.05);
}

.desktop-settings-panel__note-label {
  color: var(--desktop-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
</style>

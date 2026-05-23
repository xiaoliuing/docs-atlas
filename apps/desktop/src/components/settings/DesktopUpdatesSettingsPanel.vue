<script setup lang="ts">
  import { computed } from "vue";
  import type {
    DesktopLatestRelease,
    DesktopReleaseUpdateStatus,
  } from "@/composables/useDesktopReleaseUpdates";

  const props = defineProps<{
    currentVersion?: string;
    lastCheckedAt?: string;
    latestRelease: DesktopLatestRelease | null;
    updateMessage?: string;
    updateStatus: DesktopReleaseUpdateStatus;
  }>();

  const emit = defineEmits<{
    checkUpdates: [];
    installUpdate: [];
    openLatestRelease: [];
  }>();

  const updateActionLabel = computed(() => {
    if (props.updateStatus === "checking") {
      return "检查中…";
    }

    if (props.updateStatus === "available") {
      return "下载并安装";
    }

    if (props.updateStatus === "downloading") {
      return "下载中…";
    }

    if (
      props.updateStatus === "installing" ||
      props.updateStatus === "relaunching"
    ) {
      return "安装中…";
    }

    return "检查更新";
  });

  const updateMeta = computed(() => {
    if (!props.lastCheckedAt) {
      return "尚未检查过更新。";
    }

    const date = new Date(props.lastCheckedAt);
    if (Number.isNaN(date.getTime())) {
      return "已完成更新检查。";
    }

    return `最近检查：${new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)}`;
  });

  const latestReleaseMeta = computed(() => {
    if (!props.latestRelease?.publishedAt) {
      return "";
    }

    const date = new Date(props.latestRelease.publishedAt);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return `发布于 ${new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
    }).format(date)}`;
  });
</script>

<template>
  <section class="desktop-settings-panel">
    <header class="desktop-settings-panel__hero">
      <div class="desktop-settings-panel__hero-copy">
        <p class="desktop-settings-panel__kicker">Updates</p>
        <h3 class="desktop-settings-panel__title">应用更新</h3>
        <p class="desktop-settings-panel__summary">
          检查桌面端是否有新的正式版本，在应用内下载并安装更新，必要时也可以手动打开
          GitHub Release 页面。
        </p>
      </div>

      <div class="desktop-settings-panel__hero-badge">
        <span>当前版本</span>
        <strong>{{ props.currentVersion || "读取中…" }}</strong>
      </div>
    </header>

    <div class="desktop-settings-panel__layout">
      <section class="desktop-settings-panel__group">
        <div class="desktop-settings-panel__group-head">
          <h4>更新操作</h4>
          <p>{{ updateMeta }}</p>
        </div>

        <div class="desktop-settings-panel__update-card">
          <div class="desktop-settings-panel__update-main">
            <strong class="desktop-settings-panel__update-version">
              {{
                props.latestRelease?.version
                  ? `最新版本 ${props.latestRelease.version}`
                  : "检查最新稳定版"
              }}
            </strong>
            <span class="desktop-settings-panel__update-note">
              {{ props.latestRelease?.name ?? "尚未获取远程版本信息。" }}
            </span>
            <span
              v-if="latestReleaseMeta"
              class="desktop-settings-panel__update-meta"
            >
              {{ latestReleaseMeta }}
            </span>
          </div>

          <button
            class="desktop-settings-panel__update-action"
            :disabled="
              props.updateStatus === 'checking' ||
              props.updateStatus === 'downloading' ||
              props.updateStatus === 'installing' ||
              props.updateStatus === 'relaunching'
            "
            type="button"
            @click="
              props.updateStatus === 'available'
                ? emit('installUpdate')
                : emit('checkUpdates')
            "
          >
            {{ updateActionLabel }}
          </button>
        </div>

        <p
          v-if="props.updateMessage"
          :class="[
            'desktop-settings-panel__feedback',
            {
              'desktop-settings-panel__feedback--error':
                props.updateStatus === 'error',
              'desktop-settings-panel__feedback--success':
                props.updateStatus === 'available' ||
                props.updateStatus === 'up-to-date',
            },
          ]"
        >
          {{ props.updateMessage }}
        </p>
      </section>

      <section class="desktop-settings-panel__group">
        <div class="desktop-settings-panel__group-head">
          <h4>版本信息</h4>
          <p>如果应用内更新失败，也可以直接跳转到 Release 页面手动下载。</p>
        </div>

        <div class="desktop-settings-panel__meta-list">
          <div class="desktop-settings-panel__meta-item">
            <span>当前版本</span>
            <strong>{{ props.currentVersion || "读取中…" }}</strong>
          </div>
          <div class="desktop-settings-panel__meta-item">
            <span>最新版本</span>
            <strong>{{ props.latestRelease?.version || "未检查" }}</strong>
          </div>
          <div class="desktop-settings-panel__meta-item">
            <span>最近检查</span>
            <strong>{{ updateMeta }}</strong>
          </div>
        </div>

        <button
          class="desktop-settings-panel__release-link"
          type="button"
          @click="emit('openLatestRelease')"
        >
          在浏览器中打开 GitHub Release 页面
        </button>
      </section>
    </div>
  </section>
</template>

<style scoped>
  .desktop-settings-panel {
    display: grid;
    gap: 1rem;
  }

  .desktop-settings-panel__hero {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.05rem;
    border: 1px solid var(--desktop-line);
    border-radius: 20px;
    background:
      linear-gradient(
        135deg,
        rgba(var(--desktop-accent-rgb), 0.1),
        rgba(var(--desktop-accent-rgb), 0.03)
      ),
      var(--desktop-surface-strong);
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
  .desktop-settings-panel__group-head p,
  .desktop-settings-panel__feedback {
    margin: 0;
    color: var(--desktop-muted);
    font-size: 0.78rem;
    line-height: 1.6;
  }

  .desktop-settings-panel__hero-badge {
    display: grid;
    align-content: center;
    gap: 0.14rem;
    min-width: 11rem;
    padding: 0.88rem 0.96rem;
    border: 1px solid rgba(var(--desktop-accent-rgb), 0.12);
    border-radius: 16px;
    background: rgba(var(--desktop-accent-rgb), 0.05);
  }

  .desktop-settings-panel__hero-badge span {
    color: var(--desktop-soft);
    font-size: 0.7rem;
    font-weight: 600;
  }

  .desktop-settings-panel__hero-badge strong {
    color: var(--desktop-ink);
    font-size: 0.84rem;
    font-weight: 650;
  }

  .desktop-settings-panel__layout {
    display: grid;
    grid-template-columns: minmax(0, 1.18fr) minmax(0, 0.82fr);
    gap: 1rem;
  }

  .desktop-settings-panel__group {
    display: flex;
    flex-direction: column;
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

  .desktop-settings-panel__update-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.95rem 1rem;
    border: 1px solid var(--desktop-line);
    border-radius: 16px;
    background:
      linear-gradient(
        180deg,
        rgba(var(--desktop-accent-rgb), 0.08),
        rgba(var(--desktop-accent-rgb), 0.03)
      ),
      var(--desktop-surface-strong);
  }

  .desktop-settings-panel__update-main {
    display: grid;
    gap: 0.18rem;
    min-width: 0;
  }

  .desktop-settings-panel__update-version {
    color: var(--desktop-ink);
    font-size: 0.84rem;
    font-weight: 650;
  }

  .desktop-settings-panel__update-note,
  .desktop-settings-panel__update-meta {
    color: var(--desktop-muted);
    font-size: 0.74rem;
    line-height: 1.55;
  }

  .desktop-settings-panel__update-action {
    flex: none;
    min-width: 6.6rem;
    padding: 0.72rem 0.92rem;
    border: 1px solid rgba(var(--desktop-accent-rgb), 0.18);
    border-radius: 12px;
    background: rgba(var(--desktop-accent-rgb), 0.12);
    color: var(--desktop-accent);
    font-size: 0.76rem;
    font-weight: 640;
    cursor: pointer;
    transition:
      background-color 0.18s ease,
      border-color 0.18s ease,
      transform 0.18s ease;
  }

  .desktop-settings-panel__update-action:hover {
    background: rgba(var(--desktop-accent-rgb), 0.18);
    border-color: rgba(var(--desktop-accent-rgb), 0.28);
    transform: translateY(-1px);
  }

  .desktop-settings-panel__update-action:disabled {
    cursor: progress;
    opacity: 0.72;
    transform: none;
  }

  .desktop-settings-panel__meta-list {
    display: grid;
    gap: 0.58rem;
  }

  .desktop-settings-panel__meta-item {
    display: grid;
    gap: 0.14rem;
    padding: 0.82rem 0.88rem;
    border: 1px solid var(--desktop-line);
    border-radius: 14px;
    background: var(--desktop-surface-strong);
  }

  .desktop-settings-panel__meta-item span {
    color: var(--desktop-soft);
    font-size: 0.68rem;
    font-weight: 600;
  }

  .desktop-settings-panel__meta-item strong {
    color: var(--desktop-ink);
    font-size: 0.78rem;
    font-weight: 620;
    line-height: 1.5;
  }

  .desktop-settings-panel__feedback {
    padding: 0.65rem 0.72rem;
    border: 1px solid rgba(var(--desktop-accent-rgb), 0.14);
    border-radius: 12px;
    background: rgba(var(--desktop-accent-rgb), 0.05);
  }

  .desktop-settings-panel__feedback--success {
    border-color: rgba(var(--desktop-accent-rgb), 0.18);
  }

  .desktop-settings-panel__feedback--error {
    border-color: rgba(199, 72, 92, 0.22);
    background: rgba(199, 72, 92, 0.08);
    color: var(--desktop-ink);
  }

  .desktop-settings-panel__release-link {
    justify-self: start;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--desktop-accent);
    font-size: 0.74rem;
    font-weight: 600;
    cursor: pointer;
  }

  .desktop-settings-panel__release-link:hover {
    text-decoration: underline;
  }

  @media (max-width: 1040px) {
    .desktop-settings-panel__hero {
      flex-direction: column;
    }

    .desktop-settings-panel__hero-badge {
      min-width: 0;
    }

    .desktop-settings-panel__layout {
      grid-template-columns: 1fr;
    }

    .desktop-settings-panel__update-card {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>

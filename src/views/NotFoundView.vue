<template>
  <section class="not-found">
    <p class="not-found__eyebrow">
      404
    </p>
    <h1 class="not-found__title">
      页面不存在
    </h1>
    <p class="not-found__body">
      这个地址没有对应的首页、专题或文档。可以从左侧目录或首页重新进入。
    </p>
    <RouterLink
      class="not-found__link"
      to="/"
    >
      返回首页
    </RouterLink>
  </section>
</template>

<style scoped>
.not-found {
  display: grid;
  gap: 0.8rem;
  padding: 2rem;
  border: 1px solid var(--color-line);
  border-radius: 32px;
  background: var(--surface-panel);
}

.not-found__eyebrow {
  margin: 0;
  color: var(--color-soft);
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.not-found__title {
  margin: 0;
  font-family: var(--font-display);
}

.not-found__body {
  margin: 0;
  color: var(--color-muted);
}

.not-found__link {
  color: var(--color-accent);
  text-decoration: none;
}
</style>

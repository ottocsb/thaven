<template>
  <div class="not-found-page">
    <section class="not-found-card app-panel">
      <div class="code">
        404
      </div>
      <h1>页面不存在</h1>
      <p>当前地址没有对应的页面。</p>
      <RouterLink class="app-button primary" to="/">
        回到首页
      </RouterLink>
    </section>
  </div>
</template>

<style scoped>
.not-found-page {
  align-items: center;
  background: var(--app-background);
  color: var(--app-text);
  display: flex;
  min-height: 100vh;
  justify-content: center;
  padding: 24px;
}

.not-found-card {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 420px;
  padding: 36px;
  text-align: center;
  width: 100%;
}

.code {
  color: var(--app-primary);
  font-family: var(--app-font-mono);
  font-size: 48px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

h1 {
  font-size: 22px;
  margin: 0;
}

p {
  color: var(--app-text-muted);
  margin: 0 0 8px;
}
</style>

<route lang="json">
{
"meta": {
"title": "404",
"layout": "notFound"
}
}
</route>

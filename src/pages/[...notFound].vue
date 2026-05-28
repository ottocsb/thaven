<template>
  <div class="not-found-page">
    <n-result
      status="404"
      title="页面不存在"
      description="当前地址没有对应的页面。"
    >
      <template #footer>
        <RouterLink to="/">
          <n-button type="primary">
            回到首页
          </n-button>
        </RouterLink>
      </template>
    </n-result>
  </div>
</template>

<style scoped>
.not-found-page {
  align-items: center;
  display: flex;
  min-height: 100vh;
  justify-content: center;
  padding: 24px;
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

<template>
  <div class="app-shell">
    <Menu />
    <header class="app-topbar">
      <div>
        <div class="app-topbar-title">
          thaven
        </div>
        <div class="app-topbar-meta">
          WALLHAVEN DESKTOP CLIENT
        </div>
      </div>
    </header>
    <main class="app-content">
      <router-view v-slot="{ Component }">
        <keep-alive exclude="LocalListPage">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>
  </div>
</template>

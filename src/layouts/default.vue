<template>
  <n-space vertical>
    <n-layout has-sider position="absolute">
      <n-layout-sider
        :collapsed-width="50"
        :width="190"
        bordered
        collapse-mode="width"
        show-trigger
      >
        <Menu />
      </n-layout-sider>
      <n-layout-content bordered min-h-screen>
        <router-view v-slot="{ Component }">
          <keep-alive exclude="LocalListPage">
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </n-layout-content>
    </n-layout>
  </n-space>
</template>

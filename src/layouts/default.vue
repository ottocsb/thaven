<template>
	<n-space vertical>
		<n-layout has-sider>
			<n-layout-sider
				:collapsed-width="50"
				:width="190"
				bordered
				collapse-mode="width"
				show-trigger
			>
				<Menu/>
			</n-layout-sider>
			<n-layout-content bordered min-h-screen>
				<router-view v-slot="{ Component }">
					<transition mode="out-in" name="fade">
						<component :is="Component"/>
					</transition>
				</router-view>
			</n-layout-content>
		</n-layout>
	</n-space>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>

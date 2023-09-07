<script lang="ts" setup>
import {NIcon} from 'naive-ui'
import {h, Component} from 'vue'
import {
	Albums as AlbumsIcon,
	Apps as AppsIcon,
	Archive as ArchiveIcon,
	Settings as setupIcon,
	Fish as FishIcon,
} from '@vicons/ionicons5'

function renderIcon(icon: Component) {
	return () => h(NIcon, null, {default: () => h(icon)})
}

const router = useRouter()
const route = useRoute()
const {t} = useI18n()
const menuOptions = [
	{
		label: () => t('onlineList'),
		key: '/',
		icon: renderIcon(AppsIcon),
	},
	{
		label: () => t('localList'),
		key: '/localList',
		icon: renderIcon(AlbumsIcon),
	},
	{
		label: () => t('downloadCenter'),
		key: '/downloadCenter',
		icon: renderIcon(ArchiveIcon),
	},
	{
		label: () => t('setup'),
		key: '/setup',
		icon: renderIcon(setupIcon),
	},
	{
		label: () => t('about'),
		key: '/about',
		icon: renderIcon(FishIcon),
	},
]
const handleUpdateValue = (value: any) => {
	console.log(value)
	router.push({path: value})
}
</script>

<template>
	<n-menu
		:default-value="route.path"
		:options="menuOptions"
		@update:value="handleUpdateValue"
	/>
</template>

<style scoped></style>

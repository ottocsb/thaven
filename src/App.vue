<template>
	<n-config-provider :theme="naiveTheme">
		<router-view/>
		<n-global-style/>
	</n-config-provider>
</template>
<script lang="ts" setup>
import {NConfigProvider} from 'naive-ui'
import {naiveTheme} from 'vue-dark-switch'
</script>

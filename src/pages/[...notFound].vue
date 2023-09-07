<script lang="ts" setup>
const typedRef = useTyped([' is not found!'])
</script>

<template>
	<div class="h-screen flex flex-wrap items-center justify-around text-center">
		<div flex-1 font-bold w-300px>
			<div class="code text-7xl">404</div>
			<div ref="typedRef" class="content mb-5 text-3xl">The Page</div>
			<RouterLink to="/">
				<button
					class="rounded bg-light-800 px-5 py-2 text-lg transition"
					dark="text-black"
					hover="shadow-md"
				>
					Go Home
				</button>
			</RouterLink>
		</div>
	</div>
</template>

<style>
.code {
	margin-bottom: 20px;
}

.content {
	height: 40px;
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

// https://unocss.dev/ 原子 css 库
import '@unocss/reset/tailwind-compat.css' // unocss reset
import 'virtual:uno.css'
import 'virtual:unocss-devtools'
import { invoke } from '@tauri-apps/api'

// 你自定义的 css
import './styles/main.css'

import App from './App.vue'

invoke('greet', { name: 'World' }).then((message) => {
	console.log(message) // Hello, World!
})

const app = createApp(App)

app.mount('#app')

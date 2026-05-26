import { defineStore } from 'pinia'

export default defineStore('app-settings', {
  state: () => ({
    apikey: '',
    downloadDir: '',
  }),
  actions: {
    setApikey(apikey: string) {
      this.apikey = apikey.trim()
    },
    setDownloadDir(downloadDir: string) {
      this.downloadDir = downloadDir.trim()
    },
    resetSettings() {
      this.apikey = ''
      this.downloadDir = ''
    },
  },
  persist: true,
})

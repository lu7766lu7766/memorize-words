import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { initPwa } from './pwa'

export function bootstrapApp() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)

  return { app, pinia }
}

const { app, pinia } = bootstrapApp()

if (typeof document !== 'undefined') {
  app.mount('#app')

  // Register PWA service worker
  initPwa()
}

export { app, pinia }

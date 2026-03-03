import { createApp } from 'vue'
import './assets/styles/index.css' // Import global styles
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import permissionDirective from './directives/permission'

const app = createApp(App)

// Use Plugins
app.use(createPinia())
app.use(router)
app.use(ElementPlus, { size: 'default', zIndex: 3000 })

// Register Element Plus Icons globally
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// Register Directives
app.directive('perm', permissionDirective)

app.mount('#app')

<template>
  <div class="app-wrapper">
    <!-- Sidebar -->
    <div class="sidebar-container">
      <div class="logo">
        <span class="logo-text">智慧教育大数据</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
      >
        <template v-for="route in filteredRoutes" :key="route.path">
          <!-- 只有 1 个可见子路由时，直接提到一级菜单（如总览看板） -->
          <el-menu-item 
            v-if="hasOneShowingChild(route.children, route)" 
            :index="resolvePath(route.path, getOnlyOneChild(route.children, route).path)"
          >
            <template #title>
              <el-icon v-if="getOnlyOneChild(route.children, route).meta?.icon">
                <component :is="getOnlyOneChild(route.children, route).meta.icon" />
              </el-icon>
              <span>{{ getOnlyOneChild(route.children, route).meta?.title || getOnlyOneChild(route.children, route).name }}</span>
            </template>
          </el-menu-item>

          <!-- 有多个子路由时，渲染折叠菜单（如分析中心、学生学习） -->
          <el-sub-menu 
            v-else-if="route.children && route.children.length > 0 && !route.hidden" 
            :index="route.path"
          >
            <template #title>
              <el-icon v-if="route.meta && route.meta.icon">
                <component :is="route.meta.icon" />
              </el-icon>
              <span>{{ route.meta ? route.meta.title : route.name }}</span>
            </template>
            <el-menu-item 
              v-for="child in route.children" 
              :key="child.path" 
              :index="resolvePath(route.path, child.path)"
            >
              <template #title>
                <el-icon v-if="child.meta && child.meta.icon">
                   <component :is="child.meta.icon" />
                </el-icon>
                <span>{{ child.meta ? child.meta.title : child.name }}</span>
              </template>
            </el-menu-item>
          </el-sub-menu>

          <!-- 没有任何 children 的纯一级路由（通常没有，预留） -->
          <el-menu-item v-else-if="!route.hidden && !route.children" :index="route.path">
            <template #title>
              <el-icon v-if="route.meta && route.meta.icon">
                <component :is="route.meta.icon" />
              </el-icon>
              <span>{{ route.meta ? route.meta.title : route.name }}</span>
             </template>
          </el-menu-item>
        </template>
      </el-menu>
    </div>

    <!-- Main Content Header & Container -->
    <div class="main-container">
      <div class="navbar">
        <div class="breadcrumb">
           <el-breadcrumb separator="/">
             <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
             <el-breadcrumb-item v-if="currentRouteMeta.title !== '首页'">{{ currentRouteMeta.title }}</el-breadcrumb-item>
           </el-breadcrumb>
        </div>
        <div class="right-menu">
          <el-dropdown trigger="click">
            <div class="avatar-wrapper">
              <span>{{ name }}</span>
              <el-icon><CaretBottom /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      
      <div class="app-main">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { constantRoutes } from '@/router/index'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const name = computed(() => userStore.name)

// Simple route filtering based on permission
const filteredRoutes = computed(() => {
   return constantRoutes.filter(r => {
      // If it has children, check if any child is permitted
      if(r.children) {
         r.children = r.children.filter(child => {
            if(child.meta && child.meta.permission) {
               return userStore.hasPermission(child.meta.permission)
            }
            return true;
         })
         return r.children.length > 0;
      }
      return true;
   })
})

const activeMenu = computed(() => {
  const { path } = route
  return path
})

const currentRouteMeta = computed(() => {
   return route.meta
})

const resolvePath = (basePath, routePath) => {
   if(basePath === '/') {
      return '/' + routePath
   }
   return basePath + '/' + routePath
}

const logout = async () => {
  await userStore.logout()
}

// Utils to determine whether to render as single menu or submenu
const hasOneShowingChild = (children = [], parent) => {
  const showingChildren = children.filter(item => {
    if (item.hidden) {
      return false
    } else {
      return true
    }
  })

  // When there is only one child router, the child router is displayed by default
  if (showingChildren.length === 1) {
    return true
  }

  // Show parent if there are no child router to display
  if (showingChildren.length === 0) {
    return false
  }

  return false
}

const getOnlyOneChild = (children = [], parent) => {
  const showingChildren = children.filter(item => !item.hidden)
  if (showingChildren.length === 1) {
    return showingChildren[0]
  }
  return { ...parent, path: '', noShowingChildren: true }
}
</script>

<style scoped>
.app-wrapper {
  display: flex;
  height: 100vh;
  width: 100%;
}
.sidebar-container {
  width: 250px;
  height: 100%;
  background-color: #304156;
  transition: width 0.28s;
  display: flex;
  flex-direction: column;
}
.logo {
  flex-shrink: 0;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: bold;
  font-size: 19px;
  border-bottom: 1px solid #1f2d3d;
  white-space: nowrap;
  letter-spacing: 2px;
  padding: 0 10px;
  box-sizing: border-box;
}
.el-menu-vertical {
  border-right: none;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 美化侧边栏滚动条以免太宽挤占空间 */
.el-menu-vertical::-webkit-scrollbar {
  width: 4px;
}
.el-menu-vertical::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f0f2f5;
}
.navbar {
  height: 60px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}
.avatar-wrapper {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}
.app-main {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  position: relative;
}

/* fade-transform */
.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all .2s;
}
.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-15px);
}
.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(15px);
}
</style>

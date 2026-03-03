import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/user'
import Layout from '@/layout/index.vue'

// Basic static routes
export const constantRoutes = [
    {
        path: '/login',
        component: () => import('@/views/Login.vue'),
        hidden: true
    },
    {
        path: '/',
        component: Layout,
        redirect: '/overview',
        children: [
            {
                path: 'overview',
                name: 'Overview',
                component: () => import('@/views/overview/index.vue'),
                meta: { title: '总览看板', icon: 'DataLine', affix: true }
            }
        ]
    },
    {
        path: '/analysis',
        component: Layout,
        redirect: '/analysis/compare',
        meta: { title: '分析中心', icon: 'PieChart' },
        children: [
            {
                path: 'compare',
                name: 'CompareAnalysis',
                component: () => import('@/views/analysis/Compare.vue'),
                meta: { title: '统一对比分析', icon: 'ScaleToOriginal', permission: 'analysis:compare' }
            },
            {
                path: 'group-trend',
                name: 'GroupTrendAnalysis',
                component: () => import('@/views/analysis/GroupTrend.vue'),
                meta: { title: '群体对比看板', icon: 'Histogram' }
            }
        ]
    },
    {
        path: '/student',
        component: Layout,
        redirect: '/student/scores',
        meta: { title: '学生学习', icon: 'User' },
        children: [
            {
                path: 'profile',
                name: 'StudentProfile',
                component: () => import('@/views/student/Profile.vue'),
                meta: { title: '基本信息', icon: 'UserFilled' }
            },
            {
                path: 'scores',
                name: 'StudentScores',
                component: () => import('@/views/student/Scores.vue'),
                meta: { title: '成绩明细查询', icon: 'Document' }
            }
        ]
    },
    {
        path: '/course',
        component: Layout,
        redirect: '/course/enroll-dashboard',
        meta: { title: '课程优化', icon: 'Reading' },
        children: [
            {
                path: 'enroll-dashboard',
                name: 'EnrollDashboard',
                component: () => import('@/views/course/EnrollDashboard.vue'),
                meta: { title: '选课看板', icon: 'Odometer' }
            },
            {
                path: 'enroll-forecast',
                name: 'EnrollForecast',
                component: () => import('@/views/course/EnrollForecast.vue'),
                meta: { title: '选课趋势预测', icon: 'TrendCharts' }
            }
        ]
    },
    {
        path: '/teacher',
        component: Layout,
        redirect: '/teacher/profile',
        meta: { title: '教师中心', icon: 'Avatar' },
        children: [
            {
                path: 'profile',
                name: 'TeacherProfile',
                component: () => import('@/views/teacher/Profile.vue'),
                meta: { title: '基本信息', icon: 'UserFilled' }
            }
        ]
    },
    // Catch all 404
    {
        path: '/:pathMatch(.*)*',
        redirect: '/overview',
        hidden: true
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: constantRoutes,
    scrollBehavior: () => ({ top: 0 })
})

const whiteList = ['/login'] // no redirect whitelist

router.beforeEach(async (to, from, next) => {
    // Determine whether the user has logged in
    const userStore = useUserStore()
    const hasToken = userStore.token

    if (hasToken) {
        if (to.path === '/login') {
            // if is logged in, redirect to the home page
            next({ path: '/' })
        } else {
            // Check if user has obtained his permission roles
            const hasRoles = userStore.roles && userStore.roles.length > 0
            if (hasRoles) {
                next()
            } else {
                try {
                    // Get user info and permissions
                    await userStore.getUserInfo()
                    // Here we could implement dynamic routes. For simplicity in this demo, all routes are mounted
                    // but access is restricted via menu filtering and direct URL checking:
                    if (to.meta.permission && !userStore.hasPermission(to.meta.permission)) {
                        // if no access 
                        next({ path: '/overview' })
                    } else {
                        next()
                    }
                } catch (error) {
                    await userStore.logout()
                    next(`/login?redirect=${to.path}`)
                }
            }
        }
    } else {
        // has no token
        if (whiteList.indexOf(to.path) !== -1) {
            // in the free login whitelist, go directly
            next()
        } else {
            // other pages that do not have permission to access are redirected to the login page.
            next(`/login?redirect=${to.path}`)
        }
    }
})

export default router

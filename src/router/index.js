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
        redirect: () => {
            const userStore = useUserStore()
            if (userStore.roles.includes('STUDENT')) return '/student/profile'
            if (userStore.roles.includes('TEACHER')) return '/teacher/profile'
            return '/overview'
        },
        children: [
            {
                path: 'overview',
                name: 'Overview',
                component: () => import('@/views/overview/index.vue'),
                meta: { title: '总览看板', icon: 'DataLine', affix: true, roles: ['COLLEGE_ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'] }
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
                meta: { title: '统一对比分析', icon: 'ScaleToOriginal', permission: 'analysis:compare', roles: ['COLLEGE_ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'] }
            },
            {
                path: 'group-trend',
                name: 'GroupTrendAnalysis',
                component: () => import('@/views/analysis/GroupTrend.vue'),
                meta: { title: '群体对比看板', icon: 'Histogram', roles: ['COLLEGE_ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'STUDENT'] }
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
            },
            {
                path: 'progress',
                name: 'ProgressTrend',
                component: () => import('@/views/student/ProgressTrend.vue'),
                meta: { title: '进步趋势追踪', icon: 'TrendCharts' }
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
                path: 'enrollment',
                name: 'Enrollment',
                component: () => import('@/views/course/Enrollment.vue'),
                meta: { title: '选课名单', icon: 'List', roles: ['TEACHER', 'COLLEGE_ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'] }
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
                meta: { title: '基本信息', icon: 'UserFilled', roles: ['TEACHER', 'COLLEGE_ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'] }
            }
        ]
    },
    {
        path: '/system',
        component: Layout,
        redirect: '/system/config',
        meta: { title: '系统配置', icon: 'Setting', roles: ['SCHOOL_ADMIN', 'SUPER_ADMIN'] },
        children: [
            {
                path: 'config',
                name: 'SysConfig',
                component: () => import('@/views/system/Config.vue'),
                meta: { title: '基础设定', icon: 'Tools' }
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
            if (!hasRoles) {
                try {
                    await userStore.getUserInfo()
                } catch (error) {
                    await userStore.logout()
                    return next(`/login?redirect=${to.path}`)
                }
            }

            if (to.meta.permission && !userStore.hasPermission(to.meta.permission)) {
                return next({ path: '/' })
            }
            if (to.meta.roles && !to.meta.roles.some(role => userStore.roles.includes(role))) {
                return next({ path: '/' })
            }
            next()
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

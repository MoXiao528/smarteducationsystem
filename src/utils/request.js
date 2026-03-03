import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'

const service = axios.create({
    baseURL: import.meta.env.VITE_APP_BASE_API || '/api', // Use /api as default base URL
    timeout: 10000 // Request timeout
})

// Request interceptor
service.interceptors.request.use(
    config => {
        // Inject token if present
        const userStore = useUserStore()
        if (userStore.token) {
            config.headers['Authorization'] = `Bearer ${userStore.token}`
        }

        return config
    },
    error => {
        console.error(error)
        return Promise.reject(error)
    }
)

// Response interceptor
service.interceptors.response.use(
    response => {
        const res = response.data

        // Return blob for file downloads
        if (response.config.responseType === 'blob') {
            return res
        }

        // As per contract: { "code": 0, "message": "ok", "data": {} }
        // We treat code 0 as success
        if (res.code !== 0 && res.code !== undefined) {
            ElMessage({
                message: res.message || 'Error',
                type: 'error',
                duration: 5 * 1000
            })

            // 401: Unauthorized, 403: Forbidden handling logic can be added here
            if (res.code === 401) {
                const userStore = useUserStore()
                userStore.logout().then(() => {
                    location.reload()
                })
            }

            return Promise.reject(new Error(res.message || 'Error'))
        } else {
            // Direct pass for undefined code to be robust
            return res.data !== undefined ? res.data : res
        }
    },
    error => {
        console.error('err' + error) // for debug

        // Provide generic network error message if there's no response payload
        const msg = error.response?.data?.message || error.message || 'Request Failed'

        if (error.response?.status === 401) {
            const userStore = useUserStore()
            userStore.logout().then(() => {
                location.reload()
            })
        } else if (error.response?.status === 403) {
            ElMessage({
                message: '没有权限访问该资源',
                type: 'error',
                duration: 5 * 1000
            })
        } else {
            ElMessage({
                message: msg,
                type: 'error',
                duration: 5 * 1000
            })
        }

        return Promise.reject(error)
    }
)

export default service

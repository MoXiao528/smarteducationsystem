import { defineStore } from 'pinia'
import request from '@/utils/request'
import router from '@/router'

export const useUserStore = defineStore('user', {
    state: () => ({
        token: localStorage.getItem('SES_TOKEN') || '',
        id: null,
        name: '',
        roles: [],
        permissions: [],
        dataScope: {
            type: 'ALL', // ALL | COLLEGE | TEACHING | SELF
            collegeId: null,
            courseIds: [],
            classIds: [],
            studentId: null
        }
    }),
    actions: {
        setToken(token) {
            this.token = token
            localStorage.setItem('SES_TOKEN', token)
        },
        async login(loginForm) {
            try {
                const data = await request({
                    url: '/auth/login',
                    method: 'post',
                    data: loginForm
                })
                this.setToken(data.token)
                return true
            } catch (error) {
                return false
            }
        },
        async getUserInfo() {
            try {
                const data = await request({
                    url: '/auth/me',
                    method: 'get'
                })

                this.id = data.id || null
                this.name = data.name || 'Admin'
                this.roles = data.roles || []
                this.permissions = data.permissions || []
                this.dataScope = data.dataScope || { type: 'ALL' }
                return data
            } catch (error) {
                this.logout()
                throw error
            }
        },
        hasPermission(permission) {
            return this.permissions.includes(permission)
        },
        async logout() {
            this.token = ''
            this.id = null
            this.name = ''
            this.roles = []
            this.permissions = []
            this.dataScope = { type: 'ALL' }
            localStorage.removeItem('SES_TOKEN')
            router.push('/login')
        }
    }
})

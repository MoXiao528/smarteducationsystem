import { useUserStore } from '@/store/user'

/**
 * v-perm directive
 * Usage: <el-button v-perm="'analysis:compare'">Compare</el-button>
 */
export default {
    mounted(el, binding) {
        const { value } = binding
        const userStore = useUserStore()
        const permissions = userStore.permissions || []

        if (value && typeof value === 'string') {
            const hasPermission = permissions.includes(value)

            if (!hasPermission) {
                el.parentNode && el.parentNode.removeChild(el)
            }
        } else {
            throw new Error(`Need permissions! Like v-perm="'analysis:compare'"`)
        }
    }
}

<template>
  <div class="enrollment-management-container">
    <el-card shadow="never" class="filter-card">
       <GlobalFilterBar
         :show-filters="['semester', 'college', 'major', 'course']"
         :default-filters="{}"
         @filter-change="handleFilterChange"
       >
         <template #actions>
            <el-button type="primary" @click="handleSearch">查询名单</el-button>
            <el-button @click="resetQuery">重置</el-button>
         </template>
       </GlobalFilterBar>
    </el-card>

    <div class="table-card mt-20">
       <DataTable
         :data="tableData"
         :columns="columns"
         :loading="loading"
         :total="total"
         v-model:page="queryParams.page"
         v-model:size="queryParams.size"
         @fetch-data="fetchData"
         @sort-change="handleSort"
       >
          <template #status="{ row }">
             <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'">
                {{ row.status === 'ACTIVE' ? '已选' : '已退选' }}
             </el-tag>
          </template>
          <template #actions="{ row }">
             <el-button
               v-if="row.status === 'ACTIVE'"
               type="danger" size="small" text
               @click="handleDrop(row)"
             >退选</el-button>
             <el-button
               v-else
               type="success" size="small" text
               @click="handleRestore(row)"
             >恢复</el-button>
          </template>
       </DataTable>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import GlobalFilterBar from '@/components/GlobalFilterBar.vue'
import DataTable from '@/components/DataTable.vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const isAdmin = computed(() =>
  userStore.roles.some(r => ['COLLEGE_ADMIN', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'SYS_ADMIN'].includes(r))
)

const currentFilters = ref({})
const queryParams = reactive({
  page: 1,
  size: 20,
  sort: 'id,desc'
})

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const columns = computed(() => {
  const base = [
    { prop: 'studentNo', label: '学号', width: '130', sortable: true },
    { prop: 'studentName', label: '姓名', width: '120' },
    { prop: 'courseName', label: '课程', minWidth: '150' },
    { prop: 'teacherName', label: '教师', width: '120' },
    { prop: 'status', label: '选课状态', width: '120', slotName: 'status' }
  ]
  if (isAdmin.value) {
    base.push({ prop: 'actions', label: '操作', width: '160', slotName: 'actions' })
  }
  return base
})

const handleFilterChange = (filters) => {
   currentFilters.value = filters
   handleSearch()
}

const handleSearch = () => {
   queryParams.page = 1
   fetchData()
}

const resetQuery = () => {
   handleSearch()
}

const handleSort = (sortStr) => {
   queryParams.sort = sortStr
   handleSearch()
}

const fetchData = async () => {
   loading.value = true
   try {
      const params = { ...currentFilters.value, ...queryParams }

      if (userStore.roles.includes('TEACHER')) {
         delete params.collegeId
         delete params.majorId
      }

      const data = await request({
         url: '/oltp/enrolls',
         method: 'get',
         params
      })
      tableData.value = data.items || []
      total.value = data.total || 0
   } catch(e) {} finally {
      loading.value = false
   }
}

const handleDrop = async (row) => {
  await ElMessageBox.confirm(`确认将 ${row.studentName} 从 ${row.courseName} 退选？`, '退选确认')
  await request({ url: '/oltp/enrolls/drop', method: 'post', data: { id: row.id, isDrop: 1 } })
  ElMessage.success('已退选')
  fetchData()
}

const handleRestore = async (row) => {
  await ElMessageBox.confirm(`确认恢复 ${row.studentName} 的 ${row.courseName} 选课？`, '恢复确认')
  await request({ url: '/oltp/enrolls/drop', method: 'post', data: { id: row.id, isDrop: 0 } })
  ElMessage.success('已恢复')
  fetchData()
}
</script>

<style scoped>
.filter-card {
  border-radius: 8px;
}
.mt-20 {
  margin-top: 20px;
}
</style>

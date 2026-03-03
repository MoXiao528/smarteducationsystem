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
                {{ row.status === 'ACTIVE' ? '已选' : '退课' }}
             </el-tag>
          </template>
       </DataTable>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import request from '@/utils/request'
import GlobalFilterBar from '@/components/GlobalFilterBar.vue'
import DataTable from '@/components/DataTable.vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

const currentFilters = ref({})
const queryParams = reactive({
  page: 1,
  size: 20,
  sort: 'id,desc'
})

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const columns = [
  { prop: 'studentNo', label: '学号', width: '130', sortable: true },
  { prop: 'studentName', label: '姓名', width: '120' },
  { prop: 'courseName', label: '课程', minWidth: '150' },
  { prop: 'teacherName', label: '教师', width: '120' },
  { prop: 'status', label: '选课状态', width: '120', slotName: 'status' }
]

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
      
      // Filter out inputs similar to scores logic if using /oltp/enrolls 
      // where the backend automatically drops it depending on user role logic
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
</script>

<style scoped>
.filter-card {
  border-radius: 8px;
}
.mt-20 {
  margin-top: 20px;
}
</style>

<template>
  <div class="app-container">
    <!-- Student View -->
    <el-card shadow="hover" v-if="isStudent">
      <template #header>
        <div class="card-header">
          <span>学生基本信息</span>
        </div>
      </template>
      <el-descriptions v-loading="loadingPersonal" :column="2" border>
        <el-descriptions-item label="姓名">{{ profile.name }}</el-descriptions-item>
        <el-descriptions-item label="学号">{{ profile.studentNo }}</el-descriptions-item>
        <el-descriptions-item label="学院">{{ profile.collegeName }}</el-descriptions-item>
        <el-descriptions-item label="专业">{{ profile.majorName }}</el-descriptions-item>
        <el-descriptions-item label="年级">{{ profile.gradeName }}</el-descriptions-item>
        <el-descriptions-item label="班级">{{ profile.className }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- Teacher/Admin View -->
    <div v-else class="list-container">
      <el-card shadow="never" class="filter-card">
         <GlobalFilterBar
           :show-filters="['college', 'major', 'grade', 'class']"
           :default-filters="{}"
           @filter-change="handleFilterChange"
         >
           <template #actions>
              <el-input 
                v-model="queryParams.studentKey" 
                placeholder="输入学号或姓名" 
                class="search-input mr-10" 
                clearable 
                @keyup.enter="handleSearch"
              />
              <el-button type="primary" @click="handleSearch">查询</el-button>
              <el-button @click="resetQuery">重置</el-button>
           </template>
         </GlobalFilterBar>
      </el-card>

      <div class="table-card mt-20">
         <DataTable
           :data="tableData"
           :columns="columns"
           :loading="loadingTable"
           :total="total"
           v-model:page="queryParams.page"
           v-model:size="queryParams.size"
           @fetch-data="fetchTableData"
           @sort-change="handleSort"
         >
         </DataTable>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import GlobalFilterBar from '@/components/GlobalFilterBar.vue'
import DataTable from '@/components/DataTable.vue'

const userStore = useUserStore()
const isStudent = computed(() => userStore.roles.includes('STUDENT'))

// --- Student View State ---
const loadingPersonal = ref(false)
const profile = ref({})

const fetchProfile = async () => {
  loadingPersonal.value = true
  try {
    const res = await request({
      url: '/student/profile',
      method: 'get'
    })
    profile.value = res || {}
  } catch (error) {
    ElMessage.error('获取个人信息失败')
  } finally {
    loadingPersonal.value = false
  }
}

// --- Teacher/Admin View State ---
const loadingTable = ref(false)
const tableData = ref([])
const total = ref(0)
const currentFilters = ref({})
const queryParams = reactive({
  studentKey: '',
  page: 1,
  size: 20,
  sort: 'id,desc'
})

const columns = [
  { prop: 'studentNo', label: '学号', width: '150', sortable: true },
  { prop: 'name', label: '姓名', width: '150' },
  { prop: 'collegeName', label: '学院', minWidth: '150' },
  { prop: 'majorName', label: '专业', minWidth: '150' },
  { prop: 'gradeName', label: '年级', width: '100' },
  { prop: 'className', label: '班级', width: '120' }
]

const handleFilterChange = (filters) => {
   currentFilters.value = filters
   handleSearch()
}

const handleSearch = () => {
   queryParams.page = 1
   fetchTableData()
}

const resetQuery = () => {
   queryParams.studentKey = ''
   handleSearch()
}

const handleSort = (sortStr) => {
   queryParams.sort = sortStr
   handleSearch()
}

const fetchTableData = async () => {
   loadingTable.value = true
   try {
      const data = await request({
         url: '/oltp/students',
         method: 'get',
         params: {
            ...currentFilters.value,
            ...queryParams
         }
      })
      tableData.value = data.items || []
      total.value = data.total || 0
   } catch(e) {} finally {
      loadingTable.value = false
   }
}

onMounted(() => {
  if (isStudent.value) {
    fetchProfile()
  }
})
</script>

<style scoped>
.app-container {
  padding: 20px;
}
.card-header {
  font-weight: bold;
  font-size: 16px;
}
.filter-card {
  border-radius: 8px;
}
.search-input {
  width: 200px;
}
.mr-10 {
  margin-right: 10px;
}
.mt-20 {
  margin-top: 20px;
}
</style>

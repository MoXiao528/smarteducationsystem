<template>
  <div class="app-container">
    <el-card shadow="hover" v-if="isTeacher">
      <template #header>
        <div class="card-header">
          <span>教师基本信息</span>
        </div>
      </template>
      <el-descriptions v-loading="loadingPersonal" :column="2" border>
        <el-descriptions-item label="姓名">{{ profile.name }}</el-descriptions-item>
        <el-descriptions-item label="教龄">{{ profile.teachingYears }} 年</el-descriptions-item>
        <el-descriptions-item label="职称">{{ profile.title }}</el-descriptions-item>
        <el-descriptions-item label="教授课程">
          <el-tag v-for="course in profile.courses" :key="course" style="margin-right: 8px;">{{ course }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <div v-else class="list-container">
      <el-card shadow="never" class="filter-card">
         <GlobalFilterBar
           :show-filters="['college']"
           :default-filters="{}"
           @filter-change="handleFilterChange"
         >
           <template #actions>
              <el-input 
                v-model="queryParams.teacherKey" 
                placeholder="输入职工号或姓名" 
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
const isTeacher = computed(() => userStore.roles.includes('TEACHER'))

// --- Teacher View State ---
const loadingPersonal = ref(false)
const profile = ref({})

const fetchProfile = async () => {
  loadingPersonal.value = true
  try {
    const res = await request({
      url: '/teacher/profile',
      method: 'get'
    })
    profile.value = res || {}
  } catch (error) {
    ElMessage.error('获取教师信息失败')
  } finally {
    loadingPersonal.value = false
  }
}

// --- Admin View State ---
const loadingTable = ref(false)
const tableData = ref([])
const total = ref(0)
const currentFilters = ref({})
const queryParams = reactive({
  teacherKey: '',
  page: 1,
  size: 20,
  sort: 'id,desc'
})

const columns = [
  { prop: 'teacherNo', label: '职工号', width: '150', sortable: true },
  { prop: 'name', label: '姓名', width: '150' },
  { prop: 'collegeName', label: '所属学院', minWidth: '150' },
  { prop: 'title', label: '职称', width: '120' },
  { prop: 'teachingYears', label: '教龄(年)', width: '100', sortable: true }
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
   queryParams.teacherKey = ''
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
         url: '/profile/teachers',
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
  if (isTeacher.value) {
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

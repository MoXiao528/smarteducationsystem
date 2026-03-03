<template>
  <div class="scores-container">
    <el-card shadow="never" class="filter-card">
       <GlobalFilterBar
         :show-filters="['semester', 'college', 'major', 'grade', 'class', 'course']"
         :default-filters="{}"
         @filter-change="handleFilterChange"
       >
         <template #actions>
            <el-input 
              v-if="!isStudent"
              v-model="queryParams.studentKey" 
              placeholder="输入学号或姓名" 
              class="search-input mr-10" 
              clearable 
              @keyup.enter="handleSearch"
            />
            <el-input-number v-model="queryParams.scoreMin" :min="0" :max="100" placeholder="最低分" class="score-input mr-10" />
            <span class="mr-10">-</span>
            <el-input-number v-model="queryParams.scoreMax" :min="0" :max="100" placeholder="最高分" class="score-input mr-10" />
            
            <el-button type="primary" @click="handleSearch">查询</el-button>
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
          <template #score="{ row }">
             <el-tag :type="getScoreTagType(row.score, row.isAbsent)">
                {{ row.isAbsent === 1 ? '缺考' : row.score }}
             </el-tag>
          </template>
       </DataTable>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import request from '@/utils/request'
import GlobalFilterBar from '@/components/GlobalFilterBar.vue'
import DataTable from '@/components/DataTable.vue'
import { useUserStore } from '@/store/user'
import { computed } from 'vue'

const userStore = useUserStore()
const isStudent = computed(() => userStore.roles.includes('STUDENT') || userStore.dataScope.type === 'SELF')

const currentFilters = ref({})
const queryParams = reactive({
  studentKey: '',
  scoreMin: undefined,
  scoreMax: undefined,
  page: 1,
  size: 20,
  sort: 'score,desc'
})

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const columns = [
  { prop: 'studentNo', label: '学号', width: '120' },
  { prop: 'studentName', label: '姓名', width: '100' },
  { prop: 'courseName', label: '课程', minWidth: '150' },
  { prop: 'teacherName', label: '教师', width: '100' },
  { prop: 'score', label: '成绩', width: '100', sortable: true, slotName: 'score' }
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
   queryParams.studentKey = ''
   queryParams.scoreMin = undefined
   queryParams.scoreMax = undefined
   handleSearch()
}

const handleSort = (sortStr) => {
   queryParams.sort = sortStr
   handleSearch()
}

const fetchData = async () => {
   loading.value = true
   try {
      const data = await request({
         url: '/oltp/scores',
         method: 'get',
         params: {
            ...currentFilters.value,
            ...queryParams
         }
      })
      tableData.value = data.items || []
      total.value = data.total || 0
   } catch(e) {} finally {
      loading.value = false
   }
}

const getScoreTagType = (score, isAbsent) => {
   if(isAbsent === 1) return 'info'
   if(score >= 85) return 'success'
   if(score < 60) return 'danger'
   return ''
}
</script>

<style scoped>
.filter-card {
  border-radius: 8px;
}
.search-input {
  width: 150px;
}
.score-input {
  width: 100px;
}
.mr-10 {
  margin-right: 10px;
}
.mt-20 {
  margin-top: 20px;
}
</style>

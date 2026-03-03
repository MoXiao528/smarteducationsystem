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
         :columns="activeColumns"
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
          <template #action="{ row }">
             <el-button type="primary" size="small" @click="handleEdit(row)">录入/修改</el-button>
          </template>
       </DataTable>
    </div>

    <!-- Edit Score Dialog -->
    <el-dialog v-model="editDialogVisible" title="录入/修改成绩" width="400px">
       <el-form :model="editForm" label-width="80px">
          <el-form-item label="学生姓名">{{ editForm.studentName }}</el-form-item>
          <el-form-item label="课程名称">{{ editForm.courseName }}</el-form-item>
          <el-form-item label="是否缺考">
             <el-radio-group v-model="editForm.isAbsent">
                <el-radio :label="0">正常</el-radio>
                <el-radio :label="1">缺考</el-radio>
             </el-radio-group>
          </el-form-item>
          <el-form-item label="成绩分数" v-if="editForm.isAbsent === 0">
             <el-input-number v-model="editForm.score" :min="0" :max="100" />
          </el-form-item>
       </el-form>
       <template #footer>
          <span class="dialog-footer">
            <el-button @click="editDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitEdit" :loading="submitting">确认</el-button>
          </span>
       </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import request from '@/utils/request'
import GlobalFilterBar from '@/components/GlobalFilterBar.vue'
import DataTable from '@/components/DataTable.vue'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const isStudent = computed(() => userStore.roles.includes('STUDENT') || userStore.dataScope.type === 'SELF')
const canEditScore = computed(() => userStore.roles.includes('TEACHER') || userStore.roles.includes('SUPER_ADMIN'))

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

const baseColumns = [
  { prop: 'studentNo', label: '学号', width: '120' },
  { prop: 'studentName', label: '姓名', width: '100' },
  { prop: 'courseName', label: '课程', minWidth: '150' },
  { prop: 'teacherName', label: '教师', width: '100' },
  { prop: 'score', label: '成绩', width: '100', sortable: true, slotName: 'score' }
]

const activeColumns = computed(() => {
  if (canEditScore.value) {
    return [...baseColumns, { prop: 'action', label: '操作', width: '120', slotName: 'action' }]
  }
  return baseColumns
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
      const params = { ...currentFilters.value, ...queryParams }
      // Clean up params based on backend advice
      if (isStudent.value) {
         delete params.studentKey
         delete params.collegeId
         delete params.majorId
         delete params.gradeId
         delete params.classId
      }
      if (userStore.roles.includes('TEACHER')) {
         delete params.collegeId
         delete params.majorId
      }
      
      const data = await request({
         url: '/oltp/scores',
         method: 'get',
         params
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

const editDialogVisible = ref(false)
const submitting = ref(false)
const editForm = reactive({
   id: null,
   score: 0,
   isAbsent: 0,
   studentName: '',
   courseName: ''
})

const handleEdit = (row) => {
   editForm.id = row.id
   editForm.score = row.score || 0
   editForm.isAbsent = row.isAbsent || 0
   editForm.studentName = row.studentName
   editForm.courseName = row.courseName
   editDialogVisible.value = true
}

const submitEdit = async () => {
   submitting.value = true
   try {
      await request({
         url: '/oltp/scores/update',
         method: 'post',
         data: {
            id: editForm.id,
            score: editForm.score,
            isAbsent: editForm.isAbsent
         }
      })
      ElMessage.success('成绩修改成功')
      editDialogVisible.value = false
      fetchData()
   } catch (error) {
      // Backend returns 403 if unauthorized to edit
      if (error?.response?.status === 403 || error?.status === 403 || error?.message?.includes('403')) {
         ElMessage.error('越权操作：您没有权限修改该成绩')
      } else {
         ElMessage.error(error?.response?.data?.message || '修改成绩失败')
      }
   } finally {
      submitting.value = false
   }
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
  width: 140px;
}
.mr-10 {
  margin-right: 10px;
}
.mt-20 {
  margin-top: 20px;
}
</style>

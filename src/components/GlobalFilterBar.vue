<template>
  <div class="global-filter-bar">
    <el-form :inline="true" :model="filters" class="filter-form" label-width="80px">
      <!-- Semester -->
      <el-form-item label="学期" v-if="showFilters.includes('semester')" class="filter-item">
        <el-select v-model="filters.semesterId" placeholder="请选择" @change="emitFilter" clearable class="w-180">
          <el-option v-for="item in semesters" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      
      <!-- College -->
      <el-form-item label="学院" v-if="showFilters.includes('college')" class="filter-item">
        <el-input v-if="dataScope.type === 'SELF'" :value="studentProfile.collegeName || ''" disabled class="w-180" placeholder="加载中..." />
        <el-select v-else v-model="filters.collegeId" :disabled="dataScope.collegeId != null" placeholder="请选择" @change="handleCollegeChange" clearable class="w-180">
          <el-option v-for="item in colleges" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>

      <!-- Major -->
      <el-form-item label="专业" v-if="showFilters.includes('major')" class="filter-item">
        <el-input v-if="dataScope.type === 'SELF'" :value="studentProfile.majorName || ''" disabled class="w-180" placeholder="加载中..." />
        <el-select v-else v-model="filters.majorId" placeholder="请选择" @change="handleMajorChange" :disabled="dataScope.majorId != null || !filters.collegeId" clearable class="w-180">
          <el-option v-for="item in majors" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>

      <!-- Grade -->
      <el-form-item label="年级" v-if="showFilters.includes('grade')" class="filter-item">
        <el-input v-if="dataScope.type === 'SELF'" :value="studentProfile.gradeName || ''" disabled class="w-180" placeholder="加载中..." />
        <el-select v-else v-model="filters.gradeId" placeholder="请选择" @change="handleGradeChange" :disabled="dataScope.gradeId != null" clearable class="w-180">
          <el-option v-for="item in grades" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>

      <!-- Class -->
      <el-form-item label="班级" v-if="showFilters.includes('class')" class="filter-item">
         <el-input v-if="dataScope.type === 'SELF'" :value="studentProfile.className || ''" disabled class="w-180" placeholder="加载中..." />
         <el-select v-else v-model="filters.classId" placeholder="请选择" @change="emitFilter" :disabled="dataScope.classId != null || !filters.gradeId || !filters.majorId" clearable class="w-180">
            <el-option v-for="item in classes" :key="item.id" :label="item.name" :value="item.id" />
         </el-select>
      </el-form-item>

      <!-- Course -->
      <el-form-item label="课程" v-if="showFilters.includes('course')" class="filter-item">
         <el-select v-model="filters.courseId" placeholder="请选择" @change="emitFilter" :disabled="!filters.semesterId" clearable class="w-180">
            <el-option v-for="item in courses" :key="item.id" :label="item.name" :value="item.id" />
         </el-select>
      </el-form-item>

      <el-form-item class="filter-actions">
        <!-- Allows parent injection of custom buttons like export / search text -->
        <slot name="actions"></slot>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, computed, watch } from 'vue'
import { useDictStore } from '@/store/dict'
import { useUserStore } from '@/store/user'
import request from '@/utils/request'

const props = defineProps({
  showFilters: {
    type: Array,
    default: () => ['semester', 'college'] // Allows overriding which ones to show
  },
  defaultFilters: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['filter-change'])
const dictStore = useDictStore()
const userStore = useUserStore()

const filters = reactive({
  semesterId: null,
  collegeId: null,
  majorId: null,
  gradeId: null,
  classId: null,
  courseId: null,
  ...props.defaultFilters
})

const dataScope = computed(() => userStore.dataScope || { type: 'ALL' })
const studentProfile = ref({})

// Dictionary reactive bindings
const semesters = ref([])
const colleges = ref([])
const majors = ref([])
const grades = ref([])
const classes = ref([])
const courses = ref([])

onMounted(async () => {
   if (dataScope.value.type === 'SELF') {
      try {
         const res = await request({ url: '/student/profile', method: 'get' })
         if (res) {
            studentProfile.value = res
            if (res.collegeId) filters.collegeId = res.collegeId
            if (res.majorId) filters.majorId = res.majorId
            if (res.gradeId) filters.gradeId = res.gradeId
            if (res.classId) filters.classId = res.classId
         }
      } catch (e) {}
   }

   // Pre-fill based on dataScope
   if (dataScope.value.collegeId) {
      filters.collegeId = dataScope.value.collegeId
   }
   if (dataScope.value.majorId) {
      filters.majorId = dataScope.value.majorId
   }
   if (dataScope.value.gradeId) {
      filters.gradeId = dataScope.value.gradeId
   }
   if (dataScope.value.classId) {
      filters.classId = dataScope.value.classId
   }

   let allSemesters = await dictStore.getSemesters()

   // SELF 模式下按入学年份过滤学期列表
   if (dataScope.value.type === 'SELF') {
      const enrollYear = getEnrollYear()
      if (enrollYear) {
         allSemesters = allSemesters.filter(s => {
            // 学期 name 格式如 "2022-Fall", "2023-Spring"，提取年份
            const m = s.name && s.name.match(/(\d{4})/)
            return m ? parseInt(m[1]) >= enrollYear : true
         })
      }
   }
   semesters.value = allSemesters
   colleges.value = await dictStore.getColleges()
   grades.value = await dictStore.getGrades()
   
   // Set default semester
   if(semesters.value.length > 0 && !filters.semesterId) {
      filters.semesterId = semesters.value[0].id
   }
   
   if(filters.collegeId) {
       majors.value = await dictStore.getMajors(filters.collegeId)
   }
   if(filters.semesterId && Object.keys(filters).includes('courseId')) {
       await loadFilteredCourses(filters.semesterId, filters.collegeId, filters.majorId)
   }

   emitFilter() // initial trigger
})

// 从学号前4位解析入学年份
const getEnrollYear = () => {
   // 优先从 profile 的 enrollYear 字段获取
   if (studentProfile.value.enrollYear) return studentProfile.value.enrollYear
   // 从 profile 的学号解析（格式如 202201010000，前4位为入学年份）
   const studentNo = String(studentProfile.value.studentNo || studentProfile.value.no || '')
   if (studentNo.length >= 4) {
      const y = parseInt(studentNo.substring(0, 4))
      if (y >= 2000 && y <= 2100) return y
   }
   return null
}

// 统一的课程加载方法：SELF 模式下带 studentId 过滤
const loadFilteredCourses = async (semesterId, collegeId, majorId) => {
   if (!semesterId && dataScope.value.type !== 'SELF') return
   filters.courseId = null
   if (dataScope.value.type === 'SELF') {
      // 学生模式：带 studentId，只返回该学生选修的课程
      const studentId = userStore.dataScope?.studentId || userStore.id
      try {
         courses.value = await request({
            url: '/dict/courses',
            method: 'get',
            params: { semesterId, studentId }
         })
      } catch (e) { courses.value = [] }
   } else {
      let courseList = await dictStore.getCourses(semesterId, collegeId, majorId)
      if (dataScope.value.type === 'TEACHING' && dataScope.value.courseIds && dataScope.value.courseIds.length > 0) {
         courseList = courseList.filter(c => dataScope.value.courseIds.includes(c.id))
      }
      courses.value = courseList
   }
}

const handleCollegeChange = async (val) => {
   filters.majorId = null
   filters.classId = null
   majors.value = await dictStore.getMajors(val)
   if(filters.semesterId) {
     await loadFilteredCourses(filters.semesterId, val, null)
   }
   emitFilter()
}

const handleMajorChange = async (val) => {
   filters.classId = null
   if (filters.gradeId && val) {
     classes.value = await dictStore.getClasses(filters.gradeId, val)
   }
   if(filters.semesterId && filters.collegeId) {
     await loadFilteredCourses(filters.semesterId, filters.collegeId, val)
   }
   emitFilter()
}

const handleGradeChange = async (val) => {
   filters.classId = null
   if (val && filters.majorId) {
     classes.value = await dictStore.getClasses(val, filters.majorId)
   }
   emitFilter()
}

watch(() => filters.semesterId, async (val) => {
   if(val && props.showFilters.includes('course')) {
      const targetCollegeId = dataScope.value.type === 'SELF' ? null : filters.collegeId
      const targetMajorId = dataScope.value.type === 'SELF' ? null : filters.majorId
      await loadFilteredCourses(val, targetCollegeId, targetMajorId)
   }
})

const emitFilter = () => {
   // Copy and clean empty properties 
   const emitData = {}
   for(const key in filters) {
       if (filters[key] !== null && filters[key] !== '') {
           emitData[key] = filters[key]
       }
   }
   emit('filter-change', emitData)
}

</script>

<style scoped>
.global-filter-bar {
  background: #ffffff;
  padding: 16px 20px 0 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  width: 100%;
}

.filter-item {
  margin-bottom: 16px;
  margin-right: 20px;
}

.filter-actions {
  margin-bottom: 16px;
  margin-left: auto; /* Push actions to the right if space allows */
}

.w-180 {
  width: 180px;
}

/* Customize Element Plus inputs */
:deep(.el-input__wrapper) {
  border-radius: 6px;
  background-color: #f7f9fc;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c0c4cc inset;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #409eff inset;
  background-color: #fff;
}
</style>

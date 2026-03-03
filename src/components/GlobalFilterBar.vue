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
        <el-select v-model="filters.collegeId" :disabled="dataScope.collegeId != null || dataScope.type === 'SELF'" placeholder="请选择" @change="handleCollegeChange" clearable class="w-180">
          <el-option v-for="item in colleges" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>

      <!-- Major -->
      <el-form-item label="专业" v-if="showFilters.includes('major')" class="filter-item">
        <el-select v-model="filters.majorId" placeholder="请选择" @change="handleMajorChange" :disabled="dataScope.majorId != null || dataScope.type === 'SELF' || !filters.collegeId" clearable class="w-180">
          <el-option v-for="item in majors" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>

      <!-- Grade -->
      <el-form-item label="年级" v-if="showFilters.includes('grade')" class="filter-item">
        <el-select v-model="filters.gradeId" placeholder="请选择" @change="handleGradeChange" :disabled="dataScope.gradeId != null || dataScope.type === 'SELF'" clearable class="w-180">
          <el-option v-for="item in grades" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>

      <!-- Class -->
      <el-form-item label="班级" v-if="showFilters.includes('class')" class="filter-item">
         <el-select v-model="filters.classId" placeholder="请选择" @change="emitFilter" :disabled="dataScope.classId != null || dataScope.type === 'SELF' || !filters.gradeId || !filters.majorId" clearable class="w-180">
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

// Dictionary reactive bindings
const semesters = ref([])
const colleges = ref([])
const majors = ref([])
const grades = ref([])
const classes = ref([])
const courses = ref([])

onMounted(async () => {
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

   semesters.value = await dictStore.getSemesters()
   colleges.value = await dictStore.getColleges()
   grades.value = await dictStore.getGrades()
   
   // Set default semester
   if(semesters.value.length > 0 && !filters.semesterId) {
      filters.semesterId = semesters.value[0].id
   }
   
   if(filters.collegeId) {
       majors.value = await dictStore.getMajors(filters.collegeId)
   }
   if(filters.collegeId && filters.semesterId && Object.keys(filters).includes('courseId')) {
       courses.value = await dictStore.getCourses(filters.semesterId, filters.collegeId, filters.majorId)
   }

   emitFilter() // initial trigger
})

const handleCollegeChange = async (val) => {
   filters.majorId = null
   filters.classId = null
   majors.value = await dictStore.getMajors(val)
   if(filters.semesterId) {
     filters.courseId = null
     courses.value = await dictStore.getCourses(filters.semesterId, val, null)
   }
   emitFilter()
}

const handleMajorChange = async (val) => {
   filters.classId = null
   if (filters.gradeId && val) {
     classes.value = await dictStore.getClasses(filters.gradeId, val)
   }
   if(filters.semesterId && filters.collegeId) {
     filters.courseId = null
     courses.value = await dictStore.getCourses(filters.semesterId, filters.collegeId, val)
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
   if(val && filters.collegeId && props.showFilters.includes('course')) {
      filters.courseId = null
      courses.value = await dictStore.getCourses(val, filters.collegeId, filters.majorId)
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

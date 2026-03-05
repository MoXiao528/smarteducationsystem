<template>
  <div class="group-trend-container app-container">
    <!-- ===== Student View ===== -->
    <template v-if="isStudent">
      <el-card shadow="never" class="control-panel">
         <el-form :inline="true" label-width="80px">
            <el-form-item label="对比维度">
               <el-select v-model="queryParams.dimension" @change="handleTypeChange" style="width: 150px">
                  <el-option label="班级均分对比" value="CLASS" />
                  <el-option label="年级均分对比" value="GRADE" />
               </el-select>
            </el-form-item>
            <el-form-item label="对比指标">
               <el-select v-model="queryParams.metric" @change="fetchData" style="width: 150px">
                  <el-option label="平均分" value="avgScore" />
                  <el-option label="及格率" value="passRate" />
                  <el-option label="优秀率" value="excellentRate" />
               </el-select>
            </el-form-item>
         </el-form>
      </el-card>

      <el-card shadow="never" class="result-card mt-20" v-loading="loading">
         <template #header>
            <div class="card-header">个人与群体历史成绩趋势对比</div>
         </template>
         <div ref="chartRef" style="width: 100%; height: 400px;"></div>
      </el-card>
    </template>

    <!-- ===== Teacher View ===== -->
    <template v-else>
      <el-card shadow="never" class="control-panel">
        <el-form :inline="true" label-width="80px">
          <el-form-item label="对比指标">
            <el-select v-model="teacherMetric" style="width: 150px">
              <el-option label="平均分" value="avgScore" />
              <el-option label="及格率" value="passRate" />
              <el-option label="优秀率" value="excellentRate" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>

      <el-row :gutter="20" class="mt-20">
        <el-col :span="12">
          <el-card shadow="never" class="result-card" v-loading="teacherLoading">
            <template #header>
              <div class="card-header">课程指标对比</div>
            </template>
            <div ref="courseBarRef" style="width: 100%; height: 360px;"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="never" class="result-card" v-loading="teacherLoading">
            <template #header>
              <div class="card-header">班级指标对比</div>
            </template>
            <div ref="classBarRef" style="width: 100%; height: 360px;"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" class="result-card mt-20" v-loading="teacherLoading">
        <template #header>
          <div class="card-header">课程历史趋势</div>
        </template>
        <div ref="courseTrendRef" style="width: 100%; height: 400px;"></div>
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const isStudent = computed(() => userStore.roles.includes('STUDENT'))

// ==================== Shared ====================
const loading = ref(false)

const handleResize = () => {
  chartInstance?.resize()
  courseBarChart?.resize()
  classBarChart?.resize()
  courseTrendChart?.resize()
}

// ==================== Student View ====================
const chartRef = ref(null)
let chartInstance = null

const queryParams = reactive({
  dimension: 'CLASS',
  metric: 'avgScore'
})

const resolvedScope = reactive({
   classId: null,
   gradeId: null
})

const ensureScope = async () => {
   if (userStore.dataScope.classId) resolvedScope.classId = userStore.dataScope.classId
   if (userStore.dataScope.gradeId) resolvedScope.gradeId = userStore.dataScope.gradeId

   if (!resolvedScope.classId || !resolvedScope.gradeId) {
      try {
         const profile = await request({ url: '/student/profile', method: 'get' })
         if (profile) {
            if (!resolvedScope.classId && profile.classId) resolvedScope.classId = profile.classId
            if (!resolvedScope.gradeId && profile.gradeId) resolvedScope.gradeId = profile.gradeId
         }
      } catch (e) { /* ignore */ }
   }
}

const getTargetId = () => {
    if (queryParams.dimension === 'CLASS') return resolvedScope.classId
    if (queryParams.dimension === 'GRADE') return resolvedScope.gradeId
    return null
}

const getMetricName = () => {
    switch(queryParams.metric) {
        case 'avgScore': return '平均分'
        case 'passRate': return '及格率'
        case 'excellentRate': return '优秀率'
        default: return '指标'
    }
}

const renderChart = (individualData, groupData) => {
  if (!chartRef.value) return
  if (!chartInstance) chartInstance = echarts.init(chartRef.value)

  const formatVal = (v) => {
      if (queryParams.metric === 'passRate' || queryParams.metric === 'excellentRate') {
          return v <= 1 ? (v * 100).toFixed(2) : v
      }
      return v
  }

  const groupName = queryParams.dimension === 'CLASS' ? '班级均值' : '年级均值'
  const metricName = getMetricName()

  const option = {
    tooltip: { trigger: 'axis' },
     legend: { data: ['个人' + metricName, groupName], bottom: 0 },
     grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: groupData.x || []
    },
    yAxis: {
      type: 'value',
      name: queryParams.metric === 'avgScore' ? '分数' : '百分比',
      axisLabel: {
          formatter: queryParams.metric === 'avgScore' ? '{value}' : '{value} %'
      }
    },
    series: [
      {
        name: '个人' + metricName,
        type: 'line',
        data: individualData.map(v => formatVal(v)),
        smooth: true,
        itemStyle: { color: '#409EFF' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64,158,255,0.3)' },
            { offset: 1, color: 'rgba(64,158,255,0.1)' }
          ])
        }
      },
      {
        name: groupName,
        type: 'line',
        data: (groupData.y || []).map(v => formatVal(v)),
        smooth: true,
        itemStyle: { color: '#67C23A', type: 'dashed' }
      }
    ]
  }
  chartInstance.setOption(option, true)
}

const handleTypeChange = () => fetchData()

const fetchData = async () => {
  const targetId = getTargetId()
  const studentId = userStore.dataScope?.studentId || userStore.id

  if (!studentId) { ElMessage.warning('未能识别学生信息'); return }
  if (!targetId) {
      ElMessage.info(`您似乎没有绑定明确的${queryParams.dimension === 'CLASS' ? '班级' : '年级'}信息`)
      return
  }

  loading.value = true
  try {
    const [groupRes, indRes] = await Promise.all([
      request({
        url: '/olap/student/group-trend', method: 'get',
        params: { dimension: queryParams.dimension, id: targetId, metric: queryParams.metric }
      }),
      request({ url: `/olap/student/${studentId}/trend`, method: 'get' })
    ])

    const groupData = groupRes || {}
    const indDataRaw = indRes || {}
    const indMap = {
        'avgScore': indDataRaw.avgScore || [],
        'passRate': indDataRaw.passRate || [],
        'excellentRate': indDataRaw.excellentRate || []
    }
    await nextTick()
    renderChart(indMap[queryParams.metric], groupData)
  } catch (error) {
    ElMessage.error('获取对比数据失败')
  } finally {
    loading.value = false
  }
}

// ==================== Teacher View ====================
const teacherMetric = ref('avgScore')
const teacherLoading = ref(false)

const courseBarRef = ref(null)
const classBarRef = ref(null)
const courseTrendRef = ref(null)

let courseBarChart = null
let classBarChart = null
let courseTrendChart = null

// Cached raw data — switch metrics without re-fetching
const teacherData = reactive({
  courseMetrics: [],
  classMetrics: [],
  courseTrend: []
})

const COLORS = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#00BCD4', '#9C27B0', '#FF9800']

const teacherMetricLabel = computed(() => {
  switch (teacherMetric.value) {
    case 'avgScore': return '平均分'
    case 'passRate': return '及格率'
    case 'excellentRate': return '优秀率'
    default: return ''
  }
})

const formatTeacherVal = (v) => {
  if (teacherMetric.value === 'passRate' || teacherMetric.value === 'excellentRate') {
    return v <= 1 ? +(v * 100).toFixed(2) : v
  }
  return v
}

const renderCourseBar = () => {
  if (!courseBarRef.value) return
  if (!courseBarChart) courseBarChart = echarts.init(courseBarRef.value)

  const metric = teacherMetric.value
  const data = teacherData.courseMetrics
  courseBarChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map(d => d.courseName),
      axisLabel: { rotate: data.length > 6 ? 30 : 0, interval: 0 }
    },
    yAxis: {
      type: 'value',
      name: teacherMetricLabel.value,
      axisLabel: { formatter: metric === 'avgScore' ? '{value}' : '{value}%' }
    },
    series: [{
      type: 'bar',
      data: data.map(d => formatTeacherVal(d[metric])),
      barMaxWidth: 40,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#409EFF' },
          { offset: 1, color: 'rgba(64,158,255,0.4)' }
        ]),
        borderRadius: [4, 4, 0, 0]
      }
    }]
  }, true)
}

const renderClassBar = () => {
  if (!classBarRef.value) return
  if (!classBarChart) classBarChart = echarts.init(classBarRef.value)

  const metric = teacherMetric.value
  const data = teacherData.classMetrics
  classBarChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map(d => d.className),
      axisLabel: { rotate: data.length > 6 ? 30 : 0, interval: 0 }
    },
    yAxis: {
      type: 'value',
      name: teacherMetricLabel.value,
      axisLabel: { formatter: metric === 'avgScore' ? '{value}' : '{value}%' }
    },
    series: [{
      type: 'bar',
      data: data.map(d => formatTeacherVal(d[metric])),
      barMaxWidth: 40,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#67C23A' },
          { offset: 1, color: 'rgba(103,194,58,0.4)' }
        ]),
        borderRadius: [4, 4, 0, 0]
      }
    }]
  }, true)
}

const renderCourseTrend = () => {
  if (!courseTrendRef.value) return
  if (!courseTrendChart) courseTrendChart = echarts.init(courseTrendRef.value)

  const metric = teacherMetric.value
  const raw = teacherData.courseTrend

  const semesters = [...new Set(raw.map(r => r.semesterName))]
  const courses = [...new Map(raw.map(r => [r.courseId, r.courseName])).entries()]

  const series = courses.map(([id, name], idx) => ({
    name,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    itemStyle: { color: COLORS[idx % COLORS.length] },
    data: semesters.map(sem => {
      const row = raw.find(r => r.semesterName === sem && r.courseId === id)
      return row ? formatTeacherVal(row[metric]) : null
    })
  }))

  courseTrendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, type: 'scroll' },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: { type: 'category', data: semesters },
    yAxis: {
      type: 'value',
      name: teacherMetricLabel.value,
      axisLabel: { formatter: metric === 'avgScore' ? '{value}' : '{value}%' }
    },
    series
  }, true)
}

const renderAllTeacherCharts = () => {
  renderCourseBar()
  renderClassBar()
  renderCourseTrend()
}

const fetchTeacherData = async () => {
  teacherLoading.value = true
  try {
    const res = await request({ url: '/olap/teacher/overview', method: 'get' })
    teacherData.courseMetrics = res.courseMetrics || []
    teacherData.classMetrics = res.classMetrics || []
    teacherData.courseTrend = res.courseTrend || []
    await nextTick()
    renderAllTeacherCharts()
  } catch (e) {
    ElMessage.error('获取教师概览数据失败')
  } finally {
    teacherLoading.value = false
  }
}

// Watch metric switch — re-render without re-fetch
watch(teacherMetric, () => {
  renderAllTeacherCharts()
})

// ==================== Lifecycle ====================
onMounted(async () => {
  if (isStudent.value) {
    await ensureScope()
    fetchData()
  } else {
    fetchTeacherData()
  }
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  chartInstance?.dispose()
  courseBarChart?.dispose()
  classBarChart?.dispose()
  courseTrendChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.control-panel {
  border-radius: 8px;
  margin-bottom: 20px;
}
.result-card {
  border-radius: 8px;
  border: 1px solid #ebeef5;
}
.mt-20 {
  margin-top: 20px;
}
.card-header {
  font-weight: 600;
  color: #303133;
}
.app-container {
  padding: 20px;
}
</style>

<template>
  <div class="group-trend-container app-container">
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
            <el-select v-model="queryParams.metric" @change="fetchStudentData" style="width: 150px">
              <el-option label="平均分" value="avgScore" />
              <el-option label="及格率" value="passRate" />
              <el-option label="优秀率" value="excellentRate" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="result-card mt-20" v-loading="studentLoading">
        <template #header>
          <div class="card-header">个人与群体历史成绩趋势对比</div>
        </template>
        <div ref="chartRef" class="chart-block"></div>
      </el-card>
    </template>

    <template v-else>
      <el-card shadow="never" class="control-panel">
        <el-form :inline="true" label-width="80px">
          <el-form-item v-if="isAdminDashboard" label="学院">
            <el-select
              v-model="adminCollegeSelection"
              :disabled="isCollegeLocked"
              clearable
              placeholder="全校"
              style="width: 220px"
              @change="fetchOverviewData"
            >
              <el-option
                v-for="item in adminCollegeOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="对比指标">
            <el-select v-model="overviewMetric" style="width: 150px">
              <el-option label="平均分" value="avgScore" />
              <el-option label="及格率" value="passRate" />
              <el-option label="优秀率" value="excellentRate" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>

      <el-row :gutter="20" class="mt-20">
        <el-col :span="12">
          <el-card shadow="never" class="result-card" v-loading="overviewLoading">
            <template #header>
              <div class="card-header">课程指标对比</div>
            </template>
            <div ref="courseBarRef" class="chart-block chart-block-sm"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="never" class="result-card" v-loading="overviewLoading">
            <template #header>
              <div class="card-header">班级指标对比</div>
            </template>
            <div ref="classBarRef" class="chart-block chart-block-sm"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" class="result-card mt-20" v-loading="overviewLoading">
        <template #header>
          <div class="card-header">课程历史趋势</div>
        </template>
        <div ref="courseTrendRef" class="chart-block"></div>
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { useDictStore } from '@/store/dict'
import { useUserStore } from '@/store/user'

const ALL_COLLEGE = '__ALL__'
const COLORS = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#00BCD4', '#9C27B0', '#FF9800']

const userStore = useUserStore()
const dictStore = useDictStore()

const isStudent = computed(() => userStore.roles.includes('STUDENT'))
const isTeacher = computed(() => userStore.roles.includes('TEACHER'))
const isAdminDashboard = computed(() => userStore.roles.includes('COLLEGE_ADMIN') || userStore.roles.includes('SCHOOL_ADMIN'))
const isCollegeAdmin = computed(() => userStore.roles.includes('COLLEGE_ADMIN'))
const isSchoolAdmin = computed(() => userStore.roles.includes('SCHOOL_ADMIN'))
const isCollegeLocked = computed(() => isCollegeAdmin.value)

const handleResize = () => {
  chartInstance?.resize()
  courseBarChart?.resize()
  classBarChart?.resize()
  courseTrendChart?.resize()
}

const studentLoading = ref(false)
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
    } catch (error) {
      // noop
    }
  }
}

const getTargetId = () => {
  if (queryParams.dimension === 'CLASS') return resolvedScope.classId
  if (queryParams.dimension === 'GRADE') return resolvedScope.gradeId
  return null
}

const getMetricName = metric => {
  switch (metric) {
    case 'avgScore':
      return '平均分'
    case 'passRate':
      return '及格率'
    case 'excellentRate':
      return '优秀率'
    default:
      return '指标'
  }
}

const formatRateValue = value => {
  if (value == null) return value
  return value <= 1 ? Number((value * 100).toFixed(2)) : Number(value)
}

const renderStudentChart = (individualData, groupData) => {
  if (!chartRef.value) return
  if (!chartInstance) chartInstance = echarts.init(chartRef.value)

  const metricName = getMetricName(queryParams.metric)
  const isRate = queryParams.metric !== 'avgScore'
  const normalize = value => (isRate ? formatRateValue(value) : value)
  const groupName = queryParams.dimension === 'CLASS' ? '班级均值' : '年级均值'

  chartInstance.setOption(
    {
      tooltip: { trigger: 'axis' },
      legend: { data: [`个人${metricName}`, groupName], bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: groupData.x || []
      },
      yAxis: {
        type: 'value',
        name: isRate ? '百分比' : '分数',
        axisLabel: { formatter: isRate ? '{value} %' : '{value}' }
      },
      series: [
        {
          name: `个人${metricName}`,
          type: 'line',
          data: (individualData || []).map(normalize),
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
          data: (groupData.y || []).map(normalize),
          smooth: true,
          lineStyle: { type: 'dashed' },
          itemStyle: { color: '#67C23A' }
        }
      ]
    },
    true
  )
}

const handleTypeChange = () => {
  fetchStudentData()
}

const fetchStudentData = async () => {
  const targetId = getTargetId()
  const studentId = userStore.dataScope?.studentId || userStore.id

  if (!studentId) {
    ElMessage.warning('未能识别学生信息')
    return
  }

  if (!targetId) {
    ElMessage.info(`当前账号未绑定明确的${queryParams.dimension === 'CLASS' ? '班级' : '年级'}信息`)
    return
  }

  studentLoading.value = true
  try {
    const [groupRes, indRes] = await Promise.all([
      request({
        url: '/olap/student/group-trend',
        method: 'get',
        params: { dimension: queryParams.dimension, id: targetId, metric: queryParams.metric }
      }),
      request({ url: `/olap/student/${studentId}/trend`, method: 'get' })
    ])

    const metricMap = {
      avgScore: indRes?.avgScore || [],
      passRate: indRes?.passRate || [],
      excellentRate: indRes?.excellentRate || []
    }

    await nextTick()
    renderStudentChart(metricMap[queryParams.metric], groupRes || {})
  } catch (error) {
    ElMessage.error('获取对比数据失败')
  } finally {
    studentLoading.value = false
  }
}

const overviewMetric = ref('avgScore')
const overviewLoading = ref(false)
const courseBarRef = ref(null)
const classBarRef = ref(null)
const courseTrendRef = ref(null)
const colleges = ref([])
const adminCollegeSelection = ref(ALL_COLLEGE)

let courseBarChart = null
let classBarChart = null
let courseTrendChart = null

const overviewData = reactive({
  courseMetrics: [],
  classMetrics: [],
  courseTrend: []
})

const adminCollegeOptions = computed(() => {
  const items = colleges.value.map(item => ({ id: item.id, name: item.name }))
  if (isSchoolAdmin.value) {
    return [{ id: ALL_COLLEGE, name: '全校' }, ...items]
  }
  return items
})

const overviewMetricLabel = computed(() => getMetricName(overviewMetric.value))
const shouldFormatOverviewTooltipToTwoDecimals = computed(
  () => isSchoolAdmin.value && adminCollegeSelection.value === ALL_COLLEGE
)

const formatOverviewValue = value => {
  if (overviewMetric.value === 'passRate' || overviewMetric.value === 'excellentRate') {
    return formatRateValue(value)
  }
  return value
}

const formatOverviewTooltipValue = value => {
  if (value == null || value === '') return '-'

  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) return value

  if (!shouldFormatOverviewTooltipToTwoDecimals.value) {
    return overviewMetric.value === 'avgScore' ? `${numericValue}` : `${numericValue}%`
  }

  return overviewMetric.value === 'avgScore' ? numericValue.toFixed(2) : `${numericValue.toFixed(2)}%`
}

const buildOverviewTooltip = () => {
  if (!shouldFormatOverviewTooltipToTwoDecimals.value) {
    return { trigger: 'axis' }
  }

  return {
    trigger: 'axis',
    formatter: params => {
      const items = Array.isArray(params) ? params : [params]
      if (!items.length) return ''

      const lines = [items[0].axisValueLabel || items[0].axisValue || '']
      items.forEach(item => {
        const rawValue = Array.isArray(item.value) ? item.value[item.value.length - 1] : item.value
        lines.push(`${item.marker || ''}${item.seriesName || overviewMetricLabel.value}: ${formatOverviewTooltipValue(rawValue)}`)
      })
      return lines.join('<br/>')
    }
  }
}

const renderCourseBar = () => {
  if (!courseBarRef.value) return
  if (!courseBarChart) courseBarChart = echarts.init(courseBarRef.value)

  const data = overviewData.courseMetrics
  courseBarChart.setOption(
    {
      tooltip: buildOverviewTooltip(),
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.map(item => item.courseName),
        axisLabel: { rotate: data.length > 6 ? 30 : 0, interval: 0 }
      },
      yAxis: {
        type: 'value',
        name: overviewMetricLabel.value,
        axisLabel: { formatter: overviewMetric.value === 'avgScore' ? '{value}' : '{value}%' }
      },
      series: [
        {
          name: overviewMetricLabel.value,
          type: 'bar',
          data: data.map(item => formatOverviewValue(item[overviewMetric.value])),
          barMaxWidth: 40,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#409EFF' },
              { offset: 1, color: 'rgba(64,158,255,0.4)' }
            ]),
            borderRadius: [4, 4, 0, 0]
          }
        }
      ]
    },
    true
  )
}

const renderClassBar = () => {
  if (!classBarRef.value) return
  if (!classBarChart) classBarChart = echarts.init(classBarRef.value)

  const data = overviewData.classMetrics
  classBarChart.setOption(
    {
      tooltip: buildOverviewTooltip(),
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.map(item => item.className),
        axisLabel: { rotate: data.length > 6 ? 30 : 0, interval: 0 }
      },
      yAxis: {
        type: 'value',
        name: overviewMetricLabel.value,
        axisLabel: { formatter: overviewMetric.value === 'avgScore' ? '{value}' : '{value}%' }
      },
      series: [
        {
          name: overviewMetricLabel.value,
          type: 'bar',
          data: data.map(item => formatOverviewValue(item[overviewMetric.value])),
          barMaxWidth: 40,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#67C23A' },
              { offset: 1, color: 'rgba(103,194,58,0.4)' }
            ]),
            borderRadius: [4, 4, 0, 0]
          }
        }
      ]
    },
    true
  )
}

const renderCourseTrend = () => {
  if (!courseTrendRef.value) return
  if (!courseTrendChart) courseTrendChart = echarts.init(courseTrendRef.value)

  const raw = overviewData.courseTrend
  const semesters = [...new Set(raw.map(item => item.semesterName))]
  const courses = [...new Map(raw.map(item => [item.courseId, item.courseName])).entries()]

  const series = courses.map(([courseId, courseName], index) => ({
    name: courseName,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    itemStyle: { color: COLORS[index % COLORS.length] },
    data: semesters.map(semesterName => {
      const row = raw.find(item => item.semesterName === semesterName && item.courseId === courseId)
      return row ? formatOverviewValue(row[overviewMetric.value]) : null
    })
  }))

  courseTrendChart.setOption(
    {
      tooltip: buildOverviewTooltip(),
      legend: { bottom: 0, type: 'scroll' },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { type: 'category', data: semesters },
      yAxis: {
        type: 'value',
        name: overviewMetricLabel.value,
        axisLabel: { formatter: overviewMetric.value === 'avgScore' ? '{value}' : '{value}%' }
      },
      series
    },
    true
  )
}

const renderOverviewCharts = () => {
  renderCourseBar()
  renderClassBar()
  renderCourseTrend()
}

const getOverviewRequestParams = () => {
  const params = {}
  if (isSchoolAdmin.value && adminCollegeSelection.value && adminCollegeSelection.value !== ALL_COLLEGE) {
    params.collegeId = adminCollegeSelection.value
  }
  return params
}

const fetchOverviewData = async () => {
  overviewLoading.value = true
  try {
    const res = await request({
      url: '/olap/teacher/overview',
      method: 'get',
      params: getOverviewRequestParams()
    })

    overviewData.courseMetrics = res?.courseMetrics || []
    overviewData.classMetrics = res?.classMetrics || []
    overviewData.courseTrend = res?.courseTrend || []
    await nextTick()
    renderOverviewCharts()
  } catch (error) {
    ElMessage.error('获取群体对比看板数据失败')
  } finally {
    overviewLoading.value = false
  }
}

const initAdminCollegeSelection = async () => {
  colleges.value = await dictStore.getColleges()

  if (isCollegeAdmin.value && userStore.dataScope?.collegeId) {
    adminCollegeSelection.value = userStore.dataScope.collegeId
    return
  }

  adminCollegeSelection.value = ALL_COLLEGE
}

watch(overviewMetric, () => {
  if (!isStudent.value) {
    renderOverviewCharts()
  }
})

onMounted(async () => {
  if (isStudent.value) {
    await ensureScope()
    await fetchStudentData()
  } else if (isTeacher.value) {
    await fetchOverviewData()
  } else if (isAdminDashboard.value) {
    await initAdminCollegeSelection()
    await fetchOverviewData()
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

.chart-block {
  width: 100%;
  height: 400px;
}

.chart-block-sm {
  height: 360px;
}
</style>

<template>
  <div class="group-trend-container app-container">
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'

const chartRef = ref(null)
const loading = ref(false)
let chartInstance = null

const userStore = useUserStore()

const queryParams = reactive({
  dimension: 'CLASS',
  metric: 'avgScore'
})

const resolvedScope = reactive({
   classId: null,
   gradeId: null
})

const ensureScope = async () => {
   // If dataScope already has classId/gradeId, use them directly
   if (userStore.dataScope.classId) resolvedScope.classId = userStore.dataScope.classId
   if (userStore.dataScope.gradeId) resolvedScope.gradeId = userStore.dataScope.gradeId

   // If still missing (student user whose /auth/me doesn't return these), fallback to /student/profile
   if (!resolvedScope.classId || !resolvedScope.gradeId) {
      try {
         const profile = await request({ url: '/student/profile', method: 'get' })
         if (profile) {
            if (!resolvedScope.classId && profile.classId) resolvedScope.classId = profile.classId
            if (!resolvedScope.gradeId && profile.gradeId) resolvedScope.gradeId = profile.gradeId
         }
      } catch (e) { /* profile API might not exist for non-student */ }
   }
}

const getTargetId = () => {
    if (queryParams.dimension === 'CLASS') {
       return resolvedScope.classId
    } else if (queryParams.dimension === 'GRADE') {
       return resolvedScope.gradeId
    }
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
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  // Format the values based on metrics
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

const handleTypeChange = () => {
    fetchData()
}

const fetchData = async () => {
  const targetId = getTargetId()
  const studentId = userStore.dataScope?.studentId || userStore.id
  
  if (!studentId) {
      ElMessage.warning('未能识别学生信息')
      return
  }
  if (!targetId) {
      ElMessage.info(`您似乎没有绑定明确的${queryParams.dimension === 'CLASS' ? '班级' : '年级'}信息`)
      return
  }

  loading.value = true
  try {
    // 1. Fetch group trend
    const groupPromise = request({
      url: '/olap/student/group-trend',
      method: 'get',
      params: {
         dimension: queryParams.dimension,
         id: targetId,
         metric: queryParams.metric
      }
    })

    // 2. Fetch individual trend
    const indPromise = request({
      url: `/olap/student/${studentId}/trend`,
      method: 'get'
    })

    const [groupRes, indRes] = await Promise.all([groupPromise, indPromise])

    const groupData = groupRes || {}
    const indDataRaw = indRes || {}
    // Extract the arrays for individual Data depending on metric
    const indMap = {
        'avgScore': indDataRaw.avgScore || [],
        'passRate': indDataRaw.passRate || [],
        'excellentRate': indDataRaw.excellentRate || []
    }
    const individualValues = indMap[queryParams.metric]

    await nextTick()
    renderChart(individualValues, groupData)
  } catch (error) {
    ElMessage.error('获取对比数据失败')
  } finally {
    loading.value = false
  }
}

const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

onMounted(async () => {
  await ensureScope()
  fetchData()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose()
  }
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

<template>
  <div class="progress-container app-container">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>个人成绩趋势分析</span>
        </div>
      </template>
      <div v-loading="loading" class="chart-wrapper">
        <div ref="chartRef" style="width: 100%; height: 400px;"></div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'

const chartRef = ref(null)
const loading = ref(false)
let chartInstance = null
const userStore = useUserStore()

const initChart = (data) => {
  if (!chartRef.value) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  
  const option = {
    title: {
      text: '历年学期成绩趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['平均分', '及格率(%)', '优秀率(%)'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.semesterName || [] // As per requirement: "semesterName 数组"
    },
    yAxis: [
      {
        type: 'value',
        name: '分数',
        max: 100
      },
      {
        type: 'value',
        name: '百分比',
        max: 100,
        axisLabel: {
          formatter: '{value} %'
        }
      }
    ],
    series: [
      {
        name: '平均分',
        type: 'line',
        data: data.avgScore || [],
        smooth: true,
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '及格率(%)',
        type: 'line',
        yAxisIndex: 1,
        // Since rates might be 0.x or percentages, assuming 1.0 means 100% just in case, but standard is often 0-1
        // Wait, if it's already a percentage, we use it directly:
        data: data.passRate ? data.passRate.map(v => v <= 1 ? (v * 100).toFixed(2) : v) : [],
        smooth: true,
        itemStyle: { color: '#67C23A' }
      },
      {
        name: '优秀率(%)',
        type: 'line',
        yAxisIndex: 1,
        data: data.excellentRate ? data.excellentRate.map(v => v <= 1 ? (v * 100).toFixed(2) : v) : [],
        smooth: true,
        itemStyle: { color: '#E6A23C' }
      }
    ]
  }
  
  chartInstance.setOption(option)
}

const fetchTrendData = async () => {
  loading.value = true
  try {
    const studentId = userStore.dataScope?.studentId || userStore.id
    if (!studentId) {
       ElMessage.warning('未绑定学生信息')
       return
    }
    const res = await request({
      url: `/olap/student/${studentId}/trend`,
      method: 'get'
    })
    
    await nextTick()
    initChart(res || {})
  } catch (error) {
    ElMessage.error('获取趋势数据失败')
  } finally {
    loading.value = false
  }
}

const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

onMounted(() => {
  fetchTrendData()
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
.app-container {
  padding: 20px;
}
.card-header {
  font-weight: bold;
  font-size: 16px;
}
.chart-wrapper {
  padding: 20px 0;
}
</style>

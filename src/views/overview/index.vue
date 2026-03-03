<template>
  <div class="overview-container">
    <GlobalFilterBar
      :show-filters="['semester', 'college', 'grade']"
      :default-filters="{}"
      @filter-change="handleFilterChange"
    />

    <MetricCards :metrics="metricData" />

    <el-row :gutter="20" class="chart-row">
      <el-col :span="16" :xs="24" :lg="16">
        <el-card shadow="never" class="chart-card">
           <template #header>
             <div class="card-header">
               <span>核心指标趋势图</span>
               <el-radio-group v-model="trendMetric" size="small" @change="fetchTrendData">
                  <el-radio-button label="avgScore">平均分</el-radio-button>
                  <el-radio-button label="passRate">及格率</el-radio-button>
                  <el-radio-button label="excellentRate">优秀率</el-radio-button>
               </el-radio-group>
             </div>
           </template>
           <ChartWrapper :option="trendOption" :loading="trendLoading" height="350px" />
        </el-card>
      </el-col>

      <el-col :span="8" :xs="24" :lg="8">
        <el-card shadow="never" class="chart-card">
           <template #header>
             <div class="card-header">
               <span>数据质量监控</span>
             </div>
           </template>
           <div class="quality-info" v-loading="qualityLoading">
              <div class="quality-item">
                 <span class="label">成绩为空比例：</span>
                 <span class="value warning">{{ formatPercent(qualityData.scoreNullRate) }}</span>
              </div>
              <div class="quality-item">
                 <span class="label">缺考比例：</span>
                 <span class="value danger">{{ formatPercent(qualityData.absentRate) }}</span>
              </div>
              <div class="quality-item">
                 <span class="label">重复记录数：</span>
                 <span class="value">{{ qualityData.duplicateRecordCount || 0 }}</span>
              </div>
           </div>
        </el-card>

        <el-card shadow="never" class="chart-card margin-top-20">
           <template #header>
             <div class="card-header">
               <span>排行榜 (Top 10)</span>
               <el-select v-model="rankingBy" size="small" style="width: 90px" @change="fetchRankingData">
                  <el-option label="学院" value="college" />
                  <el-option label="专业" value="major" />
               </el-select>
             </div>
           </template>
           <ChartWrapper :option="rankingOption" :loading="rankingLoading" height="150px" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '@/utils/request'
import GlobalFilterBar from '@/components/GlobalFilterBar.vue'
import MetricCards from '@/components/MetricCards.vue'
import ChartWrapper from '@/components/ChartWrapper.vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const currentFilters = ref({})

// Metrics Data
const metricData = ref([])

// Trend Chart
const trendMetric = ref('avgScore')
const trendOption = ref({})
const trendLoading = ref(false)

// Quality Data
const qualityData = reactive({
  scoreNullRate: 0,
  absentRate: 0,
  duplicateRecordCount: 0
})
const qualityLoading = ref(false)

// Ranking Data
const rankingBy = ref('college')
const rankingOption = ref({})
const rankingLoading = ref(false)

const getRequestParams = () => {
   const params = { ...currentFilters.value }
   if (userStore.roles.includes('COLLEGE_ADMIN')) {
      delete params.collegeId
   }
   return params
}

const handleFilterChange = (filters) => {
   currentFilters.value = filters
   fetchAllData()
}

const fetchAllData = () => {
   fetchMetrics()
   fetchTrendData()
   fetchQualityData()
   fetchRankingData()
}

const fetchMetrics = async () => {
  try {
     const data = await request({
       url: '/olap/overview/metrics',
       method: 'get',
       params: getRequestParams()
     })
     
     // Transform to MetricCards format
     metricData.value = [
       { label: '学生人数', value: data.studentCount },
       { label: '教师人数', value: data.teacherCount },
       { label: '课程数量', value: data.courseCount },
       { label: '平均分数', value: data.avgScore.toFixed(1) },
       { label: '及格率', value: data.passRate, unit: '%' },
       { label: '优秀率', value: data.excellentRate, unit: '%' }
     ]
  } catch(e) { /* error handled by interceptor */ }
}

const fetchTrendData = async () => {
  trendLoading.value = true
  try {
     const params = getRequestParams()
     params.metric = trendMetric.value

     const data = await request({
       url: '/olap/overview/trends',
       method: 'get',
       params
     })
     
     trendOption.value = {
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: data.x || [],
          axisLine: { lineStyle: { color: '#909399' } }
        },
        yAxis: {
          type: 'value',
          axisLine: { show: false },
          splitLine: { lineStyle: { type: 'dashed' } }
        },
        series: [{
           name: getMetricName(trendMetric.value),
           type: 'line',
           smooth: true,
           areaStyle: {
              color: 'rgba(64,158,255,0.2)'
           },
           itemStyle: { color: '#409EFF' },
           data: (data.y || []).map(val => trendMetric.value.includes('Rate') ? (val * 100).toFixed(1) : val)
        }]
     }
  } catch(e) {} finally {
     trendLoading.value = false
  }
}

const fetchQualityData = async () => {
  qualityLoading.value = true
  try {
     const params = getRequestParams()
     const reqParam = { semesterId: params.semesterId }

     const data = await request({
       url: '/olap/overview/data-quality',
       method: 'get',
       params: reqParam
     })
     Object.assign(qualityData, data)
  } catch(e) {} finally {
     qualityLoading.value = false
  }
}

const fetchRankingData = async () => {
   rankingLoading.value = true
   try {
     const paramFilters = getRequestParams()
     const data = await request({
       url: '/olap/overview/rankings',
       method: 'get',
       params: {
          semesterId: paramFilters.semesterId,
          collegeId: paramFilters.collegeId,
          by: rankingBy.value,
          metric: 'avgScore', // Fixed for this chart or make configurable
          top: 10
       }
     })
     
     const yData = data.map(i => i.name).reverse()
     const xData = data.map(i => i.value).reverse()

     rankingOption.value = {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '10%', bottom: '0', top: '0', containLabel: true },
        xAxis: { type: 'value', show: false },
        yAxis: { type: 'category', data: yData, axisTick: { show: false }, axisLine: { show: false } },
        series: [{
           type: 'bar',
           data: xData,
           label: { show: true, position: 'right', color: '#666' },
           itemStyle: {
              color: '#34bfa3',
              borderRadius: [0, 4, 4, 0]
           },
           barWidth: '15px'
        }]
     }
   } catch(e) {} finally {
      rankingLoading.value = false
   }
}

const formatPercent = (val) => {
   if(!val) return '0%'
   return (val * 100).toFixed(2) + '%'
}

const getMetricName = (metric) => {
   const map = { avgScore: '平均分', passRate: '及格率(%)', excellentRate: '优秀率(%)' }
   return map[metric] || metric
}

onMounted(() => {
   // Initial loading is driven by emit from GlobalFilterBar
})
</script>

<style scoped>
.overview-container {
  min-height: 100%;
}
.chart-row {
  margin-top: 20px;
}
.chart-card {
  border-radius: 8px;
  border: 1px solid #ebeef5;
  box-shadow: 0 4px 12px 0 rgba(0,0,0,0.02) !important;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #303133;
}
.margin-top-20 {
  margin-top: 20px;
}
.quality-info {
  padding: 10px 0;
}
.quality-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f0f2f5;
  font-size: 14px;
}
.quality-item:last-child {
  border-bottom: none;
}
.quality-item .label {
  color: #606266;
}
.quality-item .value {
  font-weight: bold;
}
.warning { color: #E6A23C; }
.danger { color: #F56C6C; }
</style>

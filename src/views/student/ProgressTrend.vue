<template>
  <div class="progress-trend-container app-container">
    <el-card shadow="never" class="filter-card">
       <GlobalFilterBar
         :show-filters="['semester', 'college', 'major', 'grade', 'class']"
         :default-filters="{}"
         @filter-change="handleFilterChange"
       />
    </el-card>

    <div v-if="trendData.x && trendData.x.length > 0" class="mt-20">
      <el-row :gutter="20">
         <el-col :span="16">
            <el-card shadow="never" class="chart-card" v-loading="loading">
               <template #header>
                  <div class="card-header">个人历年成绩变化趋势</div>
               </template>
               <ChartWrapper :option="trendOption" height="400px" />
            </el-card>
         </el-col>
         <el-col :span="8">
            <el-card shadow="never" class="info-card mb-20">
               <template #header>学期成绩概览</template>
               <div class="metrics-grid">
                  <div class="metric-item">
                     <div class="label">平均分</div>
                     <div class="value">{{ currentMetrics.avgScore || '-' }}</div>
                  </div>
                  <div class="metric-item mt-10">
                     <div class="label">及格率</div>
                     <div class="value">{{ formatPercent(currentMetrics.passRate) }}</div>
                  </div>
                  <div class="metric-item mt-10">
                     <div class="label">优秀率</div>
                     <div class="value">{{ formatPercent(currentMetrics.excellentRate) }}</div>
                  </div>
                   <div class="metric-item mt-10">
                      <div class="label">修读门数</div>
                      <div class="value">{{ currentMetrics.courseCount ?? '-' }}</div>
                   </div>
                   <div class="metric-item mt-10">
                      <div class="label">总修学分</div>
                      <div class="value">{{ currentMetrics.totalCredit ?? '-' }}</div>
                   </div>
                   <div class="metric-item mt-10">
                      <div class="label">挂科数目</div>
                      <div class="value fail-highlight">{{ currentMetrics.failCount ?? '-' }}</div>
                   </div>
               </div>
            </el-card>

            <el-card shadow="never" class="info-card">
               <template #header>进步总结</template>
               <div class="suggestion-text">
                  <el-icon class="bulb-icon"><Trophy /></el-icon>
                  <span>{{ progressSummary }}</span>
               </div>
            </el-card>
         </el-col>
      </el-row>
    </div>
    
    <el-empty v-else-if="!loading" description="暂无该学生的历史成绩数据" class="mt-20" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '@/utils/request'
import GlobalFilterBar from '@/components/GlobalFilterBar.vue'
import ChartWrapper from '@/components/ChartWrapper.vue'
import { useUserStore } from '@/store/user'
import { useDictStore } from '@/store/dict'
import { ElMessage } from 'element-plus'
import { Trophy } from '@element-plus/icons-vue'

const userStore = useUserStore()
const dictStore = useDictStore()

const loading = ref(false)
const selectedSemesterId = ref(null)

const trendData = reactive({
    x: [],
    avgScore: [],
    passRate: [],
    excellentRate: [],
    courseCount: [],
    totalCredit: [],
    failCount: []
})

const currentMetrics = reactive({
    avgScore: '-',
    passRate: '-',
    excellentRate: '-',
    courseCount: '-',
    totalCredit: '-',
    failCount: '-'
})
const progressSummary = ref('请选择学期以查看进步总结。')
const trendOption = ref({})

const activeSemesterName = ref('')
const semestersMap = ref({})

// Capture semester selection changes
const handleFilterChange = (filters) => {
   if (filters.semesterId) {
      selectedSemesterId.value = filters.semesterId
      if (semestersMap.value[filters.semesterId]) {
         activeSemesterName.value = semestersMap.value[filters.semesterId]
      }
      updateMetricsForSelectedSemester()
   }
}

const fetchTrendData = async () => {
   const studentId = userStore.dataScope?.studentId || userStore.id
   if (!studentId) return

   loading.value = true
   try {
      const data = await request({
         url: `/olap/student/${studentId}/trend`,
         method: 'get'
      })
      
      trendData.x = data.x || []
      trendData.avgScore = data.avgScore || []
      trendData.passRate = data.passRate || []
      trendData.excellentRate = data.excellentRate || []
      trendData.courseCount = data.courseCount || []
      trendData.totalCredit = data.totalCredit || []
      trendData.failCount = data.failCount || []

      renderChart()
      updateMetricsForSelectedSemester()
   } catch(e) {
      ElMessage.error('获取个人成绩趋势失败')
   } finally {
      loading.value = false
   }
}

const updateMetricsForSelectedSemester = () => {
    if (!trendData.x || trendData.x.length === 0) return
    let index = -1
    
    // Find the index of the selected semester
    if (activeSemesterName.value) {
        index = trendData.x.indexOf(activeSemesterName.value)
    }
    
    // Fallback to the latest semester if not found
    if (index === -1) {
        index = trendData.x.length - 1
    }

    currentMetrics.avgScore = typeof trendData.avgScore[index] === 'number' ? trendData.avgScore[index].toFixed(1) : '-'
    currentMetrics.passRate = trendData.passRate[index]
    currentMetrics.excellentRate = trendData.excellentRate[index]
    currentMetrics.courseCount = trendData.courseCount[index] ?? '-'
    currentMetrics.totalCredit = trendData.totalCredit[index] ?? '-'
    currentMetrics.failCount = trendData.failCount[index] ?? '-'

    generateSummary(index)
}

const formatPercent = (val) => {
    if (val === undefined || val === '-' || val === null) return '-'
    const num = Number(val)
    return num <= 1 ? (num * 100).toFixed(1) + '%' : num + '%'
}

const generateSummary = (index) => {
    if (index === -1) return
    const currentName = trendData.x[index]
    const currentScore = trendData.avgScore[index]
    
    const cc = trendData.courseCount[index]
    const tc = trendData.totalCredit[index]
    const fc = trendData.failCount[index]
    const extraInfo = (cc != null) ? `共修读 ${cc} 门课程、累计 ${tc} 学分` + (fc > 0 ? `，其中挂科 ${fc} 门` : '，无挂科') : ''

    if (index === 0) {
        progressSummary.value = `在 ${currentName} 学期，您的平均分为 ${currentScore.toFixed(1)} 分${extraInfo ? '，' + extraInfo : ''}。这是您的第一学期成绩记录，请继续保持努力！`
        return
    }

    const prevName = trendData.x[index - 1]
    const prevScore = trendData.avgScore[index - 1]
    const diff = (currentScore - prevScore).toFixed(1)

    const suffix = extraInfo ? `（${extraInfo}）` : ''
    if (diff > 0) {
        progressSummary.value = `在 ${currentName} 学期，您的平均分为 ${currentScore.toFixed(1)} 分，较上一学期 (${prevName}) 提高了 ${diff} 分${suffix}。进步明显，表现非常优秀！`
    } else if (diff < 0) {
        progressSummary.value = `在 ${currentName} 学期，您的平均分为 ${currentScore.toFixed(1)} 分，较上一学期 (${prevName}) 下降了 ${Math.abs(diff)} 分${suffix}。请总结经验，争取在未来取得更好的成绩。`
    } else {
        progressSummary.value = `在 ${currentName} 学期，您的平均分为 ${currentScore.toFixed(1)} 分，与上一学期 (${prevName}) 持平${suffix}。发挥非常稳定，继续加油！`
    }
}

const renderChart = () => {
    const formattedPassRate = trendData.passRate.map(v => v <= 1 ? Number((v * 100).toFixed(1)) : v)
    
    trendOption.value = {
        tooltip: { trigger: 'axis' },
        legend: { data: ['平均分', '及格率(%)'], bottom: '0' },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: trendData.x },
        yAxis: [
            { type: 'value', name: '平均分', position: 'left' },
            { type: 'value', name: '百分比(%)', position: 'right', max: 100 }
        ],
        series: [
            {
                name: '平均分',
                type: 'line',
                data: trendData.avgScore.map(s => Number(s.toFixed(1))),
                smooth: true,
                itemStyle: { color: '#409EFF' },
                areaStyle: {
                    color: 'rgba(64,158,255,0.1)'
                }
            },
            {
                name: '及格率(%)',
                type: 'line',
                yAxisIndex: 1,
                data: formattedPassRate,
                smooth: true,
                itemStyle: { color: '#67C23A', type: 'dashed' }
            }
        ]
    }
}

onMounted(async () => {
    // Load semesters for mapping ID to Name
    const smList = await dictStore.getSemesters()
    smList.forEach(sm => {
        semestersMap.value[sm.id] = sm.name
    })
    
    fetchTrendData()
})

</script>

<style scoped>
.app-container {
  padding: 20px;
}
.filter-card {
  border-radius: 8px;
}
.chart-card, .info-card {
  border-radius: 8px;
  border: 1px solid #ebeef5;
}
.mt-20 { margin-top: 20px; }
.mt-10 { margin-top: 10px; }
.mb-20 { margin-bottom: 20px; }
.card-header {
  font-weight: 600;
  color: #303133;
}
.metric-item .label {
  color: #909399;
  font-size: 14px;
}
.metric-item .value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-top: 4px;
}
.suggestion-text {
  font-size: 15px;
  color: #606266;
  line-height: 1.6;
  padding: 15px;
  background: #fdf6ec;
  border-radius: 4px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.bulb-icon {
  color: #E6A23C;
  font-size: 20px;
  margin-top: 2px;
}
.fail-highlight {
  color: #F56C6C !important;
}
</style>

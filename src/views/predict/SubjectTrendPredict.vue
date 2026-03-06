<template>
  <div class="subject-trend-container">
    <!-- 筛选栏 -->
    <el-card shadow="never" class="filter-card">
       <el-form :inline="true" label-width="80px">
          <el-form-item label="维度">
             <el-select v-model="query.dimension" style="width: 130px" @change="handleDimensionChange">
                <el-option label="学院" value="COLLEGE" />
                <el-option label="专业" value="MAJOR" />
                <el-option label="课程" value="COURSE" />
             </el-select>
          </el-form-item>

          <!-- 维度 ID 选择器 -->
          <el-form-item :label="dimensionLabel">
             <el-select
               v-model="query.dimensionId"
               :disabled="isDimensionLocked"
               placeholder="请选择"
               filterable
               style="width: 200px"
             >
                <el-option v-for="d in dimensionOptions" :key="d.id" :label="d.name" :value="d.id" />
             </el-select>
          </el-form-item>

          <el-form-item label="时间粒度">
             <el-select v-model="query.timeGranularity" style="width: 110px">
                <el-option label="按学期" value="SEMESTER" />
                <el-option label="按学年" value="YEAR" />
             </el-select>
          </el-form-item>

          <el-form-item label="起始学期">
             <el-select v-model="query.startSemesterId" placeholder="不限" clearable style="width: 160px">
                <el-option v-for="s in semesters" :key="s.id" :label="s.name" :value="s.id" />
             </el-select>
          </el-form-item>

          <el-form-item label="截止学期">
             <el-select v-model="query.endSemesterId" placeholder="不限" clearable style="width: 160px">
                <el-option v-for="s in semesters" :key="s.id" :label="s.name" :value="s.id" />
             </el-select>
          </el-form-item>

          <el-form-item label="预测步长">
             <el-input-number v-model="query.horizon" :min="1" :max="3" style="width: 110px" />
          </el-form-item>

          <el-form-item label="模型">
             <el-select v-model="query.model" style="width: 130px">
                <el-option label="移动平均 (MA)" value="MA" />
                <el-option label="线性回归 (LR)" value="LR" />
             </el-select>
          </el-form-item>

          <el-form-item>
             <el-button type="primary" :loading="loading" @click="fetchData">
                <el-icon><Search /></el-icon> 查询预测
             </el-button>
          </el-form-item>
       </el-form>
    </el-card>

    <!-- 指标切换 -->
    <div class="metric-tabs" v-if="hasData">
       <el-radio-group v-model="currentMetric" @change="rebuildChart">
          <el-radio-button value="avgScore">平均分</el-radio-button>
          <el-radio-button value="passRate">及格率</el-radio-button>
          <el-radio-button value="excellentRate">优秀率</el-radio-button>
          <el-radio-button value="enrollCount">选课人数</el-radio-button>
       </el-radio-group>
    </div>

    <!-- 主图 -->
    <el-card shadow="never" class="chart-card" v-if="hasData" v-loading="loading">
       <template #header>
          <div class="card-header">
            <span>{{ dimensionLabel }}趋势预测 — {{ metricLabel }}</span>
          </div>
       </template>
       <ChartWrapper :option="chartOption" height="420px" />
    </el-card>

    <!-- 摘要卡片 -->
    <el-row :gutter="20" v-if="hasData" class="mt-20">
       <el-col :span="8">
          <el-card shadow="never" class="summary-card">
             <template #header>预测摘要</template>
             <div class="metrics-grid">
                <div class="metric-item">
                   <div class="label">下期预测值</div>
                   <div class="value highlight">{{ nextForecastValue }}</div>
                </div>
                <div class="metric-item">
                   <div class="label">趋势方向</div>
                   <div class="value" :class="trendClass">{{ trendText }}</div>
                </div>
                <div class="metric-item">
                   <div class="label">变化幅度</div>
                   <div class="value">{{ changeRateText }}</div>
                </div>
             </div>
          </el-card>
       </el-col>
       <el-col :span="8">
          <el-card shadow="never" class="summary-card">
             <template #header>模型信息</template>
             <div class="metrics-grid">
                <div class="metric-item">
                   <div class="label">MAE (平均绝对误差)</div>
                   <div class="value">{{ resultData.metrics?.mae != null ? Number(resultData.metrics.mae.toFixed(2)) : '-' }}</div>
                </div>
                <div class="metric-item">
                   <div class="label">当前模型</div>
                   <div class="value">{{ query.model === 'MA' ? '移动平均' : '线性回归' }}</div>
                </div>
             </div>
          </el-card>
       </el-col>
       <el-col :span="8">
          <el-card shadow="never" class="suggestion-card">
             <template #header>
                <div style="display: flex; align-items: center; gap: 6px">
                  <el-icon class="bulb-icon"><Bulb /></el-icon> AI 建议
                </div>
             </template>
             <div class="suggestion-text">{{ resultData.suggestion || '暂无建议' }}</div>
          </el-card>
       </el-col>
    </el-row>

    <!-- 明细表格 -->
    <el-card shadow="never" class="table-card mt-20" v-if="hasData">
       <template #header>历史 + 预测明细</template>
       <el-table :data="tableData" stripe border style="width: 100%" size="small">
          <el-table-column prop="label" label="时段" width="140" />
          <el-table-column prop="type" label="类型" width="80">
             <template #default="{ row }">
                <el-tag :type="row.type === '预测' ? 'warning' : 'success'" size="small">{{ row.type }}</el-tag>
             </template>
          </el-table-column>
          <el-table-column prop="avgScore" label="平均分" width="100">
             <template #default="{ row }">{{ fmt(row.avgScore) }}</template>
          </el-table-column>
          <el-table-column prop="passRate" label="及格率" width="100">
             <template #default="{ row }">{{ pct(row.passRate) }}</template>
          </el-table-column>
          <el-table-column prop="excellentRate" label="优秀率" width="100">
             <template #default="{ row }">{{ pct(row.excellentRate) }}</template>
          </el-table-column>
          <el-table-column prop="enrollCount" label="选课人数" width="100" />
          <el-table-column label="置信区间" v-if="tableData.some(r => r.confidence)">
             <template #default="{ row }">
                <span v-if="row.confidence">{{ Number(row.confidence.lower?.toFixed(2)) }} ~ {{ Number(row.confidence.upper?.toFixed(2)) }}</span>
                <span v-else>-</span>
             </template>
          </el-table-column>
       </el-table>
    </el-card>

    <el-empty v-if="!hasData && !loading" description="请选择维度和对象后点击查询" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'
import { useDictStore } from '@/store/dict'
import ChartWrapper from '@/components/ChartWrapper.vue'
import * as echarts from 'echarts'

const userStore = useUserStore()
const dictStore = useDictStore()

const loading = ref(false)
const semesters = ref([])
const dimensionOptions = ref([])

const query = reactive({
  dimension: 'COLLEGE',
  dimensionId: null,
  timeGranularity: 'SEMESTER',
  startSemesterId: null,
  endSemesterId: null,
  horizon: 1,
  model: 'MA'
})

const currentMetric = ref('avgScore')
const resultData = ref({})
const chartOption = ref({})

const hasData = computed(() => {
  return resultData.value && (resultData.value.history?.length > 0 || resultData.value.forecast?.length > 0)
})

// ── 维度相关 ──
const dimensionLabel = computed(() => {
  const map = { COLLEGE: '学院', MAJOR: '专业', COURSE: '课程' }
  return map[query.dimension] || '对象'
})

const metricLabel = computed(() => {
  const map = { avgScore: '平均分', passRate: '及格率', excellentRate: '优秀率', enrollCount: '选课人数' }
  return map[currentMetric.value]
})

// COLLEGE_ADMIN / TEACHER 锁定学院
const isCollegeOrTeacher = computed(() =>
  userStore.roles.includes('COLLEGE_ADMIN') || userStore.roles.includes('TEACHER')
)
const isDimensionLocked = computed(() => {
  return query.dimension === 'COLLEGE' && isCollegeOrTeacher.value && userStore.dataScope?.collegeId
})

// ── 辅助方法联动加载 ──
// 临时保存学院列表用于专业/课程的联动
const collegeIdForMajor = ref(null)

const loadDimensionOptions = async () => {
  dimensionOptions.value = []
  query.dimensionId = null

  if (query.dimension === 'COLLEGE') {
    dimensionOptions.value = await dictStore.getColleges()
    // COLLEGE_ADMIN / TEACHER 自动锁定
    if (isCollegeOrTeacher.value && userStore.dataScope?.collegeId) {
      query.dimensionId = userStore.dataScope.collegeId
    }
  } else if (query.dimension === 'MAJOR') {
    // 需要先选学院
    const colleges = await dictStore.getColleges()
    if (isCollegeOrTeacher.value && userStore.dataScope?.collegeId) {
      collegeIdForMajor.value = userStore.dataScope.collegeId
    } else if (colleges.length > 0) {
      collegeIdForMajor.value = colleges[0].id
    }
    if (collegeIdForMajor.value) {
      dimensionOptions.value = await dictStore.getMajors(collegeIdForMajor.value)
    }
  } else if (query.dimension === 'COURSE') {
    // 需要学期
    const defaultSemId = semesters.value.length > 0 ? semesters.value[semesters.value.length - 1].id : null
    if (defaultSemId) {
      dimensionOptions.value = await dictStore.getCourses(defaultSemId)
    }
  }
}

const handleDimensionChange = () => {
  loadDimensionOptions()
}

// ── 请求数据 ──
const fetchData = async () => {
  if (!query.dimensionId) {
    return
  }
  loading.value = true
  try {
    const params = {
      dimension: query.dimension,
      dimensionId: query.dimensionId,
      timeGranularity: query.timeGranularity,
      horizon: query.horizon,
      model: query.model
    }
    if (query.startSemesterId) params.startSemesterId = query.startSemesterId
    if (query.endSemesterId) params.endSemesterId = query.endSemesterId

    const data = await request({ url: '/predict/subject-trend', method: 'get', params })
    resultData.value = data || {}
    rebuildChart()
  } catch (e) {
    // request.js 已处理错误提示
  } finally {
    loading.value = false
  }
}

// ── 图表构建 ──
const rebuildChart = () => {
  const history = resultData.value.history || []
  const forecast = resultData.value.forecast || []
  if (history.length === 0 && forecast.length === 0) return

  const metric = currentMetric.value
  const isRate = metric === 'passRate' || metric === 'excellentRate'
  const formatVal = (v) => {
    if (v == null) return null
    return isRate ? Number((v * 100).toFixed(2)) : Number(Number(v).toFixed(2))
  }

  const allLabels = [...history.map(h => h.label), ...forecast.map(f => f.label)]

  // 历史数据
  const histValues = history.map(h => formatVal(h[metric]))

  // 预测数据 —— 需要与历史最后一点衔接
  const foreValues = []
  for (let i = 0; i < history.length - 1; i++) foreValues.push(null)
  if (history.length > 0) foreValues.push(formatVal(history[history.length - 1][metric]))
  forecast.forEach(f => foreValues.push(formatVal(f[metric])))

  // 置信区间 markArea（仅 avgScore 有 confidence）
  const markAreaData = []
  forecast.forEach((f, idx) => {
    if (f.confidence) {
      const xIdx = history.length + idx
      markAreaData.push([
        { xAxis: allLabels[xIdx], yAxis: isRate ? Number((f.confidence.lower * 100).toFixed(2)) : Number(f.confidence.lower.toFixed(2)) },
        { xAxis: allLabels[xIdx], yAxis: isRate ? Number((f.confidence.upper * 100).toFixed(2)) : Number(f.confidence.upper.toFixed(2)) }
      ])
    }
  })

  chartOption.value = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params) => {
        let tip = params[0]?.axisValue + '<br/>'
        params.forEach(p => {
          if (p.value != null) {
            tip += `${p.marker} ${p.seriesName}: ${p.value}${isRate ? '%' : ''}<br/>`
          }
        })
        return tip
      }
    },
    legend: { data: ['历史', '预测'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: allLabels },
    yAxis: {
      type: 'value',
      name: isRate ? '百分比 (%)' : (metric === 'enrollCount' ? '人数' : '分数'),
      axisLabel: { formatter: isRate ? '{value}%' : '{value}' }
    },
    series: [
      {
        name: '历史',
        type: 'line',
        data: histValues,
        smooth: true,
        itemStyle: { color: '#409EFF' },
        lineStyle: { width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64,158,255,0.25)' },
            { offset: 1, color: 'rgba(64,158,255,0.05)' }
          ])
        }
      },
      {
        name: '预测',
        type: 'line',
        data: foreValues,
        smooth: true,
        itemStyle: { color: '#E6A23C' },
        lineStyle: { type: 'dashed', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(230,162,60,0.18)' },
            { offset: 1, color: 'rgba(230,162,60,0.02)' }
          ])
        },
        markArea: markAreaData.length > 0 ? {
          silent: true,
          itemStyle: { color: 'rgba(230,162,60,0.12)', borderColor: 'rgba(230,162,60,0.3)', borderWidth: 1 },
          data: markAreaData
        } : undefined
      }
    ]
  }
}

// ── 表格 ──
const tableData = computed(() => {
  const history = (resultData.value.history || []).map(h => ({ ...h, type: '历史' }))
  const forecast = (resultData.value.forecast || []).map(f => ({ ...f, type: '预测' }))
  return [...history, ...forecast]
})

const fmt = (v) => v != null ? Number(Number(v).toFixed(2)) : '-'
const pct = (v) => v != null ? Number((v * 100).toFixed(2)) + '%' : '-'

// ── 摘要 ──
const nextForecastValue = computed(() => {
  const fc = resultData.value.forecast
  if (!fc || fc.length === 0) return '-'
  const v = fc[0][currentMetric.value]
  if (v == null) return '-'
  const isRate = currentMetric.value === 'passRate' || currentMetric.value === 'excellentRate'
  return isRate ? Number((v * 100).toFixed(2)) + '%' : Number(Number(v).toFixed(2))
})

const trendText = computed(() => {
  const t = resultData.value.metrics?.trend
  const map = { UP: '📈 上升', DOWN: '📉 下降', STABLE: '➡️ 平稳' }
  return map[t] || '-'
})

const trendClass = computed(() => {
  const t = resultData.value.metrics?.trend
  return { UP: 'trend-up', DOWN: 'trend-down', STABLE: 'trend-stable' }[t] || ''
})

const changeRateText = computed(() => {
  const r = resultData.value.metrics?.changeRate
  if (r == null) return '-'
  return (r > 0 ? '+' : '') + Number((r * 100).toFixed(2)) + '%'
})

// ── 初始化 ──
onMounted(async () => {
  semesters.value = await dictStore.getSemesters()
  await loadDimensionOptions()
})
</script>

<style scoped>
.subject-trend-container {
  padding: 20px;
}
.filter-card {
  border-radius: 8px;
  margin-bottom: 16px;
}
.metric-tabs {
  margin-bottom: 16px;
}
.chart-card, .summary-card, .suggestion-card, .table-card {
  border-radius: 8px;
}
.mt-20 { margin-top: 20px; }
.card-header {
  font-weight: 600;
  color: #303133;
}

/* 摘要卡片 */
.metrics-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.metric-item .label {
  color: #909399;
  font-size: 13px;
  margin-bottom: 4px;
}
.metric-item .value {
  font-size: 22px;
  font-weight: bold;
  color: #303133;
}
.metric-item .value.highlight {
  color: #409EFF;
}
.trend-up { color: #67C23A !important; }
.trend-down { color: #F56C6C !important; }
.trend-stable { color: #909399 !important; }

/* 建议 */
.suggestion-text {
  font-size: 14px;
  color: #606266;
  line-height: 1.7;
  white-space: pre-wrap;
}
.bulb-icon {
  color: #E6A23C;
  font-size: 18px;
}
</style>

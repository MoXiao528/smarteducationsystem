<template>
  <div class="compare-container">
    <el-card shadow="never" class="control-panel">
       <el-form :inline="true" label-width="80px">
          <el-form-item label="对比维度">
             <el-select v-model="dimension" @change="handleDimensionChange" style="width: 150px">
                <el-option label="学院对比" value="COLLEGE" />
                <el-option label="专业对比" value="MAJOR" />
                <!-- Add other dimensions as needed based on Guide limits -->
             </el-select>
          </el-form-item>
          <el-form-item label="对比对象">
             <el-select v-model="selectedIds" multiple :multiple-limit="5" placeholder="请选择(最多5个)" style="width: 300px" @change="fetchCompareData">
                <el-option v-for="item in objectOptions" :key="item.id" :label="item.name" :value="item.id" />
             </el-select>
          </el-form-item>
       </el-form>
    </el-card>

    <!-- Results Area -->
    <div v-if="selectedIds.length > 0" class="results-area" v-loading="loading">
       <el-row :gutter="20">
          <!-- Metrics Table -->
          <el-col :span="24">
             <el-card shadow="never" class="result-card">
               <template #header><div class="card-header">指标对比</div></template>
               <el-table :data="compareData.metrics" border stripe>
                  <el-table-column prop="name" :label="dimensionName" />
                  <el-table-column prop="count" label="有效成绩数" />
                  <el-table-column prop="avgScore" label="平均分">
                    <template #default="scope">{{ scope.row.avgScore ? scope.row.avgScore.toFixed(1) : '-' }}</template>
                  </el-table-column>
                  <el-table-column prop="stdDev" label="标准差" />
                   <el-table-column prop="passRate" label="及格率">
                     <template #default="scope">
                       <el-progress :percentage="Number((scope.row.passRate * 100).toFixed(1))" :color="customColors" />
                     </template>
                  </el-table-column>
                  <el-table-column prop="excellentRate" label="优秀率">
                     <template #default="scope">
                       <el-progress :percentage="Number((scope.row.excellentRate * 100).toFixed(1))" />
                     </template>
                  </el-table-column>
               </el-table>
             </el-card>
          </el-col>

          <!-- Distribution Chart -->
          <el-col :span="12">
             <el-card shadow="never" class="result-card mt-20">
               <template #header><div class="card-header">成绩分布对比</div></template>
               <ChartWrapper :option="distOption" height="350px" />
             </el-card>
          </el-col>

          <!-- Trend Chart -->
          <el-col :span="12">
             <el-card shadow="never" class="result-card mt-20">
               <template #header><div class="card-header">历史趋势对比 (平均分)</div></template>
               <ChartWrapper :option="trendOption" height="350px" />
             </el-card>
          </el-col>
       </el-row>
    </div>
    
    <el-empty v-else description="请先选择至少一个对比对象" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { useDictStore } from '@/store/dict'
import ChartWrapper from '@/components/ChartWrapper.vue'

const dictStore = useDictStore()

const dimension = ref('COLLEGE')
const selectedIds = ref([])
const objectOptions = ref([])
const dimensionName = ref('学院')

const loading = ref(false)
const compareData = ref({ metrics: [], distribution: {}, trend: {} })

const distOption = ref({})
const trendOption = ref({})

const customColors = [
  { color: '#f56c6c', percentage: 60 },
  { color: '#e6a23c', percentage: 80 },
  { color: '#5cb87a', percentage: 100 }
]

const loadObjectOptions = async () => {
   if (dimension.value === 'COLLEGE') {
      objectOptions.value = await dictStore.getColleges()
      dimensionName.value = '学院'
   } else if (dimension.value === 'MAJOR') {
      // Need all majors without college id strict filter, or cascade selection. 
      // For simplicity here, relying on backend. 
      // If dictated strictly by guide: GET /api/dict/majors?collegeId=
      // If user wants all majors, they'll need an endpoint. We mock for now via college loop
      const colleges = await dictStore.getColleges()
      let allMajors = []
      for(let college of colleges) {
          const m = await dictStore.getMajors(college.id)
          allMajors.push(...m)
      }
      objectOptions.value = allMajors
      dimensionName.value = '专业'
   }
}

const handleDimensionChange = () => {
   selectedIds.value = []
   loadObjectOptions()
}

const fetchCompareData = async () => {
   if(selectedIds.value.length === 0) return
   
   loading.value = true
   try {
      const data = await request({
         url: '/olap/compare',
         method: 'get',
         params: {
            dimension: dimension.value,
            ids: selectedIds.value.join(','),
            metric: 'avgScore'
         }
      })
      compareData.value = data
      renderCharts(data)
   } catch(e) {} finally {
      loading.value = false
   }
}

const renderCharts = (data) => {
   // Distribution
   const dist = data.distribution || { bins: [], series: [] }
   distOption.value = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: dist.series.map(s => s.name) },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: dist.bins },
      yAxis: { type: 'value', name: '比率', axisLabel: { formatter: '{value}' } },
      series: dist.series.map(s => ({
         name: s.name,
         type: 'bar',
         data: s.values
      }))
   }

   // Trend
   const trend = data.trend || { x: [], series: [] }
   trendOption.value = {
      tooltip: { trigger: 'axis' },
      legend: { data: trend.series.map(s => s.name) },
       grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: trend.x },
      yAxis: { type: 'value', name: '分数' },
      series: trend.series.map(s => ({
         name: s.name,
         type: 'line',
         data: s.values,
         smooth: true
      }))
   }
}

onMounted(() => {
   loadObjectOptions()
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
:deep(.el-progress-bar__innerText) {
  color: #fff;
}
</style>

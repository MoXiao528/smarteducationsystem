<template>
  <div class="enroll-forecast">
    <el-card shadow="never" class="filter-card">
       <el-form :inline="true" label-width="80px">
          <el-form-item label="课程选择">
             <el-select v-model="courseId" placeholder="请选择课程" filterable style="width: 200px" @change="fetchPredictData">
               <el-option v-for="c in courseOptions" :key="c.id" :label="c.name" :value="c.id" />
             </el-select>
          </el-form-item>
          <el-form-item label="预测模型">
             <el-select v-model="model" style="width: 120px" @change="fetchPredictData">
               <el-option label="简单移动平均" value="MA" />
               <el-option label="线性回归" value="LR" />
               <el-option label="ARIMA" value="ARIMA" />
             </el-select>
          </el-form-item>
          <el-form-item label="预测期数">
              <el-input-number v-model="horizon" :min="1" :max="4" style="width: 100px" @change="fetchPredictData" />
          </el-form-item>
       </el-form>
    </el-card>

    <div v-if="courseId" class="mt-20">
      <el-row :gutter="20">
         <el-col :span="16">
            <el-card shadow="never" class="chart-card" v-loading="loading">
               <template #header>选课人数预测与历史趋势</template>
               <ChartWrapper :option="predictOption" height="400px" />
            </el-card>
         </el-col>
         <el-col :span="8">
            <el-card shadow="never" class="info-card mb-20">
               <template #header>模型指标</template>
               <div class="metrics-grid">
                  <div class="metric-item">
                     <div class="label">MAE (平均绝对误差)</div>
                     <div class="value">{{ metrics.mae }}</div>
                  </div>
                  <div class="metric-item mt-10">
                     <div class="label">RMSE (均方根误差)</div>
                     <div class="value">{{ metrics.rmse }}</div>
                  </div>
               </div>
            </el-card>

            <el-card shadow="never" class="info-card">
               <template #header>智能建议</template>
               <div class="suggestion-text">
                  <el-icon class="bulb-icon"><Bulb /></el-icon>
                  <span>{{ suggestionText }}</span>
               </div>
            </el-card>
         </el-col>
      </el-row>
    </div>
    
    <el-empty v-else description="请先搜索并选择一门课程进行预测分析" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '@/utils/request'
import ChartWrapper from '@/components/ChartWrapper.vue'

import { useUserStore } from '@/store/user'
import { useDictStore } from '@/store/dict'

// Assuming we have an endpoint that returns all courses or we get it from dict
const courseOptions = ref([]) 
const courseId = ref(null)
const model = ref('LR')
const horizon = ref(1)

const loading = ref(false)
const metrics = reactive({ mae: '-', rmse: '-' })
const suggestionText = ref('')
const predictOption = ref({})

const userStore = useUserStore()
const dictStore = useDictStore()

const loadAllCourses = async () => {
   try {
       // 获取学期列表，取最新学期作为默认 semesterId
       const semesters = await dictStore.getSemesters()
       const defaultSemesterId = semesters.length > 0 ? semesters[semesters.length - 1].id : null
       let list = await request({
          url: '/dict/courses',
          method: 'get',
          params: { semesterId: defaultSemesterId }
       })
       if (userStore.dataScope?.type === 'TEACHING' && userStore.dataScope.courseIds && userStore.dataScope.courseIds.length > 0) {
          list = list.filter(c => userStore.dataScope.courseIds.includes(c.id))
       }
       courseOptions.value = list
       if(courseOptions.value && courseOptions.value.length > 0) {
          courseId.value = courseOptions.value[0].id
          fetchPredictData()
       }
   } catch(e) {}
}

const fetchPredictData = async () => {
   if(!courseId.value) return
   loading.value = true
   try {
      const data = await request({
         url: '/predict/enroll',
         method: 'get',
         params: { courseId: courseId.value, horizon: horizon.value, model: model.value }
      })
      
      metrics.mae = Number(data.metrics.mae.toFixed(2))
      metrics.rmse = Number(data.metrics.rmse.toFixed(2))
      suggestionText.value = data.suggestionText

      const histData = data.history || []
      const foreData = data.forecast || []
      
      // Merge x axis
      const allX = histData.map(i => i.x).concat(foreData.map(i => i.x))
      // Create padding for forecast line
      const paddedForeData = Array(histData.length - 1).fill('-')
      paddedForeData.push(histData[histData.length - 1].y) // connect the dot
      foreData.forEach(i => paddedForeData.push(i.y))

      predictOption.value = {
         tooltip: { trigger: 'axis' },
         legend: { data: ['历史实际', '预测期望'], bottom: '0' },
         grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
         xAxis: { type: 'category', boundaryGap: false, data: allX },
         yAxis: { type: 'value' },
         series: [
           {
              name: '历史实际',
              type: 'line',
              data: histData.map(i => i.y),
              itemStyle: { color: '#409EFF' },
              areaStyle: { color: 'rgba(64, 158, 255, 0.2)' },
              smooth: true
           },
           {
              name: '预测期望',
              type: 'line',
              data: paddedForeData,
              itemStyle: { color: '#E6A23C' },
              lineStyle: { type: 'dashed', width: 2 },
              smooth: true
           }
         ]
      }
   } catch(e) {} finally {
      loading.value = false
   }
}

onMounted(() => {
   loadAllCourses()
})
</script>

<style scoped>
.filter-card, .chart-card, .info-card {
  border-radius: 8px;
}
.mt-20 { margin-top: 20px; }
.mt-10 { margin-top: 10px; }
.mb-20 { margin-bottom: 20px; }

.metric-item .label {
  color: #909399;
  font-size: 14px;
}
.metric-item .value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}
.suggestion-text {
  font-size: 15px;
  color: #606266;
  line-height: 1.6;
  padding: 10px;
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
</style>

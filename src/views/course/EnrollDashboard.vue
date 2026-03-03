<template>
  <div class="enroll-dashboard">
    <GlobalFilterBar
      :show-filters="['semester', 'college', 'major']"
      :default-filters="{}"
      @filter-change="fetchDashboardData"
    />

    <MetricCards :metrics="metricData" class="mt-20" />

    <el-row :gutter="20" class="mt-20">
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
           <template #header>专业人数分布</template>
           <ChartWrapper :option="majorOption" :loading="loading" height="300px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
           <template #header>年级人数分布</template>
           <ChartWrapper :option="gradeOption" :loading="loading" height="300px" />
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="mt-20 table-card">
      <template #header>热门满载课程 TOP 10</template>
      <el-table :data="hotCourses" v-loading="loading" border stripe>
        <el-table-column prop="courseName" label="课程名" />
        <el-table-column prop="teacherName" label="授课教师" width="150" />
        <el-table-column prop="capacity" label="容量" width="100" />
        <el-table-column prop="enroll" label="选报数" width="100" />
        <el-table-column label="满载率" width="150">
           <template #default="scope">
             <el-progress 
                :percentage="(scope.row.enroll / scope.row.capacity * 100).toFixed(1)"
                :status="getLoadStatus(scope.row.enroll, scope.row.capacity)" 
             />
           </template>
        </el-table-column>
        <el-table-column prop="dropRate" label="退课率" width="100">
           <template #default="scope">
             {{ (scope.row.dropRate * 100).toFixed(1) + '%' }}
           </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import request from '@/utils/request'
import GlobalFilterBar from '@/components/GlobalFilterBar.vue'
import MetricCards from '@/components/MetricCards.vue'
import ChartWrapper from '@/components/ChartWrapper.vue'

const loading = ref(false)
const metricData = ref([])
const hotCourses = ref([])

const majorOption = ref({})
const gradeOption = ref({})

const fetchDashboardData = async (filters) => {
   loading.value = true
   try {
     const data = await request({
       url: '/olap/enroll/dashboard',
       method: 'get',
       params: filters
     })
     
     metricData.value = [
       { label: '开设课程数', value: data.openCourseCount },
       { label: '总课程数', value: data.courseCount },
       { label: '总选课人次', value: data.enrollCount }
     ]
     
     hotCourses.value = data.hotCourses || []
     
     majorOption.value = renderPieOption('专业分布', data.majorDistribution || [])
     gradeOption.value = renderPieOption('年级分布', data.gradeDistribution || [])
     
   } catch(e) {} finally {
     loading.value = false
   }
}

const renderPieOption = (name, dataList) => {
   return {
      tooltip: { trigger: 'item' },
      legend: { bottom: '0', left: 'center' },
      series: [
        {
          name: name,
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: { show: false, position: 'center' },
          emphasis: {
            label: { show: true, fontSize: '18', fontWeight: 'bold' }
          },
          labelLine: { show: false },
          data: dataList
        }
      ]
   }
}

const getLoadStatus = (enroll, cap) => {
   const ratio = enroll / cap;
   if(ratio >= 1.0) return 'exception'
   if(ratio > 0.8) return 'warning'
   return 'success'
}
</script>

<style scoped>
.mt-20 { margin-top: 20px; }
.chart-card, .table-card { border-radius: 8px; }
</style>

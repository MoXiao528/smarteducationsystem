<template>
  <div class="chart-wrapper" ref="chartRef" :style="{ height: height, width: width }">
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  option: {
    type: Object,
    required: true
  },
  height: {
    type: String,
    default: '300px'
  },
  width: {
    type: String,
    default: '100%'
  },
  loading: {
     type: Boolean,
     default: false
  }
})

const chartRef = ref(null)
let chartInstance = null

const initChart = () => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    if (props.option) {
       chartInstance.setOption(props.option)
    }
  }
}

watch(() => props.option, (newVal) => {
   if(chartInstance && newVal) {
      chartInstance.setOption(newVal, true) // true means merge=false
   }
}, { deep: true })

watch(() => props.loading, (newVal) => {
   if(chartInstance) {
      if(newVal) chartInstance.showLoading()
      else chartInstance.hideLoading()
   }
})

const handleResize = () => {
   if(chartInstance) {
      chartInstance.resize()
   }
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped>
.chart-wrapper {
  position: relative;
  background-color: #fff;
  border-radius: 8px;
}
</style>

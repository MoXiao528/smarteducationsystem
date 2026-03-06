<template>
  <div class="metric-cards">
    <el-row :gutter="20">
      <el-col v-for="(item, index) in metrics" :key="index" :span="24 / metrics.length" :xs="12" :sm="8" :md="24 / metrics.length">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-header">
            <span>{{ item.label }}</span>
            <el-tooltip v-if="item.tooltip" :content="item.tooltip" placement="top">
              <el-icon class="info-icon"><Warning /></el-icon>
            </el-tooltip>
          </div>
          <div class="metric-body">
            <span class="value">{{ formatValue(item.value, item.unit) }}</span>
            <span v-if="item.unit" class="unit">{{ item.unit }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
defineProps({
  metrics: {
    type: Array,
    required: true,
    // [ { label: 'Student Count', value: 12000, tooltip: '...', unit: '' } ]
  }
})

const formatValue = (val, unit) => {
   if(val === undefined || val === null) return '-'
   if(unit === '%') {
      return Number((val * 100).toFixed(2))
   }
   return val
}
</script>

<style scoped>
.metric-card {
  border-radius: 12px;
  background: linear-gradient(135deg, #ffffff 0%, #fcfdfe 100%);
  border: 1px solid #ebeef5;
  transition: all 0.3s;
  margin-bottom: 20px;
}
.metric-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.05) !important;
}
.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #909399;
  font-size: 14px;
  margin-bottom: 12px;
}
.info-icon {
  cursor: pointer;
  color: #c0c4cc;
}
.info-icon:hover {
  color: #409EFF;
}
.metric-body {
  display: flex;
  align-items: baseline;
}
.value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}
.unit {
  font-size: 14px;
  color: #909399;
  margin-left: 4px;
}
</style>

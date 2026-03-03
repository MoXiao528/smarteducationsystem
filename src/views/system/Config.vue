<template>
  <div class="system-config-container app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>系统基础设定</span>
        </div>
      </template>

      <div class="config-actions">
         <el-button type="primary" icon="Upload">数据导入</el-button>
         <el-button type="success" icon="Download">数据导出</el-button>
      </div>

      <el-divider />

      <el-form label-width="150px" class="mt-20">
         <el-form-item label="当前学年学期设定">
            <el-select placeholder="请选择默认学期" style="width: 300px">
               <!-- Mock options -->
               <el-option label="2023-2024 第一学期" value="1" />
               <el-option label="2023-2024 第二学期" value="2" />
               <el-option label="2024-2025 第一学期" value="3" />
            </el-select>
         </el-form-item>
         <el-form-item label="选课开关">
            <el-switch active-text="开放" inactive-text="关闭" />
         </el-form-item>
         <el-form-item label="教务数据同步">
            <el-button type="warning">立即同步</el-button>
            <span class="hint-text ml-10">最近一次同步：今日 02:00</span>
         </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
// Mocked setup for SysMetricConfig
</script>

<style scoped>
.app-container {
  padding: 20px;
}
.card-header {
  font-weight: bold;
  font-size: 16px;
}
.config-actions {
  display: flex;
  gap: 15px;
  padding: 10px 0;
}
.mt-20 {
  margin-top: 20px;
}
.ml-10 {
  margin-left: 10px;
}
.hint-text {
  color: #909399;
  font-size: 13px;
}
</style>

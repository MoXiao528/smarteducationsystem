<template>
  <div class="app-container">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>学生基本信息</span>
        </div>
      </template>
      <el-descriptions v-loading="loading" :column="2" border>
        <el-descriptions-item label="姓名">{{ profile.name }}</el-descriptions-item>
        <el-descriptions-item label="学号">{{ profile.studentNo }}</el-descriptions-item>
        <el-descriptions-item label="学院">{{ profile.collegeName }}</el-descriptions-item>
        <el-descriptions-item label="专业">{{ profile.majorName }}</el-descriptions-item>
        <el-descriptions-item label="年级">{{ profile.gradeName }}</el-descriptions-item>
        <el-descriptions-item label="班级">{{ profile.className }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const profile = ref({})

const fetchProfile = async () => {
  loading.value = true
  try {
    const res = await request({
      url: '/student/profile',
      method: 'get'
    })
    // If backend returns { code: 200, data: x }, request interceptor usually returns data directly
    profile.value = res || {}
  } catch (error) {
    ElMessage.error('获取个人信息失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchProfile()
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
</style>

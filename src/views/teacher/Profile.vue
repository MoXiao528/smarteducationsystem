<template>
  <div class="app-container">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>教师基本信息</span>
        </div>
      </template>
      <el-descriptions v-loading="loading" :column="2" border>
        <el-descriptions-item label="姓名">{{ profile.name }}</el-descriptions-item>
        <el-descriptions-item label="教龄">{{ profile.teachingYears }} 年</el-descriptions-item>
        <el-descriptions-item label="职称">{{ profile.title }}</el-descriptions-item>
        <el-descriptions-item label="教授课程">
          <el-tag v-for="course in profile.courses" :key="course" style="margin-right: 8px;">{{ course }}</el-tag>
        </el-descriptions-item>
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
      url: '/teacher/profile',
      method: 'get'
    })
    // Assuming request interceptor unwraps response data
    profile.value = res || {}
  } catch (error) {
    ElMessage.error('获取教师信息失败')
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

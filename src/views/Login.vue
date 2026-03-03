<template>
  <div class="login-container">
    <div class="login-box">
      <div class="title-container">
        <h3 class="title">智慧教育大数据平台</h3>
      </div>
      <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" class="login-form">
        <el-form-item prop="username">
          <el-input v-model="loginForm.username" placeholder="用户名" :prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="loginForm.password" type="password" placeholder="密码" :prefix-icon="Lock" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-button :loading="loading" type="primary" style="width:100%;margin-bottom:30px;" @click.prevent="handleLogin">登录</el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const loginFormRef = ref(null)
const loginForm = reactive({ username: '', password: '' })
const loginRules = {
  username: [{ required: true, trigger: 'blur', message: '请输入用户名' }],
  password: [{ required: true, trigger: 'blur', message: '请输入密码' }]
}

const loading = ref(false)

const handleLogin = () => {
  loginFormRef.value.validate(valid => {
    if (valid) {
      loading.value = true
      userStore.login(loginForm).then(success => {
        if(success) {
           ElMessage.success('登录成功')
           router.push({ path: route.query.redirect || '/' })
        }
      }).finally(() => {
        loading.value = false
      })
    }
  })
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}
.login-box {
  width: 420px;
  background: rgba(255, 255, 255, 0.9);
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}
.title-container {
  text-align: center;
  margin-bottom: 30px;
}
.title {
  font-size: 24px;
  color: #303133;
  margin: 0;
  font-weight: 600;
}
.el-form-item {
  margin-bottom: 24px;
}
.el-input__wrapper {
  background-color: #f5f7fa;
  box-shadow: none;
  border-radius: 8px;
}
.el-button--primary {
  height: 44px;
  border-radius: 8px;
  font-size: 16px;
  background: linear-gradient(90deg, #409EFF, #3a8ee6);
  border: none;
  transition: transform 0.2s, box-shadow 0.2s;
}
.el-button--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
}
</style>

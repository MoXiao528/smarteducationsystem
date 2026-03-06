<template>
  <div class="system-config-container app-container">
    <el-row :gutter="20">
      <!-- 左侧：运行参数与阈值配置 -->
      <el-col :span="14">
        <el-card shadow="hover" class="mb-20">
          <template #header>
            <div class="card-header">
              <el-icon><Setting /></el-icon>
              <span class="ml-5">系统运行参数</span>
            </div>
          </template>
          <el-form label-width="150px" v-loading="loadingDicts">
            <el-form-item label="当前学年学期">
              <el-select v-model="sysConfig.currentSemester" placeholder="请选择默认运行学期" style="width: 100%">
                <el-option 
                  v-for="item in semesterList" 
                  :key="item.id" 
                  :label="item.name" 
                  :value="item.id" 
                />
              </el-select>
            </el-form-item>
            <el-form-item label="系统维护模式">
              <el-switch v-model="metricConfig.maintenanceMode" active-text="开启维护" inactive-text="正常运行" :active-value="true" :inactive-value="false" active-color="#ff4949" @change="handleMaintenanceChange" />
              <div class="hint-text mt-5" style="margin-left: 20px;">开启后除超级管理员外其他角色无法登录，用于重大数据更新期间的保护</div>
            </el-form-item>

          </el-form>
        </el-card>

        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><Odometer /></el-icon>
              <span class="ml-5">学情分析指标阈值</span>
            </div>
          </template>
          <el-form :model="metricConfig" label-width="150px" v-loading="loadingMetric">
            <el-form-item label="及格线 (Pass)" v-show="false">
              <el-input-number v-model="metricConfig.passScore" :min="0" :max="100" />
            </el-form-item>
            <el-form-item label="优秀线 (Excellent)" v-show="false">
              <el-input-number v-model="metricConfig.excellentScore" :min="0" :max="100" />
            </el-form-item>
            <el-form-item label="学情全量分数段阈值">
              <el-row :gutter="10" class="w-full">
                <el-col :span="4" class="text-center">
                  <div class="bin-label mb-5" style="font-size: 13px; color: #606266;">0 - 及格线</div>
                  <el-input-number v-model="binThresholds[0]" :min="1" :max="100" :controls="false" class="w-full" />
                </el-col>
                <el-col :span="1" class="text-center" style="line-height:60px;">→</el-col>
                <el-col :span="4" class="text-center">
                  <div class="bin-label mb-5" style="font-size: 13px; color: #606266;">及格 - 中等</div>
                  <el-input-number v-model="binThresholds[1]" :min="1" :max="100" :controls="false" class="w-full" />
                </el-col>
                <el-col :span="1" class="text-center" style="line-height:60px;">→</el-col>
                <el-col :span="4" class="text-center">
                  <div class="bin-label mb-5" style="font-size: 13px; color: #606266;">中等 - 良好</div>
                  <el-input-number v-model="binThresholds[2]" :min="1" :max="100" :controls="false" class="w-full" />
                </el-col>
                <el-col :span="1" class="text-center" style="line-height:60px;">→</el-col>
                <el-col :span="4" class="text-center">
                  <div class="bin-label mb-5" style="font-size: 13px; color: #606266;">良好 - 优秀</div>
                  <el-input-number v-model="binThresholds[3]" :min="1" :max="100" :controls="false" class="w-full" />
                </el-col>
                <el-col :span="1" class="text-center" style="line-height:60px;">→</el-col>
                <el-col :span="4" class="text-center">
                  <div class="bin-label mb-5" style="font-size: 13px; color: #606266;">优秀 - 满分</div>
                  <el-input disabled placeholder="100" class="w-full text-center" />
                </el-col>
              </el-row>
              <div class="hint-text text-left mt-10 w-full" style="line-height: 1.4">
                注：请依次设置各个环节的临界上限分数（系统会自动提取第一项作为及格线，第四项作为优秀线）。<br/>更改此处后所有统计报表图表的分布区域将重新按此界限进行划分。
              </div>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveMetricConfig" :loading="savingMetric">保存指标设定</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧：数据流转与操作中心 -->
      <el-col :span="10">
        <el-card shadow="hover" class="import-card mb-20">
          <template #header>
            <div class="card-header">
              <el-icon><Coin /></el-icon>
              <span class="ml-5">数据流维护与备份</span>
            </div>
          </template>
          
          <div class="upload-section">
            <el-upload
              drag
              :action="uploadUrl"
              :data="{ type: 'SCORE', semesterId: sysConfig.currentSemester }"
              :headers="uploadHeaders"
              :show-file-list="false"
              :on-success="handleUploadSuccess"
              :on-error="handleUploadError"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                将数据文件拖拽至此 或 <em>点击上传导入</em>
              </div>
              <template #tip>
                <div class="el-upload__tip text-center">
                  支持标准 Excel 模板导入，关联所选【学年学期】
                </div>
              </template>
            </el-upload>
            
            <el-divider />
            
            <div class="export-actions">
              <p class="section-title">全量导出 / 备份</p>
              <el-button type="success" icon="Download" plain class="w-full" @click="handleExport" :loading="exporting">导出全量底层教务数据归档</el-button>
            </div>
          </div>
        </el-card>

        <!--
        <el-card shadow="hover" class="task-card">
          ...
        </el-card>
        -->
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting, Odometer, Coin, UploadFilled, Download, List, Delete } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

const loadingDicts = ref(false)
const loadingMetric = ref(false)
const savingMetric = ref(false)
const semesterList = ref([])
const importTasks = ref([])

// 模拟系统开关（暂未在后端提供相关配置接口，故在前端做展示）
const sysConfig = ref({
  currentSemester: null,
  courseSelectOpen: false,
  maintenanceMode: false
})

const metricConfig = ref({
  id: null,
  passScore: 60,
  excellentScore: 90,
  scoreBins: '[0,60,70,80,90,100]',
  maintenanceMode: false
})

const binThresholds = ref([60, 70, 80, 90])
const exporting = ref(false)

const uploadUrl = ref(import.meta.env.VITE_APP_BASE_API ? `${import.meta.env.VITE_APP_BASE_API}/admin/import` : '/api/admin/import')
const uploadHeaders = ref({
  Authorization: `Bearer ${userStore.token || ''}`
})

onMounted(() => {
  fetchSemesters()
  fetchMetricConfig()
})

// 加载字典：真实对接 DictController
const fetchSemesters = async () => {
  loadingDicts.value = true
  try {
    const data = await request({ url: '/dict/semesters', method: 'get' })
    if (data && Array.isArray(data)) {
        semesterList.value = data
        if (semesterList.value.length > 0) {
          sysConfig.value.currentSemester = semesterList.value[0].id
        }
    }
  } catch (error) {
    console.error(error)
  } finally {
    loadingDicts.value = false
  }
}

// 加载指标配置：真实对接 AdminController
const fetchMetricConfig = async () => {
  loadingMetric.value = true
  try {
    const data = await request({ url: '/config/metric-thresholds', method: 'get' })
    if (data) {
      metricConfig.value = data
      metricConfig.value.maintenanceMode = data.maintenanceMode === true || data.maintenanceMode === 1
      if (data.scoreBins) {
        try {
          const arr = JSON.parse(data.scoreBins)
          if (arr.length >= 6) {
             binThresholds.value = [arr[1], arr[2], arr[3], arr[4]]
          }
        } catch(e) {}
      }
    }
  } catch (error) {
    console.error(error)
  } finally {
    loadingMetric.value = false
  }
}

// 提交底层配置保存防呆校验与二次确认
const saveMetricConfig = async () => {
  const [t1, t2, t3, t4] = binThresholds.value
  if (!(t1 < t2 && t2 < t3 && t3 < t4 && t4 < 100)) {
    return ElMessage.warning('五个区间的临界线需严格按照由小到大的顺序递增，最高不可超过100分。')
  }

  metricConfig.value.passScore = t1
  metricConfig.value.excellentScore = t4
  metricConfig.value.scoreBins = JSON.stringify([0, t1, t2, t3, t4, 100])

  try {
    await ElMessageBox.confirm(
      '修改底层计算维度的及格线或分数段将可能影响数据仓库中各类学情分析与图表的分布状态。确定覆盖更改吗？',
      '风险级操作警告',
      {
        confirmButtonText: '强制生效',
        cancelButtonText: '暂不修改',
        type: 'warning',
        center: true
      }
    )

    savingMetric.value = true
    
    await request({
      url: '/config/metric-thresholds',
      method: 'put',
      data: metricConfig.value
    })
    
    ElMessage.success('系统级指标设定已保存。相关图表将依据新口径渲染！')
  } catch (err) {
    if (err !== 'cancel') {
        console.error(err)
    }
  } finally {
    savingMetric.value = false
  }
}

// 独立保存系统维护状态（避免干扰系统口径计算提交的风险提示）
const handleMaintenanceChange = async (val) => {
  try {
    await request({
      url: '/config/maintenance-mode',
      method: 'put',
      params: { mode: val }
    })
    ElMessage.success(val ? '系统已被切换至维护模式。' : '系统维护模式已关闭。')
  } catch (err) {
    // 失败时恢复原状态
    metricConfig.value.maintenanceMode = !val
  }
}

// 上传组件回调防呆
const handleUploadSuccess = (response) => {
  if (response.code === 0 || response.code === 200) {
    ElMessage.success('文件成功送达底座，已加入清洗队列！')
  } else {
    ElMessage.error(response.message || response.msg || '导入异常')
  }
}
const handleUploadError = () => {
  ElMessage.error('网络或环境异常，上传流已断开')
}

// 执行全量导出
const handleExport = async () => {
  exporting.value = true
  try {
    const res = await request({ 
      url: '/admin/export', 
      method: 'get', 
      responseType: 'blob' 
    })
    const url = window.URL.createObjectURL(new Blob([res]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'education_data_export.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('全量教务数据导出请求成功！')
  } catch (err) {
    ElMessage.error('导出失败，请检查网络或后端权限')
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.app-container {
  padding: 20px;
}
.card-header {
  font-weight: bold;
  font-size: 16px;
  display: flex;
  align-items: center;
}
.ml-5 { margin-left: 5px; }
.ml-10 { margin-left: 10px; }
.mr-10 { margin-right: 10px; }
.mt-5 { margin-top: 5px; }
.mt-10 { margin-top: 10px; }
.mb-10 { margin-bottom: 10px; }
.mb-20 { margin-bottom: 20px; }
.mx-10 { margin: 0 10px; }
.w-full { width: 100%; }
.text-center { text-align: center; }
.text-right { text-align: right; }

.hint-text {
  color: #909399;
  font-size: 13px;
  line-height: 1.4;
}
.section-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 15px;
  font-weight: bold;
}

.upload-section {
  text-align: center;
}
:deep(.el-upload), :deep(.el-upload-dragger) {
  width: 100%;
}

.bin-row {
  display: flex;
  align-items: center;
}
.bin-input {
  width: 110px;
}

.task-item {
  padding: 10px 0;
  border-bottom: 1px dashed #ebeef5;
}
.task-item:last-child {
  border-bottom: none;
}
.task-type {
  font-weight: bold;
  color: #409eff;
}
.task-status.success { color: #67c23a; }
.task-status.failed { color: #f56c6c; }
.task-status.processing { color: #e6a23c; }
.task-time { font-size: 12px; color: #a8abb2; }
.task-stats {
  font-size: 13px;
  color: #606266;
}
</style>

<template>
  <div class="settings">
    <h2>系统设置</h2>
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>监控配置</span>
        </div>
      </template>
      <el-form label-width="120px">
        <el-form-item label="监控频率">
          <el-select v-model="monitoringFrequency" placeholder="请选择监控频率">
            <el-option label="每1分钟" value="1m" />
            <el-option label="每5分钟" value="5m" />
            <el-option label="每10分钟" value="10m" />
            <el-option label="每30分钟" value="30m" />
            <el-option label="每小时" value="1h" />
          </el-select>
        </el-form-item>
        <el-form-item label="超时时间(ms)">
          <el-input-number v-model="timeout" :min="1000" :max="30000" :step="500" />
        </el-form-item>
        <el-form-item label="重试次数">
          <el-input-number v-model="retryCount" :min="0" :max="5" :step="1" />
        </el-form-item>
        <el-form-item label="启用邮件通知">
          <el-switch v-model="emailNotification" />
        </el-form-item>
        <el-form-item label="邮件服务器">
          <el-input v-model="emailServer" placeholder="smtp.example.com" />
        </el-form-item>
        <el-form-item label="邮件端口">
          <el-input-number v-model="emailPort" :min="1" :max="65535" :step="1" />
        </el-form-item>
        <el-form-item label="发件人邮箱">
          <el-input v-model="senderEmail" placeholder="admin@example.com" />
        </el-form-item>
        <el-form-item label="收件人邮箱">
          <el-input v-model="receiverEmail" placeholder="user@example.com" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveSettings">保存设置</el-button>
          <el-button @click="resetSettings">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

// 设置参数
const monitoringFrequency = ref('10m')
const timeout = ref(5000)
const retryCount = ref(3)
const emailNotification = ref(true)
const emailServer = ref('smtp.example.com')
const emailPort = ref(587)
const senderEmail = ref('admin@example.com')
const receiverEmail = ref('user@example.com')

const saveSettings = () => {
  // 这里可以保存设置到服务器
  ElMessage.success('设置保存成功')
  console.log('保存设置:', {
    monitoringFrequency: monitoringFrequency.value,
    timeout: timeout.value,
    retryCount: retryCount.value,
    emailNotification: emailNotification.value,
    emailServer: emailServer.value,
    emailPort: emailPort.value,
    senderEmail: senderEmail.value,
    receiverEmail: receiverEmail.value
  })
}

const resetSettings = () => {
  monitoringFrequency.value = '10m'
  timeout.value = 5000
  retryCount.value = 3
  emailNotification.value = true
  emailServer.value = 'smtp.example.com'
  emailPort.value = 587
  senderEmail.value = 'admin@example.com'
  receiverEmail.value = 'user@example.com'
  ElMessage.info('设置已重置')
}

onMounted(() => {
  // 这里可以从服务器加载设置
  console.log('Settings mounted')
})
</script>

<style scoped>
.settings {
  height: 100%;
}

.settings h2 {
  margin-bottom: 20px;
  color: #303133;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
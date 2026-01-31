<template>
  <div class="monitor">
    <h2>API监控管理</h2>
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>监控API列表</span>
          <el-button type="primary" size="small">
            <el-icon><plus /></el-icon>
            添加API
          </el-button>
        </div>
      </template>
      <el-table :data="apiList" stripe style="width: 100%">
        <el-table-column prop="name" label="API名称" width="200" />
        <el-table-column prop="url" label="API地址" show-overflow-tooltip />
        <el-table-column prop="method" label="请求方法" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'up' ? 'success' : 'danger'">
              {{ scope.row.status === 'up' ? '正常' : '异常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="responseTime" label="响应时间(ms)" width="120" />
        <el-table-column prop="lastChecked" label="最后检查" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="viewDetails(scope.row)">
              查看
            </el-button>
            <el-button size="small" type="danger" @click="deleteApi(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="100"
          :page-size="10"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElLoading } from 'element-plus'

const apiList = ref([])
const loading = ref(false)

const viewDetails = (row) => {
  ElMessage(`查看API: ${row.name}`)
}

const deleteApi = (row) => {
  ElMessage(`删除API: ${row.name}`)
}

// 从服务器获取API配置
const fetchApiConfig = async () => {
  loading.value = true
  try {
    const response = await fetch('/api/config')
    if (!response.ok) {
      throw new Error('网络请求失败')
    }
    const data = await response.json()
    
    // 处理返回的数据，添加一些表格需要的字段
    if (data.apis && Array.isArray(data.apis)) {
      apiList.value = data.apis.map((api, index) => ({
        id: index + 1,
        name: api.name,
        url: api.url,
        method: api.method || 'GET',
        status: 'up', // 默认设置为正常状态，实际应该从监控数据中获取
        responseTime: 0, // 默认响应时间
        lastChecked: '未检查' // 默认最后检查时间
      }))
    }
  } catch (error) {
    ElMessage.error(`获取API配置失败: ${error.message}`)
    console.error('获取API配置失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchApiConfig()
})
</script>

<style scoped>
.monitor {
  height: 100%;
}

.monitor h2 {
  margin-bottom: 20px;
  color: #303133;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
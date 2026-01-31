<template>
  <div class="stock-list">
    <h2>股票列表</h2>
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>股票数据</span>
          <div class="header-actions">
            <el-date-picker
              v-model="selectedDate"
              type="date"
              placeholder="选择日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              size="small"
              style="width: 160px; margin-right: 10px;"
            />
            <el-input
              v-model="searchQuery"
              placeholder="搜索股票代码或名称"
              clearable
              size="small"
              style="width: 200px; margin-right: 10px;"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" size="small" @click="handleSearch">
              搜索
            </el-button>
            <el-button type="success" size="small" @click="triggerMonitor" :loading="isRefreshing">
              <el-icon v-if="!isRefreshing"><Refresh /></el-icon>
              {{ isRefreshing ? '刷新中...' : '刷新数据' }}
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="tableData" stripe style="width: 100%">
        <el-table-column prop="code" label="股票代码" width="120" />
        <el-table-column prop="name" label="股票名称" width="150" />
        <el-table-column prop="price" label="当前价格" width="120">
          <template #default="scope">
            <span :class="scope.row.change >= 0 ? 'price-up' : 'price-down'">
              ¥{{ scope.row.price.toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="change" label="涨跌额" width="100">
          <template #default="scope">
            <span :class="scope.row.change >= 0 ? 'change-up' : 'change-down'">
              {{ scope.row.change >= 0 ? '+' : '' }}{{ scope.row.change.toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="changePercent" label="涨跌幅" width="100">
          <template #default="scope">
            <span :class="scope.row.changePercent >= 0 ? 'change-up' : 'change-down'">
              {{ scope.row.changePercent >= 0 ? '+' : '' }}{{ scope.row.changePercent.toFixed(2) }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="volume" label="成交量(手)" width="150" />
        <el-table-column prop="turnover" label="成交额(万元)" width="150" />
        <el-table-column prop="date" label="更新时间" width="180" />
      </el-table>
      
      <div class="pagination">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElLoading } from 'element-plus'

// 分页参数
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchQuery = ref('')
const selectedDate = ref('')

// 表格数据
const tableData = ref([])
const loading = ref(false)
const isRefreshing = ref(false)

// 获取股票数据
const getStockData = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      pageSize: pageSize.value,
      search: searchQuery.value
    })
    
    // 添加日期参数（如果有选择）
    if (selectedDate.value) {
      params.append('date', selectedDate.value)
    }
    
    const response = await fetch(`/api/stock-data?${params}`)
    if (!response.ok) {
      throw new Error('网络请求失败')
    }
    
    const result = await response.json()
    tableData.value = result.data || []
    total.value = result.total || 0
    
    // 如果数据为空，提示用户
    if (total.value === 0) {
      ElMessage.info('暂无股票数据')
    }
  } catch (error) {
    ElMessage.error(`获取股票数据失败: ${error.message}`)
    console.error('获取股票数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
  getStockData()
}

// 分页大小变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  getStockData()
}

// 当前页码变化
const handleCurrentChange = (page) => {
  currentPage.value = page
  getStockData()
}

// 触发数据监控接口
const triggerMonitor = async () => {
  isRefreshing.value = true
  try {
    const response = await fetch('/api/trigger-monitor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'EastmoneyStockData' })
    })
    
    if (!response.ok) {
      throw new Error('网络请求失败')
    }
    
    const result = await response.json()
    
    if (result.success) {
      ElMessage.success('数据刷新任务已启动，正在获取最新股票数据...')
      // 等待几秒钟后刷新表格数据
      setTimeout(() => {
        getStockData()
      }, 3000)
    } else {
      ElMessage.error(`数据刷新失败: ${result.message}`)
    }
  } catch (error) {
    ElMessage.error(`触发数据刷新失败: ${error.message}`)
    console.error('触发数据刷新失败:', error)
  } finally {
    isRefreshing.value = false
  }
}

onMounted(() => {
  getStockData()
})
</script>

<style scoped>
.stock-list {
  height: 100%;
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
  overflow: auto;
}

.stock-list h2 {
  margin-bottom: 20px;
  color: #303133;
}

:deep(.el-card) {
  width: 100%;
  box-sizing: border-box;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.price-up, .change-up {
  color: #f56c6c;
}

.price-down, .change-down {
  color: #67c23a;
}
</style>
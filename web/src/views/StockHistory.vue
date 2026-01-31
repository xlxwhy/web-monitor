<template>
  <div class="stock-history">
    <h2>股票历史数据</h2>
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>股票历史</span>
          <div class="header-actions">
            <el-input
              v-model="stockCode"
              placeholder="输入股票编号"
              clearable
              size="small"
              style="width: 200px; margin-right: 10px;"
              @keyup.enter="getStockHistory"
            >
              <template #prefix>
                <el-icon><search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" size="small" @click="getStockHistory" :loading="isLoading">
              查询
            </el-button>
          </div>
        </div>
      </template>
      <div v-if="!isLoading && stockData.length > 0" class="chart-container">
        <h3>{{ stockName }} ({{ stockCode }}) 历史价格走势</h3>
        <div id="priceChart" style="height: 400px;"></div>
      </div>
      <el-table v-if="!isLoading && stockData.length > 0" :data="tableData" stripe style="width: 100%; margin-top: 20px;">
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="price" label="价格" width="100">
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
      </el-table>
      <div v-if="!isLoading && stockData.length === 0" class="empty-data">
        <el-empty description="暂无历史数据" />
      </div>
      
      <div class="pagination" v-if="!isLoading && stockData.length > 0">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="stockData.length"
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
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElLoading } from 'element-plus'
import * as echarts from 'echarts'

// 股票编号
const stockCode = ref('')
// 股票名称
const stockName = ref('')
// 历史数据
const stockData = ref([])
// 表格数据
const tableData = ref([])
// 加载状态
const isLoading = ref(false)
// 分页参数
const currentPage = ref(1)
const pageSize = ref(10)
// 图表实例
let chartInstance = null

// CSV解析函数
const parseCSV = (csvText) => {
  const lines = csvText.split('\n')
  const headers = lines[0].split(',')
  const data = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const values = line.split(',')
    if (values.length !== headers.length) continue
    
    const row = {}
    headers.forEach((header, index) => {
      row[header.trim()] = values[index].trim()
    })
    
    // 转换数据类型
    row.price = parseFloat(row.f43) || 0
    row.change = parseFloat(row.f44) || 0
    row.changePercent = parseFloat(row.f45) || 0
    row.volume = parseInt(row.f46) || 0
    row.turnover = parseFloat(row.f47) || 0
    
    // 处理不同文件的字段名差异
    row.code = row.f57 || row.f12 || ''
    row.name = row.f58 || row.f14 || ''
    row.date = row.date || ''
    
    // 将日期格式从YYYYMMDD转换为YYYY-MM-DD
    if (row.date && row.date.length === 8) {
      row.date = `${row.date.substring(0, 4)}-${row.date.substring(4, 6)}-${row.date.substring(6, 8)}`
    }
    
    data.push(row)
  }
  
  // 按日期排序（最新的在前面）
  data.sort((a, b) => new Date(b.date) - new Date(a.date))
  
  return data
}

// 获取股票历史数据
const getStockHistory = async () => {
  if (!stockCode.value.trim()) {
    ElMessage.warning('请输入股票编号')
    return
  }
  
  isLoading.value = true
  try {
    const code = stockCode.value.trim()
    const filePath = `/data/stock/${code}.csv`
    
    // 直接从public目录读取CSV文件
    const response = await fetch(filePath)
    if (!response.ok) {
      throw new Error('未找到该股票的历史数据文件')
    }
    
    const csvText = await response.text()
    stockData.value = parseCSV(csvText)
    
    // 如果有数据，获取股票名称
    if (stockData.value.length > 0) {
      stockName.value = stockData.value[0].name
    }
    
    // 初始化表格数据
    currentPage.value = 1
    updateTableData()
    
    // 渲染图表
    renderChart()
  } catch (error) {
    ElMessage.error(`获取历史数据失败: ${error.message}`)
    console.error('获取历史数据失败:', error)
    stockData.value = []
    stockName.value = ''
  } finally {
    isLoading.value = false
  }
}

// 更新表格数据
const updateTableData = () => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  const endIndex = startIndex + pageSize.value
  tableData.value = stockData.value.slice(startIndex, endIndex)
}

// 分页大小变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  updateTableData()
}

// 当前页码变化
const handleCurrentChange = (page) => {
  currentPage.value = page
  updateTableData()
}

// 渲染图表
const renderChart = () => {
  // 销毁旧图表
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  // 创建新图表
  const chartDom = document.getElementById('priceChart')
  if (!chartDom) return
  
  chartInstance = echarts.init(chartDom)
  
  // 准备图表数据
  const dates = stockData.value.map(item => item.date)
  const prices = stockData.value.map(item => item.price)
  const changes = stockData.value.map(item => item.change)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        const date = params[0].axisValue
        const price = params[0].data
        const change = changes[params[0].dataIndex]
        const changePercent = stockData.value[params[0].dataIndex].changePercent
        
        return `${date}<br/>价格: ¥${price.toFixed(2)}<br/>涨跌额: ${change >= 0 ? '+' : ''}${change.toFixed(2)}<br/>涨跌幅: ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`
      }
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: prices,
      type: 'line',
      smooth: true,
      lineStyle: {
        color: '#409EFF'
      },
      itemStyle: {
        color: '#409EFF'
      }
    }]
  }
  
  chartInstance.setOption(option)
}

// 监听窗口大小变化，重绘图表
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
  }
})
</script>

<style scoped>
.stock-history {
  height: 100%;
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
  overflow: auto;
}

.stock-history h2 {
  margin-bottom: 20px;
  color: #303133;
}

.stock-history h3 {
  margin-bottom: 10px;
  color: #606266;
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

.chart-container {
  margin-bottom: 20px;
}

.empty-data {
  padding: 50px 0;
  text-align: center;
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
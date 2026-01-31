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
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="viewHistory(scope.row)">
              历史数据
            </el-button>
          </template>
        </el-table-column>
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
import { useRouter } from 'vue-router'

// 分页参数
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchQuery = ref('')
// 暂时硬编码默认日期为2026-02-01，用于测试
const selectedDate = ref('2026-02-01')

// 表格数据
const tableData = ref([])
const loading = ref(false)
const isRefreshing = ref(false)
// 路由对象
const router = useRouter()

// CSV解析函数
const parseCSV = (csvText) => {
  // 处理被错误换行的CSV数据
  const lines = [];
  const headerLine = csvText.split('\n')[0].trim();
  const headers = headerLine.split(',');
  const expectedFields = headers.length;
  
  let currentLine = '';
  const allLines = csvText.split('\n');
  
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i].trim();
    if (!line) continue;
    
    if (currentLine) {
      // 合并行
      currentLine += line;
    } else {
      // 新行
      currentLine = line;
    }
    
    // 检查当前行是否以逗号结尾（表示被换行拆分）
    if (!currentLine.endsWith(',')) {
      // 不以逗号结尾，认为是完整行
      lines.push(currentLine);
      currentLine = '';
    }
  }
  
  // 如果还有未处理完的行，也添加进去
  if (currentLine) {
    lines.push(currentLine);
  }
  
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',');
    
    // 确保有足够的字段
    if (values.length < expectedFields) {
      console.warn(`行 ${i} 字段数不足: 预期 ${expectedFields}, 实际 ${values.length}`);
      continue;
    }
    
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : '';
    });
    
    // 转换数据类型
    row.price = parseFloat(row.f2) || parseFloat(row.f43) || 0;
    row.change = parseFloat(row.f1) || parseFloat(row.f44) || 0;
    row.changePercent = parseFloat(row.f3) || parseFloat(row.f45) || 0;
    row.volume = parseInt(row.f5) || parseInt(row.f46) || 0;
    row.turnover = parseFloat(row.f6) || parseFloat(row.f47) || 0;
    
    // 处理不同文件的字段名差异
    row.code = row.f12 || row.f57 || '';
    row.name = row.f14 || row.f58 || '';
    row.date = row.date || new Date().toISOString().split('T')[0];
    
    // 将日期格式从YYYYMMDD转换为YYYY-MM-DD
    if (row.date && row.date.length === 8) {
      row.date = `${row.date.substring(0, 4)}-${row.date.substring(4, 6)}-${row.date.substring(6, 8)}`;
    }
    
    data.push(row);
  }
  
  return data;
}

// 查看历史数据
const viewHistory = (row) => {
  router.push({
    name: 'StockHistory',
    query: { code: row.code }
  })
}

// 获取股票数据
const getStockData = async () => {
  loading.value = true
  try {
    // 构建文件名
    // 获取中国时区的当天日期，用于默认日期或文件不存在时的fallback
    const getChinaToday = () => {
      return new Date().toLocaleDateString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-')
    }
    
    const date = selectedDate.value || getChinaToday()
    console.log('当前日期:', date)
    const fileName = `EastmoneyStockData_${date}.csv`
    const filePath = `/data/daily/${fileName}`
    console.log('尝试加载的文件路径:', filePath)
    
    // 直接从public目录读取CSV文件
    const response = await fetch(filePath)
    if (!response.ok) {
      // 如果指定日期的文件不存在，尝试获取最新的文件
      const latestResponse = await fetch(`/data/daily/EastmoneyStockData_${getChinaToday()}.csv`)
      if (!latestResponse.ok) {
        throw new Error('未找到股票数据文件')
      }
      
      const csvText = await latestResponse.text()
      const allData = parseCSV(csvText)
      tableData.value = allData
      total.value = allData.length
      return
    }
    
    const csvText = await response.text()
    console.log('CSV文件大小:', csvText.length, '字符')
    console.log('原始行数:', csvText.split('\n').length)
    let allData = parseCSV(csvText)
    console.log('解析后的数据行数:', allData.length)
    
    // 应用搜索过滤
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      allData = allData.filter(row => 
        row.code.toLowerCase().includes(query) || 
        row.name.toLowerCase().includes(query)
      )
    }
    
    // 应用分页
    total.value = allData.length
    const startIndex = (currentPage.value - 1) * pageSize.value
    const endIndex = startIndex + pageSize.value
    tableData.value = allData.slice(startIndex, endIndex)
    
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
      body: JSON.stringify({ apiName: 'EastmoneyStockData' })
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
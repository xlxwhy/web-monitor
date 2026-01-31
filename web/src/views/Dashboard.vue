<template>
  <div class="dashboard">
    <h2>系统仪表盘</h2>
    <div class="dashboard-stats">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-content">
          <div class="stat-number">8</div>
          <div class="stat-label">监控API数量</div>
        </div>
        <div class="stat-icon">
          <el-icon class="el-icon-data-line" />
        </div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-content">
          <div class="stat-number">100%</div>
          <div class="stat-label">API可用率</div>
        </div>
        <div class="stat-icon">
          <el-icon class="el-icon-check" />
        </div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-content">
          <div class="stat-number">24h</div>
          <div class="stat-label">监控时长</div>
        </div>
        <div class="stat-icon">
          <el-icon class="el-icon-time" />
        </div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <div class="stat-content">
          <div class="stat-number">500K</div>
          <div class="stat-label">总请求数</div>
        </div>
        <div class="stat-icon">
          <el-icon class="el-icon-s-data" />
        </div>
      </el-card>
    </div>
    
    <div class="dashboard-charts">
      <el-card shadow="hover" class="chart-card">
        <template #header>
          <div class="card-header">
            <span>API响应时间趋势</span>
          </div>
        </template>
        <div class="chart-placeholder">
          <el-icon class="el-icon-loading" style="font-size: 48px; color: #909399;"></el-icon>
          <p>图表加载中...</p>
        </div>
      </el-card>
      <el-card shadow="hover" class="chart-card">
        <template #header>
          <div class="card-header">
            <span>API状态分布</span>
          </div>
        </template>
        <div class="chart-placeholder">
          <el-icon class="el-icon-loading" style="font-size: 48px; color: #909399;"></el-icon>
          <p>图表加载中...</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // 这里可以添加图表初始化代码
  console.log('Dashboard mounted')
})
</script>

<style scoped>
.dashboard {
  height: 100%;
}

.dashboard h2 {
  margin-bottom: 20px;
  color: #303133;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.stat-icon {
  font-size: 48px;
  color: #409eff;
}

.dashboard-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.chart-card {
  height: 300px;
}

.chart-placeholder {
  height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
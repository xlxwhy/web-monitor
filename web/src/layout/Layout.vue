<template>
  <div class="admin-container">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="logo">
        <h1>Web Monitor</h1>
      </div>
      <el-menu
        default-active="/dashboard"
        class="el-menu-vertical-demo"
        background-color="#545c64"
        text-color="#fff"
        active-text-color="#ffd04b"
        router
      >
        <el-menu-item v-for="route in routes" :key="route.path" :index="route.path">
          <component :is="route.meta.icon" />
          <span>{{ route.meta.title }}</span>
        </el-menu-item>
      </el-menu>
    </aside>
    
    <!-- 主内容区域 -->
    <main class="main-content">
      <!-- 顶部导航 -->
      <header class="header">
        <div class="user-info">
          <el-dropdown>
            <span class="el-dropdown-link">
              管理员 <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人中心</el-dropdown-item>
                <el-dropdown-item>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>
      
      <!-- 内容区 -->
      <section class="content">
        <router-view />
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowDown } from '@element-plus/icons-vue'

const route = useRoute()
const routes = ref([])

onMounted(() => {
  // 获取路由配置
  const matched = route.matched[0]
  if (matched && matched.children) {
    routes.value = matched.children
  }
})
</script>

<style scoped>
.admin-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 200px;
  background-color: #545c64;
  color: #fff;
  height: 100%;
  overflow-y: auto;
}

.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #6c757d;
}

.logo h1 {
  margin: 0;
  font-size: 18px;
  color: #fff;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f5f7fa;
}

.header {
  height: 60px;
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
}

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
</style>
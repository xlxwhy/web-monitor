import { createRouter, createWebHashHistory } from 'vue-router'
import Layout from '../layout/Layout.vue'
import Dashboard from '../views/Dashboard.vue'
import ApiList from '../views/ApiList.vue'
import Settings from '../views/Settings.vue'
import StockList from '../views/StockList.vue'
import StockHistory from '../views/StockHistory.vue'

const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: { title: '仪表盘', icon: 'el-icon-s-home' }
      },
      {
        path: 'api-list',
        name: 'ApiList',
        component: ApiList,
        meta: { title: 'API列表', icon: 'el-icon-video-camera' }
      },
      {
        path: 'stock-list',
        name: 'StockList',
        component: StockList,
        meta: { title: '股票列表', icon: 'el-icon-s-data' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: Settings,
        meta: { title: '系统设置', icon: 'el-icon-setting' }
      },
      {
        path: 'stock-history',
        name: 'StockHistory',
        component: StockHistory,
        meta: { title: '股票历史', icon: 'el-icon-time' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
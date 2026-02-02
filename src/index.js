const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 导入EastMoney工具
const EastMoney = require('./api/EastMoney.js');

// 导入监控工具模块
const monitorUtils = require('./utils/monitor');
const { log, monitorApi, saveMonitorData } = monitorUtils;

// 导入路由模块
const stockRoutes = require('./routes/StockRoutes');
const monitorRoutes = require('./routes/MonitorRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 配置JSON解析中间件
app.use(express.json());

// 加载配置文件
const config = require(path.join(__dirname, '../config/apis.json'));

// 创建日志目录
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// 数据目录
const dataDir = path.join(__dirname, '../../web/public/data/daily');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 使用监控工具模块中的日志函数

// 设置静态文件目录为Vue项目的dist文件夹
// 正确路径：从src目录向上一层到web-monitor目录，然后加上/web/dist
const staticDir = path.join(__dirname, '../web/dist');
// 先确保能直接访问静态资源
app.use(express.static(staticDir));
// 再添加/web-monitor/前缀映射
app.use('/web-monitor', express.static(staticDir));
log(`静态文件目录已设置为: ${staticDir}`);
log('静态文件访问路径前缀: /web-monitor');

// 添加public目录的静态文件映射，用于访问数据文件
const publicDir = path.join(__dirname, '../web/public');
app.use('/data', express.static(path.join(publicDir, 'data')));
log(`数据文件目录已设置为: ${path.join(publicDir, 'data')}`);
log('数据文件访问路径前缀: /data')

// 使用监控工具模块中的数据存储函数



// 使用监控工具模块中的接口监控函数

// 使用监控工具模块中的页面数据获取函数

// 启动所有监控任务
function startMonitoring() {
    config.apis.forEach(api => {
        cron.schedule(api.cron, () => {
            monitorApi(api);
        }, {
            scheduled: true,
            timezone: 'Asia/Shanghai'
        });
        log(`已启动API ${api.name} 的监控任务，调度规则: ${api.cron}`);
    });
}

// 健康检查接口
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        monitoredApis: config.apis.map(api => api.name)
    });
});

// 使用路由模块
app.use('/api', stockRoutes);
app.use('/api', monitorRoutes);
app.use('/monitor-data', monitorRoutes);

// 配置回退路由，处理Vue Router history模式下的页面刷新
app.get(/^\/web-monitor\/.*/, (req, res) => {
    // 确保只处理前端路由，不影响静态文件和已定义的API
    res.sendFile(path.join(staticDir, 'index.html'));
});
log('已配置回退路由，支持Vue Router history模式');

// 启动服务器的主函数
async function startServer() {
    try {
        // 初始化EastMoney工具，获取并保存Cookie和UserAgent
await EastMoney.init();
        
        // 启动服务器
        app.listen(PORT, () => {
            log(`Web Monitor 服务器启动在 http://localhost:${PORT}`);
            log(`健康检查接口: http://localhost:${PORT}/health`);
            log(`监控数据接口: http://localhost:${PORT}/monitor-data`);
            
            // 启动监控任务
            startMonitoring();
            
            // // 服务器启动后立即执行一次所有API的监控
            // log('服务器启动后立即执行一次所有API监控...');
            // config.apis.forEach(api => {
            //     monitorApi(api);
            // });
        });
    } catch (error) {
        log(`服务器启动失败: ${error.message}`);
        process.exit(1);
    }
}

// 调用启动函数
startServer();
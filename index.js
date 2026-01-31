const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 加载配置文件
const config = require('./config/config.json');

// 创建日志目录
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// 日志记录函数
function log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(path.join(logsDir, 'monitor.log'), logMessage);
}

// 监控数据存储函数
function saveMonitorData(data) {
    const timestamp = new Date().toISOString().split('T')[0];
    const dataFile = path.join(logsDir, `monitor_data_${timestamp}.json`);
    
    let existingData = [];
    if (fs.existsSync(dataFile)) {
        const fileContent = fs.readFileSync(dataFile, 'utf8');
        if (fileContent) {
            existingData = JSON.parse(fileContent);
        }
    }
    
    existingData.push(data);
    fs.writeFileSync(dataFile, JSON.stringify(existingData, null, 2));
}

// 监控单个接口
async function monitorApi(apiConfig) {
    try {
        // 复制原始配置，避免修改原始对象
        const originalConfig = JSON.parse(JSON.stringify(apiConfig));
        
        const startTime = Date.now();
        const response = await axios({
            url: apiConfig.url,
            method: apiConfig.method || 'GET',
            headers: apiConfig.headers || {},
            params: apiConfig.params || {},
            data: apiConfig.data || {},
            timeout: apiConfig.timeout || 5000,
            responseType: 'text' // 先以文本形式获取响应，以便处理JSONP
        });
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        let responseData = response.data;
        let isJsonp = false;
        
        // 检查并处理JSONP响应
        if (typeof responseData === 'string' && responseData.trim().startsWith('jQuery')) {
            isJsonp = true;
            try {
                // 提取JSONP中的实际JSON数据
                const match = responseData.match(/^[^\(]+\((.*)\)$/);
                if (match && match[1]) {
                    responseData = JSON.parse(match[1]);
                }
            } catch (parseError) {
                log(`API ${apiConfig.name} JSONP解析失败: ${parseError.message}`, 'error');
            }
        } else if (typeof responseData === 'string') {
            // 尝试解析为标准JSON
            try {
                responseData = JSON.parse(responseData);
            } catch (parseError) {
                // 如果不是JSON，保持原样
            }
        }
        
        const monitorData = {
            timestamp: new Date().toISOString(),
            api: apiConfig.name,
            url: apiConfig.url,
            status: 'success',
            statusCode: response.status,
            responseTime: responseTime,
            responseSize: JSON.stringify(responseData).length,
            isJsonp: isJsonp,
            page: apiConfig.params?.pn || 1
        };
        
        log(`API ${apiConfig.name} 第${monitorData.page}页监控成功 - 响应时间: ${responseTime}ms - 状态码: ${response.status}${isJsonp ? ' (JSONP)' : ''}`);
        saveMonitorData(monitorData);
        
        // 检查是否需要分页查询（仅针对东方财富股票数据接口）
        if (apiConfig.name === '东方财富股票数据') {
            // 简单测试策略：只测试2页
            const totalPagesToTest = 2;
            const currentPage = parseInt(apiConfig.params?.pn || '1');
            
            log(`东方财富股票数据接口 - 当前页: ${currentPage}, 计划测试总页数: ${totalPagesToTest}`);
            
            // 如果有更多页需要测试
            if (currentPage < totalPagesToTest) {
                log(`东方财富股票数据接口 - 准备查询第${currentPage + 1}页（测试模式）`);
                
                // 等待一段时间再查询下一页，避免接口限流
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // 创建新的API配置，修改页码参数
                const nextPageConfig = JSON.parse(JSON.stringify(apiConfig));
                nextPageConfig.params = { ...nextPageConfig.params, pn: currentPage + 1 };
                
                // 查询下一页
                await monitorApi(nextPageConfig);
            } else if (currentPage === 1) {
                // 如果是第一页，直接查询第二页
                log(`东方财富股票数据接口 - 准备查询第2页（测试模式）`);
                
                // 等待一段时间再查询下一页，避免接口限流
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // 创建新的API配置，修改页码参数
                const nextPageConfig = JSON.parse(JSON.stringify(apiConfig));
                nextPageConfig.params = { ...nextPageConfig.params, pn: 2 };
                
                // 查询下一页
                await monitorApi(nextPageConfig);
            }
        }
        
        return monitorData;
    } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime || 0;
        
        const monitorData = {
            timestamp: new Date().toISOString(),
            api: apiConfig.name,
            url: apiConfig.url,
            status: 'error',
            error: error.message,
            statusCode: error.response?.status || null,
            responseTime: responseTime,
            page: apiConfig.params?.pn || 1
        };
        
        log(`API ${apiConfig.name} 第${monitorData.page}页监控失败 - 错误: ${error.message}`, 'error');
        saveMonitorData(monitorData);
        
        return monitorData;
    }
}

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

// 获取监控数据接口
app.get('/monitor-data', (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const dataFile = path.join(logsDir, `monitor_data_${date}.json`);
    
    if (fs.existsSync(dataFile)) {
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        res.json(data);
    } else {
        res.status(404).json({ error: 'No data found for the specified date' });
    }
});

// 启动服务器
app.listen(PORT, () => {
    log(`Web Monitor 服务器启动在 http://localhost:${PORT}`);
    log(`健康检查接口: http://localhost:${PORT}/health`);
    log(`监控数据接口: http://localhost:${PORT}/monitor-data`);
    
    // 启动监控任务
    startMonitoring();
    
    // 服务器启动后立即执行一次所有API的监控
    log('服务器启动后立即执行一次所有API监控...');
    config.apis.forEach(api => {
        monitorApi(api);
    });
});
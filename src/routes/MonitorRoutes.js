const express = require('express');
const fs = require('fs');
const path = require('path');
const { log, monitorApi } = require('../utils/monitor');

const router = express.Router();

// 加载配置文件
const config = require('../../config/apis.json');
// 数据目录
const dataDir = path.join(__dirname, '../../../web/public/data/daily');

// 获取apis.json配置的接口
router.get('/config', (req, res) => {
    res.json(config);
});

// 获取监控数据接口
router.get('/data', (req, res) => {
    const apiName = req.query.api;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    if (!apiName) {
        res.status(400).json({ error: 'API name is required' });
        return;
    }
    
    // 从data文件夹中读取接口数据，支持按日期查询
    const dataFile = path.join(dataDir, `${apiName}_${date}.json`);
    
    if (fs.existsSync(dataFile)) {
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        res.json(data);
    } else {
        res.status(404).json({ error: `No data found for API: ${apiName} on date: ${date}` });
    }
});

// 手动触发监控任务的接口
router.post('/trigger-monitor', async (req, res) => {
    try {
        log('接收到手动触发监控任务的请求');
        
        // 获取要监控的API名称，如果没有指定则监控所有API
        const { apiName } = req.body;
        
        if (apiName) {
            // 只监控指定的API
            const apiConfig = config.apis.find(api => api.name === apiName);
            if (!apiConfig) {
                return res.status(404).json({ error: `未找到API配置: ${apiName}` });
            }
            
            log(`开始手动监控API: ${apiName}`);
            await monitorApi(apiConfig);
            log(`API ${apiName} 手动监控完成`);
            
            return res.json({ success: true, message: `API ${apiName} 监控任务已触发` });
        } else {
            // 监控所有API
            log('开始手动监控所有API');
            const results = [];
            
            for (const apiConfig of config.apis) {
                try {
                    await monitorApi(apiConfig);
                    results.push({ api: apiConfig.name, status: 'success' });
                    log(`API ${apiConfig.name} 手动监控完成`);
                } catch (error) {
                    results.push({ api: apiConfig.name, status: 'error', error: error.message });
                    log(`API ${apiConfig.name} 手动监控失败: ${error.message}`, 'error');
                }
            }
            
            return res.json({ success: true, message: '所有API监控任务已触发', results });
        }
    } catch (error) {
        log(`手动触发监控任务失败: ${error.message}`, 'error');
        res.status(500).json({ error: `触发监控任务失败: ${error.message}` });
    }
});

module.exports = router;
const fs = require('fs');
const path = require('path');

// 导入监控工具模块
const monitorUtils = require('./utils/monitor');
const { log, monitorApi } = monitorUtils;

// 加载配置文件
const config = require('../config/apis.json');

// 主函数
async function main() {
    log('开始执行监控任务...');
    
    try {
        // 监控所有API
        const results = [];
        
        for (const apiConfig of config.apis) {
            try {
                await monitorApi(apiConfig);
                results.push({ api: apiConfig.name, status: 'success' });
                log(`API ${apiConfig.name} 监控完成`);
            } catch (error) {
                results.push({ api: apiConfig.name, status: 'error', error: error.message });
                log(`API ${apiConfig.name} 监控失败: ${error.message}`, 'error');
            }
        }
        
        log('所有API监控任务已完成');
        log(JSON.stringify(results, null, 2));
        
        // 检查是否有成功的监控结果
        const successCount = results.filter(r => r.status === 'success').length;
        if (successCount === 0) {
            log('所有API监控任务都失败了', 'error');
            process.exit(1);
        }
        
        log('监控任务执行成功');
        process.exit(0);
    } catch (error) {
        log(`监控任务执行失败: ${error.message}`, 'error');
        process.exit(1);
    }
}

// 执行主函数
main();
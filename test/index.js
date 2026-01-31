// 测试主文件 - 集中管理所有测试逻辑

// 东方财富股票数据接口分页测试函数
async function testEastMoneyPagination(apiConfig, monitorApi, log) {
    try {
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
    } catch (error) {
        log(`东方财富股票数据接口测试失败 - 错误: ${error.message}`, 'error');
    }
}

// 导出所有测试函数
module.exports = {
    testEastMoneyPagination
};

// 单独运行测试的功能
if (require.main === module) {
    // 引入所需依赖
    const axios = require('axios');
    const path = require('path');
    const fs = require('fs');
    
    // 创建日志目录
    const logsDir = path.join(__dirname, '../logs');
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
        // 使用API名称作为文件名的一部分
        const apiName = data.api;
        const dataFile = path.join(logsDir, `monitor_data_${apiName}.json`);
        
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
    
    // 监控单个接口的本地实现
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
            if (apiConfig.name === 'EastmoneyStockData') {
                await testEastMoneyPagination(apiConfig, monitorApi, log);
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
    
    // 从配置文件获取API配置
    const config = require('../config/apis.json');
    const eastmoneyApiConfig = config.apis.find(api => api.name === 'EastmoneyStockData');
    
    if (eastmoneyApiConfig) {
        log('开始单独运行东方财富股票数据接口测试...');
        // 重置页码为1，确保从第一页开始测试
        eastmoneyApiConfig.params = { ...eastmoneyApiConfig.params, pn: 1 };
        monitorApi(eastmoneyApiConfig)
            .then(() => {
                log('测试完成！');
                process.exit(0);
            })
            .catch(error => {
                log(`测试运行失败: ${error.message}`, 'error');
                process.exit(1);
            });
    } else {
        log('未找到东方财富股票数据接口配置', 'error');
        process.exit(1);
    }
}
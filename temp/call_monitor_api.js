const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 日志记录函数
function log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logMessage);
}

// 加载配置文件
const config = require('../config/apis.json');

// 获取EastmoneyStockData API配置
const stockApiConfig = config.apis.find(api => api.name === 'EastmoneyStockData');

if (!stockApiConfig) {
    console.error('未找到EastmoneyStockData API配置');
    process.exit(1);
}

// 获取单个页面数据
async function fetchSinglePage(apiConfig, pageNum) {
    try {
        // 复制配置
        const pageConfig = JSON.parse(JSON.stringify(apiConfig));
        
        // 设置页码
        if (pageConfig.params) {
            pageConfig.params.pn = pageNum;
        }
        
        // 发送请求
        const response = await axios({
            url: pageConfig.url,
            method: pageConfig.method || 'GET',
            headers: pageConfig.headers,
            params: pageConfig.params,
            data: pageConfig.data,
            timeout: pageConfig.timeout || 15000
        });
        
        // 解析jQuery回调格式的响应
        let data = response.data;
        if (typeof data === 'string' && data.startsWith('jQuery')) {
            const startIndex = data.indexOf('(');
            const endIndex = data.lastIndexOf(')');
            if (startIndex !== -1 && endIndex !== -1) {
                data = JSON.parse(data.substring(startIndex + 1, endIndex));
            }
        }
        
        return {
            api: apiConfig.name,
            page: pageNum,
            status: 'success',
            data: data,
            pagination: {
                total: data.data.total,
                pageSize: pageConfig.params?.pz || 20
            }
        };
    } catch (error) {
        log(`获取第${pageNum}页数据失败: ${error.message}`, 'error');
        return {
            api: apiConfig.name,
            page: pageNum,
            status: 'error',
            error: error.message
        };
    }
}

// 保存监控数据
function saveMonitorData(monitorData, date = null) {
    if (!monitorData || !monitorData.data || !monitorData.data.data || !monitorData.data.data.diff) {
        return;
    }
    
    const apiName = monitorData.api;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const dateYYYYMMDD = targetDate.replace(/-/g, '');
    const dataDir = path.join(__dirname, '../data/daily');
    const stockDir = path.join(__dirname, '../data/stock');
    const dataFile = path.join(dataDir, `${apiName}_${targetDate}.csv`);
    
    const diffData = monitorData.data.data.diff;
    
    if (diffData.length === 0) {
        log(`API ${apiName} 第${monitorData.page}页没有提取到diff数据`);
        return;
    }
    
    // 将JSON数据转换为CSV格式
    let csvContent = '';
    const allHeaders = Object.keys(diffData[0]);
    const headers = ['date', 'f12', 'f14', ...allHeaders.filter(h => h !== 'f12' && h !== 'f14')];
    
    // 检查文件是否存在，如果不存在则创建并写入标题行
    if (!fs.existsSync(dataFile)) {
        csvContent += headers.join(',') + '\n';
    }
    
    // 添加当前页面的数据行
    diffData.forEach(row => {
        const rowWithDate = { ...row, date: dateYYYYMMDD };
        const values = headers.map(header => {
            const value = rowWithDate[header];
            // 如果值包含逗号或双引号，需要用双引号包裹
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
        });
        csvContent += values.join(',') + '\n';
        
        // 同时保存到单个股票文件
        if (rowWithDate.f12) {
            const stockCode = rowWithDate.f12;
            const stockFile = path.join(stockDir, `${stockCode}.csv`);
            
            // 检查股票文件是否存在，如果不存在则创建并写入标题行
            if (!fs.existsSync(stockFile)) {
                fs.appendFileSync(stockFile, headers.join(',') + '\n');
            }
            
            // 将当前行数据追加到股票文件
            fs.appendFileSync(stockFile, values.join(',') + '\n');
        }
    });
    
    // 将当前页面的数据追加到总文件
    fs.appendFileSync(dataFile, csvContent);
    log(`API ${apiName} 第${monitorData.page}页数据已保存到文件: ${dataFile}`);
}

// 监控API
async function monitorApi(apiConfig, date = null) {
    const originalConfig = JSON.parse(JSON.stringify(apiConfig));
    let totalPages = 1;
    const allResults = [];
    
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const apiName = apiConfig.name;
    const dataFile = path.join(__dirname, '../data/daily', `${apiName}_${targetDate}.csv`);
    if (fs.existsSync(dataFile)) {
        fs.unlinkSync(dataFile);
        log(`API ${apiName} 清空旧数据文件: ${dataFile}`);
    }
    
    try {
        // 先获取第一页数据
        log(`开始获取${apiName}第1页数据...`);
        const firstPageResult = await fetchSinglePage(originalConfig, 1);
        allResults.push(firstPageResult);
        
        if (firstPageResult.status === 'success') {
            saveMonitorData(firstPageResult, targetDate);
            
            // 获取总页数信息
            if (firstPageResult.pagination && firstPageResult.pagination.total) {
                const totalCount = parseInt(firstPageResult.pagination.total);
                const pageSize = parseInt(originalConfig.params?.pz || 20);
                totalPages = Math.ceil(totalCount / pageSize);
                
                log(`API ${apiConfig.name} 发现总数据 ${totalCount} 条，共 ${totalPages} 页`);
            }
        }
        
        // 如果有多页数据，获取剩余页面
        if (totalPages > 1) {
            for (let page = 2; page <= totalPages; page++) {
                log(`开始获取${apiName}第${page}页数据...`);
                const pageResult = await fetchSinglePage(originalConfig, page);
                allResults.push(pageResult);
                
                if (pageResult.status === 'success') {
                    saveMonitorData(pageResult, targetDate);
                }
            }
        }
        
        log(`API ${apiConfig.name} 监控完成 - 共处理 ${totalPages} 页数据`);
        return allResults;
    } catch (error) {
        log(`API ${apiConfig.name} 监控失败 - 错误: ${error.message}`, 'error');
        return allResults;
    }
}

// 创建必要的目录
const dataDir = path.join(__dirname, '../data/daily');
const stockDir = path.join(__dirname, '../data/stock');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(stockDir)) {
    fs.mkdirSync(stockDir, { recursive: true });
}

// 调用监控接口
console.log(`开始调用${stockApiConfig.name}监控接口...`);
monitorApi(stockApiConfig)
    .then(results => {
        console.log(`${stockApiConfig.name}监控接口调用完成`);
        console.log(`共处理 ${results.length} 页数据`);
        
        const successPages = results.filter(result => result.status === 'success').length;
        const failedPages = results.filter(result => result.status !== 'success').length;
        
        console.log(`成功: ${successPages} 页, 失败: ${failedPages} 页`);
    })
    .catch(error => {
        console.error(`${stockApiConfig.name}监控接口调用失败: ${error.message}`);
    });


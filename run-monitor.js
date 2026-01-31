const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');

// 加载配置文件
const config = require('./config/apis.json');

// 创建日志目录
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// 数据目录
const dataDir = path.join(__dirname, 'data/daily');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 日志记录函数
function log(message, level = 'info') {
    // 使用中国时区格式化时间
    const timestamp = new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(new Date());
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(path.join(logsDir, 'monitor.log'), logMessage);
}

// 监控数据存储函数 - 只保存diff数据，按CSV格式输出，支持追加模式
function saveMonitorData(monitorData, date = null) {
    if (!monitorData || !monitorData.data || !monitorData.data.data || !monitorData.data.data.diff) {
        return;
    }
    
    // 使用API名称作为文件名的一部分
    const apiName = monitorData.api;
    // 获取指定日期或当前日期（使用中国时区），格式：YYYY-MM-DD
    const targetDate = date || new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date()).replace(/\//g, '-');
    // 获取日期，YYYYMMDD格式
    const dateYYYYMMDD = targetDate.replace(/-/g, '');
    // 将数据保存到data/daily文件夹中，每个接口、每天一个csv文件
    const dataFile = path.join(dataDir, `${apiName}_${targetDate}.csv`);
    // 股票数据存储目录
    const stockDir = path.join(__dirname, 'data/stock');
    
    // 提取当前页面的diff数据
    const diffData = monitorData.data.data.diff;
    
    if (diffData.length === 0) {
        log(`API ${apiName} 第${monitorData.page}页没有提取到diff数据`);
        return;
    }
    
    // 将JSON数据转换为CSV格式
    let csvContent = '';
    // 获取所有字段，并将日期字段排在最前面，然后是股票编号(f12)和股票名称(f14)
    const allHeaders = Object.keys(diffData[0]);
    const headers = ['date', 'f12', 'f14', ...allHeaders.filter(h => h !== 'f12' && h !== 'f14')];
    
    // 检查文件是否存在，如果不存在则创建并写入标题行
    if (!fs.existsSync(dataFile)) {
        csvContent += headers.join(',') + '\n';
    }
    
    // 添加当前页面的数据行
    diffData.forEach(row => {
        // 为当前行添加日期字段
        const rowWithDate = { ...row, date: dateYYYYMMDD };
        
        const values = headers.map(header => {
            const value = rowWithDate[header];
            // 处理包含逗号或引号的值
            if (typeof value === 'string') {
                // 如果值包含引号，需要转义
                if (value.includes('"')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                // 如果值包含逗号，需要用引号包围
                if (value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            }
            return value;
        });
        const rowContent = values.join(',') + '\n';
        csvContent += rowContent;
    });
    
    // 1. 首先追加到每日汇总CSV文件
    fs.appendFileSync(dataFile, csvContent);
    log(`API ${apiName} 第${monitorData.page}页数据追加到CSV文件: ${dataFile}, 新增 ${diffData.length} 条记录`);
    
    // 2. 然后从daily文件中读取最新写入的数据，按股票维度补充到stock目录
    const addedLines = csvContent.trim().split('\n');
    // 移除标题行（如果存在）
    const dataLines = addedLines.filter(line => !line.startsWith('f12,f14,date'));
    
    dataLines.forEach(rowContent => {
        if (!rowContent.trim()) return;
        
        // 解析行数据获取股票编号
        const values = parseCSVLine(rowContent);
        if (values.length < 2) return;
        
        const stockId = values[1]; // 股票编号在第二列（日期在第一列）
        if (stockId) {
            // 移除stock前缀，直接使用股票编号作为文件名
            const stockFile = path.join(stockDir, `${stockId}.csv`);
            
            // 检查股票文件是否存在，如果不存在则创建并写入标题行
            if (!fs.existsSync(stockFile)) {
                fs.writeFileSync(stockFile, headers.join(',') + '\n');
            }
            
            // 追加到股票文件
            fs.appendFileSync(stockFile, rowContent + '\n');
        }
    });
}

// CSV行解析函数（处理带引号的数据）
function parseCSVLine(line) {
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // 处理转义的引号 ""
                currentValue += '"';
                i += 2;
            } else {
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            // 分隔符
            values.push(currentValue);
            currentValue = '';
            i++;
        } else {
            currentValue += char;
            i++;
        }
    }
    
    // 添加最后一个值
    values.push(currentValue);
    
    return values;
}

// 获取单个页面数据，支持重试机制
async function fetchSinglePage(apiConfig, pageNum, retryCount = 0, maxRetries = 3) {
    let startTime = Date.now();
    try {
        // 复制配置并更新页码
        const pageConfig = JSON.parse(JSON.stringify(apiConfig));
        if (!pageConfig.params) {
            pageConfig.params = {};
        }
        pageConfig.params.pn = pageNum;
        
        // 动态生成JSONP回调参数（总是生成，不管配置中是否有）
        const timestamp = new Date().getTime();
        const randomNum = Math.floor(Math.random() * 10000000000);
        pageConfig.params.cb = `jQuery${randomNum}_${timestamp}`;
        
        // 应用接口调用延迟限制（所有页面都应用，包括第一页）
        // 生成100ms至1000ms之间的随机延迟
        const randomDelay = Math.floor(Math.random() * 901) + 100;
        log(`API ${apiConfig.name} 第${pageNum}页 - 应用随机延迟 ${randomDelay}ms 限制调用频率`);
        await new Promise(resolve => setTimeout(resolve, randomDelay));
        
        // 确保有合理的超时设置
        const timeout = pageConfig.timeout || 10000;
        
        // 创建完整的URL字符串
        let fullUrl = pageConfig.url;
        if (pageConfig.params && Object.keys(pageConfig.params).length > 0) {
            const paramsString = Object.entries(pageConfig.params)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');
            fullUrl += '?' + paramsString;
        }
        
        // 使用curl命令获取数据，这样可以完全模拟浏览器的请求行为
        const response = await new Promise((resolve, reject) => {
            // 构建curl命令
            const curlCommand = `curl -s "${fullUrl}" -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36" -H "Accept: */*" -H "Accept-Language: zh-CN,zh;q=0.9" -H "Referer: https://quote.eastmoney.com/center/gridlist.html" -H "Connection: keep-alive" -H "Cache-Control: no-cache"`;
            
            log(`API ${apiConfig.name} 第${pageNum}页 - 使用curl命令获取数据`);
            
            // 执行curl命令
            exec(curlCommand, { timeout: timeout }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                if (stderr) {
                    log(`API ${apiConfig.name} 第${pageNum}页 - curl stderr: ${stderr}`, 'warning');
                }
                
                resolve(stdout);
            });
        });
        
        // 处理JSONP响应
        let jsonData;
        let isJsonp = false;
        
        // 检查并处理JSONP响应
        if (typeof response === 'string' && response.trim().startsWith('jQuery')) {
            isJsonp = true;
            try {
                // 先trim字符串，去除开头和结尾的空白字符
                const trimmedResponse = response.trim();
                
                // 寻找第一个左括号和最后一个右括号
                const startIndex = trimmedResponse.indexOf('(');
                const endIndex = trimmedResponse.lastIndexOf(')');
                
                if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                    const jsonString = trimmedResponse.substring(startIndex + 1, endIndex);
                    jsonData = JSON.parse(jsonString);
                } else {
                    throw new Error('JSONP response format error');
                }
            } catch (parseError) {
                throw new Error(`JSONP解析失败: ${parseError.message}`);
            }
        } else if (typeof response === 'string') {
            // 尝试解析为标准JSON
            try {
                jsonData = JSON.parse(response);
            } catch (parseError) {
                throw new Error(`JSON解析失败: ${parseError.message}`);
            }
        } else {
            throw new Error('无效的响应格式');
        }
        
        let endTime = Date.now();
        log(`API ${apiConfig.name} 第${pageNum}页 - 请求成功，耗时 ${endTime - startTime}ms`);
        
        // 返回处理结果
        return {
            status: 'success',
            api: apiConfig.name,
            page: pageNum,
            data: jsonData,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        log(`API ${apiConfig.name} 第${pageNum}页 - 请求失败: ${error.message}`, 'error');
        
        // 重试机制
        if (retryCount < maxRetries) {
            const retryDelay = Math.pow(2, retryCount) * 1000;
            log(`API ${apiConfig.name} 第${pageNum}页 - ${retryCount + 1}/${maxRetries} 重试，延迟 ${retryDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return fetchSinglePage(apiConfig, pageNum, retryCount + 1, maxRetries);
        } else {
            log(`API ${apiConfig.name} 第${pageNum}页 - 已达到最大重试次数`, 'error');
            return {
                status: 'error',
                api: apiConfig.name,
                page: pageNum,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// 监控单个接口
async function monitorApi(apiConfig, date = null) {
    // 复制原始配置，避免修改原始对象
    const originalConfig = JSON.parse(JSON.stringify(apiConfig));
    let totalPages = 1;
    const allResults = [];
    
    // 使用指定日期或当前日期（使用中国时区）
    const targetDate = date || new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date()).replace(/\//g, '-');
    
    // 先清空原数据文件
    const apiName = apiConfig.name;
    const dataFile = path.join(dataDir, `${apiName}_${targetDate}.csv`);
    if (fs.existsSync(dataFile)) {
        fs.unlinkSync(dataFile);
        log(`API ${apiName} 清空旧数据文件: ${dataFile}`);
    }
    
    try {
        // 先获取第一页数据
        const firstPageResult = await fetchSinglePage(originalConfig, 1);
        allResults.push(firstPageResult);
        
        // 立即保存第一页数据
        if (firstPageResult.status === 'success') {
            saveMonitorData(firstPageResult, targetDate);
        }
        
        // 从响应中获取总页数信息
        if (firstPageResult.status === 'success' && firstPageResult.data.data) {
            // 根据东方财富API的响应结构获取总页数
            // 响应格式: { data: { diff: [...], total: 总条数 }, ... }
            const data = firstPageResult.data.data;
            if (data && data.total) {
                const totalCount = parseInt(data.total);
                const pageSize = parseInt(originalConfig.params?.pz || 20);
                totalPages = Math.ceil(totalCount / pageSize);
                
                log(`API ${apiConfig.name} 发现总数据 ${totalCount} 条，共 ${totalPages} 页`);
            }
        }
        
        // 如果有多页数据，获取剩余页面
        if (totalPages > 1) {
            for (let page = 2; page <= totalPages; page++) {
                const pageResult = await fetchSinglePage(originalConfig, page);
                allResults.push(pageResult);
                
                // 立即保存当前页数据
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
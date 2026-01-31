const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 创建日志目录
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// 监控数据目录
const dataDir = path.join(__dirname, '../../web/public/data/daily');
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

// 检查文件中是否已经存在指定日期的数据
function hasDateInFile(filePath, date, headers) {
    if (!fs.existsSync(filePath)) {
        return false;
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.trim().split('\n');
    const dateIndex = headers.indexOf('date');
    
    if (dateIndex === -1) {
        return false;
    }
    
    // 从第二行开始检查数据行
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLine(line);
        if (values[dateIndex] === date) {
            return true;
        }
    }
    
    return false;
}

// 监控数据存储函数 - 只保存diff数据，按CSV格式输出，支持追加模式
function saveMonitorData(monitorData, date = null) {
    if (!monitorData || !monitorData.data || !monitorData.data.data) {
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
    const stockDir = path.join(__dirname, '../../web/public/data/stock');
    
    // 提取当前页面的数据（处理两种情况：单个股票数据和股票列表数据）
    let stockData;
    if (monitorData.data.data.diff) {
        // 处理股票列表数据（旧格式）
        stockData = monitorData.data.data.diff;
    } else {
        // 处理单个股票数据（新格式）
        stockData = [monitorData.data.data];
    }
    
    if (stockData.length === 0) {
        log(`API ${apiName} 第${monitorData.page}页没有提取到股票数据`);
        return;
    }
    
    // 将JSON数据转换为CSV格式
    let csvContent = '';
    // 获取所有字段，并将日期字段排在最前面，然后是股票编号(f12/f57)和股票名称(f14/f58)
    const allHeaders = Object.keys(stockData[0]);
    // 确定股票编号和名称的字段名
    const stockIdField = allHeaders.includes('f12') ? 'f12' : 'f57';
    const stockNameField = allHeaders.includes('f14') ? 'f14' : 'f58';
    const headers = ['date', stockIdField, stockNameField, ...allHeaders.filter(h => h !== stockIdField && h !== stockNameField)];
    
    // 直接写入标题行（覆盖模式）
    csvContent += headers.join(',') + '\n';
    
    // 添加当前页面的数据行
    stockData.forEach(row => {
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
    
    // 1. 覆盖写入每日汇总CSV文件（每个文件只包含一天的数据）
    fs.writeFileSync(dataFile, csvContent);
    log(`API ${apiName} 第${monitorData.page}页数据覆盖写入CSV文件: ${dataFile}, 共 ${stockData.length} 条记录`);
    
    // 2. 然后从daily文件中读取最新写入的数据，按股票维度补充到stock目录
    const addedLines = csvContent.trim().split('\n');
    // 移除标题行（如果存在）
    const dataLines = addedLines.filter(line => !line.startsWith('date,'));
    
    dataLines.forEach(rowContent => {
        if (!rowContent.trim()) return;
        
        // 解析行数据获取股票编号和日期
        const values = parseCSVLine(rowContent);
        if (values.length < 3) return; // 至少需要日期、股票编号和股票名称
        
        const date = values[0]; // 日期在第一列
        const stockId = values[1]; // 股票编号在第二列
        if (stockId) {
            // 移除stock前缀，直接使用股票编号作为文件名
            const stockFile = path.join(stockDir, `${stockId}.csv`);
            
            // 读取股票文件内容
            let fileContent = headers.join(',') + '\n';
            if (fs.existsSync(stockFile)) {
                const existingContent = fs.readFileSync(stockFile, 'utf8');
                if (existingContent.trim()) {
                    const lines = existingContent.trim().split('\n');
                    // 保留标题行和非相同日期的数据行
                    fileContent = lines.filter((line, index) => {
                        // 保留标题行
                        if (index === 0) return true;
                        // 检查数据行是否包含相同日期
                        const values = parseCSVLine(line);
                        return values[0] !== date; // 日期在第一列
                    }).join('\n') + '\n';
                }
            }
            
            // 添加新数据行
            fileContent += rowContent + '\n';
            
            // 重新写入文件
            fs.writeFileSync(stockFile, fileContent);
            log(`股票 ${stockId} 的数据已写入文件: ${stockFile}`);
        }
    });
}

// 获取单个页面数据，支持重试机制（使用axios）
async function fetchSinglePage(apiConfig, pageNum, retryCount = 0, maxRetries = 3) {
    let startTime = Date.now();
    try {
        // 复制配置并更新页码
        const pageConfig = JSON.parse(JSON.stringify(apiConfig));
        if (!pageConfig.params) {
            pageConfig.params = {};
        }
        pageConfig.params.pn = pageNum;
        
        // 如果配置中没有cb参数，才动态生成JSONP回调参数
        if (!pageConfig.params.cb) {
            const timestamp = new Date().getTime();
            const randomNum = Math.floor(Math.random() * 10000000000);
            pageConfig.params.cb = `jQuery${randomNum}_${timestamp}`;
        }
        
        // 应用接口调用延迟限制（所有页面都应用，包括第一页）
        // 生成100ms至1000ms之间的随机延迟
        const randomDelay = Math.floor(Math.random() * 901) + 100;
        log(`API ${apiConfig.name} 第${pageNum}页 - 应用随机延迟 ${randomDelay}ms 限制调用频率`);
        await new Promise(resolve => setTimeout(resolve, randomDelay));
        
        // 构建URL路径和参数
        const url = new URL(pageConfig.url);
        
        // 设置查询参数
        for (const [key, value] of Object.entries(pageConfig.params)) {
            url.searchParams.set(key, value); // 使用set代替append，避免重复参数
        }
        
        // 构建完整的请求URL
        const fullUrl = url.href;
        log(`API ${apiConfig.name} 第${pageNum}页 - 构建URL: ${fullUrl}`);
        
        // 使用axios发送请求
        log(`API ${apiConfig.name} 第${pageNum}页 - 发送HTTP请求...`);
        const response = await axios.get(fullUrl, {
            headers: pageConfig.headers || {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Referer': 'https://quote.eastmoney.com/',
                'Accept': '*/*'
            },
            timeout: 35000
        });
        
        let responseData = response.data;
        
        // 处理JSONP响应
        let jsonData;
        let isJsonp = false;
        
        // 检查并处理JSONP响应
        if (typeof responseData === 'string' && responseData.trim().startsWith('jQuery')) {
            isJsonp = true;
            try {
                // 先trim字符串，去除开头和结尾的空白字符
                const trimmedResponse = responseData.trim();
                
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
        } else {
            // 已经是标准JSON对象
            jsonData = responseData;
        }
        
        // 打印完整的响应数据结构
        log(`API ${apiConfig.name} 第${pageNum}页 - 响应数据结构: ${JSON.stringify(jsonData, null, 2)}`);
        
        let endTime = Date.now();
        log(`API ${apiConfig.name} 第${pageNum}页 - 请求成功，耗时 ${endTime - startTime}ms`);
        
        return {
            status: 'success',
            api: apiConfig.name,
            page: pageNum,
            data: jsonData,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        let errorMessage = error.message;
        if (error.response) {
            // 服务器返回错误状态码
            errorMessage = `服务器返回错误状态码: ${error.response.status} - ${error.response.statusText}`;
        } else if (error.request) {
            // 请求已发送但没有收到响应
            errorMessage = `未收到服务器响应: ${error.message}`;
        }
        
        log(`API ${apiConfig.name} 第${pageNum}页 - 请求失败: ${errorMessage}`, 'error');
        
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
                error: errorMessage,
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

// 导出所有函数
module.exports = {
    log,
    parseCSVLine,
    hasDateInFile,
    saveMonitorData,
    fetchSinglePage,
    monitorApi,
    dataDir
};
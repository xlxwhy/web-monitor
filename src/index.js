const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// 加载配置文件
const config = require(path.join(__dirname, '../config/apis.json'));

// 创建日志目录
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// 数据目录
const dataDir = path.join(__dirname, '../data/daily');
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

// 设置静态文件目录为Vue项目编译后的dist文件夹
const staticDir = path.join(__dirname, '../web/dist');
app.use(express.static(staticDir));
log(`静态文件目录已设置为: ${staticDir}`);

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
    const stockDir = path.join(__dirname, '../data/stock');
    
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
        if (firstPageResult.status === 'success' && firstPageResult.pagination) {
            // 根据东方财富API的响应结构获取总页数
            // 响应格式: { data: { diff: [...], total: 总条数 }, ... }
            const pagination = firstPageResult.pagination;
            if (pagination && pagination.total) {
                const totalCount = parseInt(pagination.total);
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
        
        // 动态生成JSONP回调参数（如果是JSONP请求）
        if (pageConfig.params && pageConfig.params.cb) {
            // 使用当前时间戳（与时区无关）
            const timestamp = new Date().getTime();
            const randomNum = Math.floor(Math.random() * 10000000000);
            pageConfig.params.cb = `jQuery${randomNum}_${timestamp}`;
        }
        
        // 应用接口调用延迟限制（所有页面都应用，包括第一页）
        // 生成100ms至1000ms之间的随机延迟
        const randomDelay = Math.floor(Math.random() * 901) + 100;
        log(`API ${apiConfig.name} 第${pageNum}页 - 应用随机延迟 ${randomDelay}ms 限制调用频率`);
        await new Promise(resolve => setTimeout(resolve, randomDelay));
        
        // 确保有合理的超时设置
        const timeout = pageConfig.timeout || 10000;
        
        // 增强的请求头
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
            'Accept': 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            ...(pageConfig.headers || {})
        };
        
        // 移除可能导致问题的参数（如固定的时间戳参数）
        if (pageConfig.params && pageConfig.params._) {
            delete pageConfig.params._;
        }
        
        // 确保JSONP回调参数是动态生成的
        if (pageConfig.params && pageConfig.params.cb) {
            // 使用当前时间戳（与时区无关）
            const timestamp = new Date().getTime();
            const randomNum = Math.floor(Math.random() * 10000000000);
            pageConfig.params.cb = `jQuery${randomNum}_${timestamp}`;
        }
        
        // 移除可能导致问题的固定时间戳参数
        if (pageConfig.params && pageConfig.params._) {
            delete pageConfig.params._;
        }
        
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
                
                // 构造与axios类似的响应对象
                resolve({
                    status: 200,
                    data: stdout,
                    headers: {}
                });
            });
        });
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        let responseData = response.data;
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
                    responseData = JSON.parse(jsonString);
                }
            } catch (parseError) {
                log(`API ${apiConfig.name} 第${pageNum}页 JSONP解析失败: ${parseError.message}`, 'error');
            }
        } else if (typeof responseData === 'string') {
            // 尝试解析为标准JSON
            try {
                responseData = JSON.parse(responseData);
            } catch (parseError) {
                // 如果不是JSON，保持原样
            }
        }
        
        // 提取分页信息的逻辑
        const paginationInfo = {};
        let totalCount = 0;
        
        if (responseData && typeof responseData === 'object') {
            // 检查是否是东方财富API的响应格式
            if (responseData.hasOwnProperty('rc') && responseData.hasOwnProperty('data')) {
                // 东方财富API的响应格式: {rc: 0, data: {total: ..., diff: [...]}}
                if (responseData.data && responseData.data.hasOwnProperty('total')) {
                    totalCount = parseInt(responseData.data.total || 0);
                }
            } else if (responseData.hasOwnProperty('data')) {
                // 标准的{data: {total: ...}}格式
                totalCount = parseInt(responseData.data.total || 0);
            } else if (responseData.hasOwnProperty('total')) {
                // 直接包含total字段
                totalCount = parseInt(responseData.total || 0);
            }
        }
        
        paginationInfo.total = totalCount;
        paginationInfo.pageSize = parseInt(pageConfig.params?.pz || 20);
        
        const monitorData = {
            // 使用中国时区的ISO时间格式
            timestamp: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
            api: apiConfig.name,
            url: pageConfig.url,
            status: 'success',
            statusCode: response.status,
            responseTime: responseTime,
            responseSize: JSON.stringify(responseData).length,
            isJsonp: isJsonp,
            page: pageNum,
            pagination: paginationInfo,
            data: responseData // 保存完整的响应数据
        };
        
        log(`API ${apiConfig.name} 第${pageNum}页监控成功 - 响应时间: ${responseTime}ms - 状态码: ${response.status}${isJsonp ? ' (JSONP)' : ''}`);
        return monitorData;
    } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime || 0;
        
        const monitorData = {
            // 使用中国时区的ISO时间格式
            timestamp: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
            api: apiConfig.name,
            url: apiConfig.url,
            status: 'error',
            error: error.message,
            statusCode: error.response?.status || null,
            responseTime: responseTime,
            page: pageNum
        };
        
        log(`API ${apiConfig.name} 第${pageNum}页监控失败 - 错误: ${error.message}`, 'error');
        
        // 如果是网络错误且还有重试次数，进行重试
        if ((error.code === 'ECONNRESET' || error.message.includes('socket hang up')) && retryCount < maxRetries) {
            retryCount++;
            const retryDelay = Math.pow(2, retryCount) * 1000; // 指数退避延迟
            log(`API ${apiConfig.name} 第${pageNum}页请求失败 - 错误: ${error.message}，将在 ${retryDelay}ms 后重试 (第 ${retryCount}/${maxRetries} 次)`, 'warning');
            
            // 等待重试延迟
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            
            // 重试请求
            return fetchSinglePage(apiConfig, pageNum, retryCount, maxRetries);
        }
        
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

// 获取apis.json配置的接口
app.get('/api/config', (req, res) => {
    res.json(config);
});

// 获取监控数据接口
app.get('/monitor-data', (req, res) => {
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

// 获取股票数据接口（支持分页）
app.get('/api/stock-data', async (req, res) => {
    try {
        const currentPage = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const searchQuery = req.query.search || '';
        const date = req.query.date || new Date().toISOString().split('T')[0];
        
        // 获取东方财富股票数据API配置
        const stockApiConfig = config.apis.find(api => api.name === 'EastmoneyStockData');
        if (!stockApiConfig) {
            return res.status(404).json({ error: 'Stock API configuration not found' });
        }
        
        // 读取CSV文件
        const apiName = stockApiConfig.name;
        const dataFile = path.join(dataDir, `${apiName}_${date}.csv`);
        
        if (!fs.existsSync(dataFile)) {
            // 如果没有数据，立即执行一次监控获取数据
            log('没有找到股票数据文件，立即执行一次监控...');
            await monitorApi(stockApiConfig, date);
            
            // 再次检查文件是否存在
            if (!fs.existsSync(dataFile)) {
                return res.status(404).json({ error: 'No stock data found' });
            }
        }
        
        // 读取并解析CSV文件
        const csvContent = fs.readFileSync(dataFile, 'utf8');
        const lines = csvContent.trim().split('\n');
        
        if (lines.length < 2) {
            return res.json({ data: [], total: 0, currentPage, pageSize });
        }
        
        // 解析CSV头
        const headers = lines[0].split(',');
        
        // 解析数据行
        let allData = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                allData.push(row);
            }
        }
        
        // 搜索过滤
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            allData = allData.filter(stock => {
                // f12是股票代码，f14是股票名称
                return stock.f12?.toLowerCase().includes(query) || stock.f14?.toLowerCase().includes(query);
            });
        }
        
        // 分页处理
        const total = allData.length;
        const startIndex = (currentPage - 1) * pageSize;
        const paginatedData = allData.slice(startIndex, startIndex + pageSize);
        
        // 转换为前端需要的格式
        const formattedData = paginatedData.map(stock => {
            // f2: 最新价, f3: 涨跌幅, f4: 涨跌额, f5: 成交量, f6: 成交额
            const price = parseFloat(stock.f2) || 0;
            const changePercent = parseFloat(stock.f3) || 0;
            const change = parseFloat(stock.f4) || 0;
            
            return {
                code: stock.f12 || '',
                name: stock.f14 || '',
                price: price,
                change: change,
                changePercent: changePercent,
                volume: stock.f5 || 0,
                turnover: stock.f6 || 0,
                date: new Date().toLocaleString('zh-CN')
            };
        });
        
        res.json({
            data: formattedData,
            total: total,
            currentPage: currentPage,
            pageSize: pageSize
        });
    } catch (error) {
        log(`获取股票数据失败: ${error.message}`, 'error');
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

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

// 获取股票历史数据的API
app.get('/api/stock-history', async (req, res) => {
    try {
        const { code, currentPage = 1, pageSize = 20 } = req.query;
        
        if (!code) {
            return res.status(400).json({ error: '股票代码不能为空' });
        }
        
        log(`获取股票历史数据请求: 股票代码=${code}, 页码=${currentPage}, 每页大小=${pageSize}`);
        
        // 检查数据目录是否存在
        if (!fs.existsSync(dataDir)) {
            log('数据目录不存在', 'error');
            return res.status(404).json({ error: '数据目录不存在' });
        }
        
        // 获取所有股票数据文件
        const files = fs.readdirSync(dataDir).filter(file => 
            file.startsWith('EastmoneyStockData_') && file.endsWith('.csv')
        );
        
        if (files.length === 0) {
            log('没有找到股票数据文件');
            return res.json({ data: [], total: 0, currentPage: 1, pageSize: pageSize });
        }
        
        // 解析所有文件，提取指定股票的数据
        let allHistoryData = [];
        
        for (const file of files) {
            try {
                // 从文件名中提取日期
                const dateStr = file.replace('EastmoneyStockData_', '').replace('.csv', '');
                const filePath = path.join(dataDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n').filter(line => line.trim() !== '');
                
                if (lines.length < 2) continue;
                
                // 解析CSV头
                const headers = parseCSVLine(lines[0]);
                
                // 查找包含指定股票代码的行
                for (let i = 1; i < lines.length; i++) {
                    const values = parseCSVLine(lines[i]);
                    if (values.length === headers.length) {
                        const row = {};
                        headers.forEach((header, index) => {
                            row[header] = values[index];
                        });
                        
                        // 检查股票代码是否匹配（f12是股票代码）
                        if (row.f12 === code) {
                            // 转换为前端需要的格式
                            const price = parseFloat(row.f2) || 0;
                            const changePercent = parseFloat(row.f3) || 0;
                            const change = parseFloat(row.f4) || 0;
                            
                            allHistoryData.push({
                                code: row.f12 || '',
                                name: row.f14 || '',
                                price: price,
                                change: change,
                                changePercent: changePercent,
                                volume: row.f5 || 0,
                                turnover: row.f6 || 0,
                                date: dateStr
                            });
                            break; // 每个文件只需要一条记录
                        }
                    }
                }
            } catch (error) {
                log(`解析文件 ${file} 失败: ${error.message}`, 'error');
            }
        }
        
        // 按日期降序排序
        allHistoryData.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // 分页处理
        const total = allHistoryData.length;
        const startIndex = (parseInt(currentPage) - 1) * parseInt(pageSize);
        const paginatedData = allHistoryData.slice(startIndex, startIndex + parseInt(pageSize));
        
        log(`获取股票历史数据成功: 股票代码=${code}, 总记录数=${total}`);
        
        res.json({
            data: paginatedData,
            total: total,
            currentPage: parseInt(currentPage),
            pageSize: parseInt(pageSize)
        });
    } catch (error) {
        log(`获取股票历史数据失败: ${error.message}`, 'error');
        res.status(500).json({ error: 'Failed to fetch stock history data' });
    }
});

// 手动触发监控任务的接口
app.post('/api/trigger-monitor', async (req, res) => {
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

// 配置回退路由，处理Vue Router history模式下的页面刷新
// 匹配所有非API、非健康检查和非静态文件的路径，但允许以/api开头的前端路由
app.get(/^(?!\/api\/|\/health|\/static).*/, (req, res) => {
    // 确保只处理前端路由，不影响静态文件和已定义的API
    res.sendFile(path.join(staticDir, 'index.html'));
});
log('已配置回退路由，支持Vue Router history模式');

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
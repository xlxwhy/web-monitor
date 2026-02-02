const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 导入EaseMoney工具
const EaseMoney = require('./utils/EaseMoney.js');

// 导入监控工具模块
const monitorUtils = require('./utils/monitor');
const { log, monitorApi, saveMonitorData } = monitorUtils;

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

// 获取股票历史K线数据接口
app.get('/api/stock-kline', async (req, res) => {
    try {
        // 兼容两种参数名：stockCode 和 code
        const { stockCode, code = '000001', market = '0', splitByYear = false } = req.query;
        const actualCode = stockCode || code;
        
        log(`获取股票历史K线数据请求: 股票代码=${actualCode}, 市场类型=${market}, 是否按年份拆分=${splitByYear}`);
        
        // 调用EaseMoney.js中的方法获取K线数据
        // 创建模拟stock对象，包含f12(代码)和f13(市场类型)属性
        const stock = { f12: actualCode, f13: market, f14: '股票名称' };
        
        // 获取所有历史K线数据（fromDate为空表示获取全部）
        const klines = await EaseMoney.getStockKLines(stock, '');
        
        if (!klines || klines.length === 0) {
            log(`未获取到股票 ${actualCode} 的K线数据`);
            return res.status(404).json({ error: `未获取到股票 ${actualCode} 的K线数据` });
        }
        
        log(`成功获取股票 ${actualCode} 的K线数据，共 ${klines.length} 条记录`);
        
        // 将数据合并到/web/public/data/stock目录下
        const stockDataDir = path.join(__dirname, '../web/public/data/stock');
        const codeDir = path.join(stockDataDir, actualCode);
        
        // 创建目录
        if (!fs.existsSync(codeDir)) {
            fs.mkdirSync(codeDir, { recursive: true });
        }
        
        // 保存数据
        if (splitByYear === true || splitByYear === 'true') {
            // 按年份保存数据
            let lastYear = '';
            klines.forEach(kline => {
                const klineDate = kline.split(',')[0];
                const klineYear = klineDate.substr(0, 4);
                const file = path.join(codeDir, `${klineYear}.dat`);
                
                if (lastYear !== klineYear) {
                    // 新的年份，覆盖写入
                    fs.writeFileSync(file, kline, 'utf8');
                    lastYear = klineYear;
                } else {
                    // 同一年份，追加写入
                    fs.appendFileSync(file, '\n' + kline, 'utf8');
                }
            });
        } else {
            // 保存为单个文件
            const file = path.join(codeDir, 'all.dat');
            // 写入所有数据，使用\n分隔
            fs.writeFileSync(file, klines.join('\n'), 'utf8');
        }
        
        // 保存股票基本信息
        const stockInfo = { code: actualCode, market, name: stock.f14, klineCount: klines.length };
        const companyDir = path.join(__dirname, '../web/public/data/company');
        if (!fs.existsSync(companyDir)) {
            fs.mkdirSync(companyDir, { recursive: true });
        }
        const infoFile = path.join(companyDir, `${actualCode}.json`);
        fs.writeFileSync(infoFile, JSON.stringify(stockInfo, null, 2), 'utf8');
        
        log(`股票 ${actualCode} 的K线数据已保存到 ${stockDataDir} 目录下`);
        
        res.json({
            success: true,
            message: `成功获取股票 ${actualCode} 的历史K线数据`,
            data: {
                code: actualCode,
                name: stock.f14,
                market,
                klineCount: klines.length,
                dataDir: stockDataDir
            }
        });
    } catch (error) {
        log(`获取股票历史K线数据失败: ${error.message}`, 'error');
        res.status(500).json({ error: `获取股票历史K线数据失败: ${error.message}` });
    }
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

// 获取股票列表并逐个获取K线数据的批量接口
app.get('/api/batch-stock-kline', async (req, res) => {
    try {
        log('接收到批量获取股票K线数据请求');
        
        // 测试参数：每页2个股票，仅测试2页
        const pageSize = 2;
        const totalPages = 2;
        
        let allResults = [];
        let successCount = 0;
        let failureCount = 0;
        
        // 遍历每页
        for (let page = 1; page <= totalPages; page++) {
            log(`开始处理第 ${page} 页股票数据`);
            
            // 获取当前页的股票列表
            const stockPageResult = await EaseMoney.getStockPage(page, pageSize);
            
            if (!stockPageResult || !stockPageResult.data || !stockPageResult.data.diff) {
                log(`未获取到第 ${page} 页的股票列表数据`);
                failureCount += pageSize;
                continue;
            }
            
            const stocks = stockPageResult.data.diff;
            
            // 遍历当前页的每个股票
            for (let i = 0; i < stocks.length; i++) {
                const stock = stocks[i];
                const stockCode = stock.f12;
                const stockName = stock.f14;
                const market = stock.f13;
                
                try {
                    log(`获取股票 ${stockCode}(${stockName}) 的K线数据`);
                    
                    // 获取当前股票的K线数据
                    const klines = await EaseMoney.getStockKLines(stock, '');
                    
                    if (klines && klines.length > 0) {
                        log(`成功获取股票 ${stockCode}(${stockName}) 的K线数据，共 ${klines.length} 条记录`);
                        
                        // 将数据保存到文件系统（和/api/stock-kline接口保持一致）
                        const stockDataDir = path.join(__dirname, '../web/public/data/stock');
                        const codeDir = path.join(stockDataDir, stockCode);
                        
                        // 创建目录
                        if (!fs.existsSync(codeDir)) {
                            fs.mkdirSync(codeDir, { recursive: true });
                        }
                        
                        // 保存为单个文件
                        const file = path.join(codeDir, 'all.dat');
                        // 写入所有数据，使用\n分隔
                        fs.writeFileSync(file, klines.join('\n'), 'utf8');
                        
                        // 保存股票基本信息
                        const stockInfo = { code: stockCode, market, name: stockName, klineCount: klines.length };
                        const companyDir = path.join(__dirname, '../web/public/data/company');
                        if (!fs.existsSync(companyDir)) {
                            fs.mkdirSync(companyDir, { recursive: true });
                        }
                        const infoFile = path.join(companyDir, `${stockCode}.json`);
                        fs.writeFileSync(infoFile, JSON.stringify(stockInfo, null, 2), 'utf8');
                        
                        successCount++;
                        allResults.push({
                            code: stockCode,
                            name: stockName,
                            market,
                            success: true,
                            klineCount: klines.length,
                            message: `成功获取K线数据`
                        });
                    } else {
                        log(`未获取到股票 ${stockCode}(${stockName}) 的K线数据`);
                        failureCount++;
                        allResults.push({
                            code: stockCode,
                            name: stockName,
                            market,
                            success: false,
                            message: `未获取到K线数据`
                        });
                    }
                } catch (error) {
                    log(`获取股票 ${stockCode}(${stockName}) 的K线数据失败: ${error.message}`, 'error');
                    failureCount++;
                    allResults.push({
                        code: stockCode,
                        name: stockName,
                        market,
                        success: false,
                        message: `获取K线数据失败: ${error.message}`
                    });
                }
                
                // 添加随机延迟，避免高频请求
                const randomDelay = Math.floor(Math.random() * 2000) + 1000; // 1-3秒
                await new Promise(resolve => setTimeout(resolve, randomDelay));
            }
        }
        
        log(`批量获取股票K线数据完成: 成功 ${successCount} 个，失败 ${failureCount} 个`);
        
        res.json({
            success: true,
            message: `批量获取股票K线数据完成`,
            total: allResults.length,
            successCount,
            failureCount,
            data: allResults
        });
    } catch (error) {
        log(`批量获取股票K线数据失败: ${error.message}`, 'error');
        res.status(500).json({ error: `批量获取股票K线数据失败: ${error.message}` });
    }
});

// 配置回退路由，处理Vue Router history模式下的页面刷新
app.get(/^\/web-monitor\/.*/, (req, res) => {
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
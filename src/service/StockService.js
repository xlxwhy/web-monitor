const fs = require('fs');
const path = require('path');
const EastMoney = require('../api/EastMoney.js');
const { log } = require('../utils/monitor.js');

class StockService {
    // 获取股票历史K线数据
    async getStockKline(stockCode, code, market, splitByYear) {
        try {
            // 兼容两种参数名：stockCode 和 code
            const actualCode = stockCode || code || '000001';
            market = market || '0';
            splitByYear = splitByYear === true || splitByYear === 'true';
            
            log(`获取股票历史K线数据请求: 股票代码=${actualCode}, 市场类型=${market}, 是否按年份拆分=${splitByYear}`);
            
            // 调用EastMoney.js中的方法获取K线数据
            // 创建模拟stock对象，包含f12(代码)和f13(市场类型)属性
            const stock = { f12: actualCode, f13: market, f14: '股票名称' };
            
            // 获取所有历史K线数据（fromDate为空表示获取全部）
            const klineResult = await EastMoney.getStockKLines(stock, '');
            log(`[DEBUG] klineResult: ${JSON.stringify(klineResult, null, 2)}`);
            
            // 确保klines是数组
            const klines = Array.isArray(klineResult.klines) ? klineResult.klines : [];
            log(`[DEBUG] klines类型: ${typeof klines}, 长度: ${klines.length}`);
            
            if (!klines || klines.length === 0) {
                log(`未获取到股票 ${actualCode} 的K线数据`);
                return { success: false, error: `未获取到股票 ${actualCode} 的K线数据` };
            }
            
            log(`成功获取股票 ${actualCode} 的K线数据，共 ${klines.length} 条记录`);
            
            // 将数据合并到/web/public/data/stock目录下
            const stockDataDir = path.join(__dirname, '../../web/public/data/stock');
            const codeDir = path.join(stockDataDir, actualCode);
            
            // 创建目录
            if (!fs.existsSync(codeDir)) {
                fs.mkdirSync(codeDir, { recursive: true });
            }
            
            // 保存数据
            if (splitByYear) {
                // 按年份保存数据
                let lastYear = '';
                klines.forEach(kline => {
                    const klineDate = kline.date;
                    const klineYear = klineDate.substr(0, 4);
                    const file = path.join(codeDir, `${klineYear}.dat`);
                    
                    if (lastYear !== klineYear) {
                        // 新的年份，覆盖写入
                        const klineString = `${kline.date},${kline.open},${kline.close},${kline.high},${kline.low},${kline.volume},${kline.amount},${kline.amplitude},${kline.changeRate},${kline.changeAmount},${kline.turnover}`;
                        fs.writeFileSync(file, klineString, 'utf8');
                        lastYear = klineYear;
                    } else {
                        // 同一年份，追加写入
                        const klineString = `${kline.date},${kline.open},${kline.close},${kline.high},${kline.low},${kline.volume},${kline.amount},${kline.amplitude},${kline.changeRate},${kline.changeAmount},${kline.turnover}`;
                        fs.appendFileSync(file, '\n' + klineString, 'utf8');
                    }
                });
            } else {
                // 保存为单个文件
                const file = path.join(codeDir, 'all.dat');
                // 将JSON对象转换为CSV格式字符串
                const klineStrings = klines.map(kline => 
                    `${kline.date},${kline.open},${kline.close},${kline.high},${kline.low},${kline.volume},${kline.amount},${kline.amplitude},${kline.changeRate},${kline.changeAmount},${kline.turnover}`
                );
                // 写入所有数据，使用\n分隔
                fs.writeFileSync(file, klineStrings.join('\n'), 'utf8');
            }
            
            // 保存股票基本信息
            const stockInfo = { code: actualCode, market, name: stock.f14, klineCount: klines.length };
            const companyDir = path.join(__dirname, '../../web/public/data/company');
            if (!fs.existsSync(companyDir)) {
                fs.mkdirSync(companyDir, { recursive: true });
            }
            const infoFile = path.join(companyDir, `${actualCode}.json`);
            fs.writeFileSync(infoFile, JSON.stringify(stockInfo, null, 2), 'utf8');
            
            log(`股票 ${actualCode} 的K线数据已保存到 ${stockDataDir} 目录下`);
            
            return {
                success: true,
                data: {
                    code: actualCode,
                    name: stock.f14,
                    market,
                    klineCount: klines.length,
                    dataDir: stockDataDir,
                    klines: klines
                }
            };
        } catch (error) {
            log(`获取股票历史K线数据失败: ${error.message}`, 'error');
            return { success: false, error: `获取股票历史K线数据失败: ${error.message}` };
        }
    }

    // 获取股票数据（支持分页）
    async getStockData(page, pageSize, search, date) {
        try {
            const currentPage = parseInt(page) || 1;
            const size = parseInt(pageSize) || 20;
            const searchQuery = search || '';
            const dataDate = date || new Date().toISOString().split('T')[0];
            
            // 加载配置文件
            const config = require('../../config/apis.json');
            
            // 获取东方财富股票数据API配置
            const stockApiConfig = config.apis.find(api => api.name === 'EastmoneyStockData');
            if (!stockApiConfig) {
                return { success: false, error: 'Stock API configuration not found' };
            }
            
            // 读取CSV文件
            const apiName = stockApiConfig.name;
            const dataDir = path.join(__dirname, '../../../web/public/data/daily');
            const dataFile = path.join(dataDir, `${apiName}_${dataDate}.csv`);
            
            if (!fs.existsSync(dataFile)) {
                // 如果没有数据，立即执行一次监控获取数据
                const { monitorApi } = require('../utils/monitor.js');
                log('没有找到股票数据文件，立即执行一次监控...');
                await monitorApi(stockApiConfig, dataDate);
                
                // 再次检查文件是否存在
                if (!fs.existsSync(dataFile)) {
                    return { success: false, error: 'No stock data found' };
                }
            }
            
            // 读取并解析CSV文件
            const csvContent = fs.readFileSync(dataFile, 'utf8');
            const lines = csvContent.trim().split('\n');
            
            if (lines.length < 2) {
                return { success: true, data: [], total: 0, currentPage, pageSize: size };
            }
            
            // 解析CSV头
            const headers = lines[0].split(',');
            
            // 解析数据行
            let allData = [];
            for (let i = 1; i < lines.length; i++) {
                const values = this.parseCSVLine(lines[i]);
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
            const startIndex = (currentPage - 1) * size;
            const paginatedData = allData.slice(startIndex, startIndex + size);
            
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
            
            return {
                success: true,
                data: formattedData,
                total: total,
                currentPage: currentPage,
                pageSize: size
            };
        } catch (error) {
            log(`获取股票数据失败: ${error.message}`, 'error');
            return { success: false, error: 'Failed to fetch stock data' };
        }
    }

    // 获取股票历史数据
    async getStockHistory(code, currentPage, pageSize) {
        try {
            if (!code) {
                return { success: false, error: '股票代码不能为空' };
            }
            
            const page = parseInt(currentPage) || 1;
            const size = parseInt(pageSize) || 20;
            
            log(`获取股票历史数据请求: 股票代码=${code}, 页码=${page}, 每页大小=${size}`);
            
            // 检查数据目录是否存在
            const dataDir = path.join(__dirname, '../../../web/public/data/daily');
            if (!fs.existsSync(dataDir)) {
                log('数据目录不存在', 'error');
                return { success: false, error: '数据目录不存在' };
            }
            
            // 获取所有股票数据文件
            const files = fs.readdirSync(dataDir).filter(file => 
                file.startsWith('EastmoneyStockData_') && file.endsWith('.csv')
            );
            
            if (files.length === 0) {
                log('没有找到股票数据文件');
                return { success: true, data: [], total: 0, currentPage: 1, pageSize: size };
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
                    const headers = this.parseCSVLine(lines[0]);
                    
                    // 查找包含指定股票代码的行
                    for (let i = 1; i < lines.length; i++) {
                        const values = this.parseCSVLine(lines[i]);
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
            const startIndex = (page - 1) * size;
            const paginatedData = allHistoryData.slice(startIndex, startIndex + size);
            
            log(`获取股票历史数据成功: 股票代码=${code}, 总记录数=${total}`);
            
            return {
                success: true,
                data: paginatedData,
                total: total,
                currentPage: page,
                pageSize: size
            };
        } catch (error) {
            log(`获取股票历史数据失败: ${error.message}`, 'error');
            return { success: false, error: 'Failed to fetch stock history data' };
        }
    }

    // 批量获取股票K线数据
    async batchGetStockKline(pageSize, totalPages) {
        try {
            // 从查询参数获取配置，默认每页2个，共2页
            const size = parseInt(pageSize) || 2;
            const pages = parseInt(totalPages) || 2;
            
            log(`开始批量获取股票K线数据：共${pages}页，每页${size}个股票`);
            
            let allResults = [];
            let successCount = 0;
            let failureCount = 0;
            
            // 遍历每页
            for (let page = 1; page <= pages; page++) {
                // 获取当前页的股票列表
                const stockPageResult = await EastMoney.getStockPage(page, size);
                
                if (!stockPageResult || !stockPageResult.data || !stockPageResult.data.diff) {
                    log(`第 ${page} 页股票列表获取失败`);
                    failureCount += size;
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
                        // 获取当前股票的K线数据
                        const klineResult = await EastMoney.getStockKLines(stock, '');
                        
                        if (klineResult && klineResult.klines && klineResult.klines.length > 0) {
                            const klines = klineResult.klines;
                            log(`${stockCode}(${stockName})：${klines.length}条K线数据获取成功`);
                            
                            // 将数据保存到文件系统（和/api/stock-kline接口保持一致）
                            const stockDataDir = path.join(__dirname, '../../web/public/data/stock');
                            const codeDir = path.join(stockDataDir, stockCode);
                            
                            // 创建目录
                            if (!fs.existsSync(codeDir)) {
                                fs.mkdirSync(codeDir, { recursive: true });
                            }
                            
                            // 保存为单个文件
                            const file = path.join(codeDir, 'all.dat');
                            // 将JSON对象转换为CSV格式字符串
                            const klineStrings = klines.map(kline => 
                                `${kline.date},${kline.open},${kline.close},${kline.high},${kline.low},${kline.volume},${kline.amount},${kline.amplitude},${kline.changeRate},${kline.changeAmount},${kline.turnover}`
                            );
                            // 写入所有数据，使用\n分隔
                            fs.writeFileSync(file, klineStrings.join('\n'), 'utf8');
                            
                            // 保存股票基本信息
                            const stockInfo = { code: stockCode, market, name: stockName, klineCount: klines.length };
                            const companyDir = path.join(__dirname, '../../web/public/data/company');
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
                    const randomDelay = Math.floor(Math.random() * (3000 - 500)) + 500; // 500ms-3000ms
                    await new Promise(resolve => setTimeout(resolve, randomDelay));
                }
            }
            
            log(`批量获取股票K线数据完成: 成功 ${successCount} 个，失败 ${failureCount} 个`);
            
            return {
                success: true,
                message: `批量获取股票K线数据完成`,
                total: allResults.length,
                successCount,
                failureCount,
                data: allResults
            };
        } catch (error) {
            log(`批量获取股票K线数据失败: ${error.message}`, 'error');
            return { success: false, error: `批量获取股票K线数据失败: ${error.message}` };
        }
    }

    // CSV行解析函数（处理带引号的数据）
    parseCSVLine(line) {
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
}

module.exports = new StockService();
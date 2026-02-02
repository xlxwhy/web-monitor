const fs = require('fs');
const path = require('path');
const { log } = require('./monitor.js');

// 获取当前中国时间（UTC+8）的日期字符串，格式：YYYY-MM-DD
const getChinaDateString = () => {
    const now = new Date();
    const utc8Offset = 8 * 60 * 60 * 1000; // UTC+8偏移量（毫秒）
    const chinaTime = new Date(now.getTime() + utc8Offset);
    return chinaTime.toISOString().split('T')[0];
};

// 生成带日期后缀的已完成股票列表文件路径
const getCompletedStocksFilePath = () => {
    const dateStr = getChinaDateString();
    return path.join(__dirname, `../../temp/completed_stocks_${dateStr}.json`);
};

// 确保temp目录存在
const ensureTempDir = () => {
    const tempDir = path.dirname(getCompletedStocksFilePath());
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
};

// 读取已完成的股票列表
const readCompletedStocks = () => {
    ensureTempDir();
    const filePath = getCompletedStocksFilePath();
    if (!fs.existsSync(filePath)) {
        return new Set();
    }
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return new Set(JSON.parse(data));
    } catch (error) {
        log(`读取已完成股票列表失败: ${error.message}`, 'error');
        return new Set();
    }
};

// 保存已完成的股票列表
const saveCompletedStocks = (completedStocks) => {
    ensureTempDir();
    try {
        const filePath = getCompletedStocksFilePath();
        fs.writeFileSync(filePath, JSON.stringify([...completedStocks], null, 2), 'utf8');
        return true;
    } catch (error) {
        log(`保存已完成股票列表失败: ${error.message}`, 'error');
        return false;
    }
};

// 添加股票到已完成列表
const addToCompletedStocks = (stockCode, completedStocks) => {
    completedStocks.add(stockCode);
    saveCompletedStocks(completedStocks);
};

module.exports = {
    getChinaDateString,
    getCompletedStocksFilePath,
    ensureTempDir,
    readCompletedStocks,
    saveCompletedStocks,
    addToCompletedStocks
};

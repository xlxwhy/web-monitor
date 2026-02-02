const express = require('express');
const StockService = require('../service/StockService.js');
const { log } = require('../utils/monitor.js');

const router = express.Router();

// 获取股票历史K线数据接口
router.get('/stock-kline', async (req, res) => {
    try {
        const { stockCode, code, market, splitByYear } = req.query;
        const result = await StockService.getStockKline(stockCode, code, market, splitByYear);
        
        if (result.success) {
            res.json({
                success: true,
                message: `成功获取股票 ${result.data.code} 的历史K线数据`,
                data: result.data
            });
        } else {
            res.status(404).json({ error: result.error });
        }
    } catch (error) {
        log(`获取股票历史K线数据失败: ${error.message}`, 'error');
        res.status(500).json({ error: `获取股票历史K线数据失败: ${error.message}` });
    }
});

// 获取股票数据接口（支持分页）
router.get('/stock-data', async (req, res) => {
    try {
        const { page, pageSize, search, date } = req.query;
        const result = await StockService.getStockData(page, pageSize, search, date);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json({ error: result.error });
        }
    } catch (error) {
        log(`获取股票数据失败: ${error.message}`, 'error');
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// 获取股票历史数据的API
router.get('/stock-history', async (req, res) => {
    try {
        const { code, currentPage, pageSize } = req.query;
        const result = await StockService.getStockHistory(code, currentPage, pageSize);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        log(`获取股票历史数据失败: ${error.message}`, 'error');
        res.status(500).json({ error: 'Failed to fetch stock history data' });
    }
});

// 获取股票列表并逐个获取K线数据的批量接口
router.get('/batch-stock-kline', async (req, res) => {
    try {
        const { pageSize, totalPages } = req.query;
        const result = await StockService.batchGetStockKline(pageSize, totalPages);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        log(`批量获取股票K线数据失败: ${error.message}`, 'error');
        res.status(500).json({ error: `批量获取股票K线数据失败: ${error.message}` });
    }
});

// 通过分页分批获取所有股票的K线数据接口
router.get('/stock-kline/all', async (req, res) => {
    try {
        const { pageSize, totalPages } = req.query;
        const result = await StockService.batchGetStockKline(pageSize, totalPages);
        
        if (result.success) {
            res.json({
                success: true,
                message: `成功获取股票K线数据`,
                total: result.total,
                successCount: result.successCount,
                failureCount: result.failureCount,
                data: result.data
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        log(`分页获取股票K线数据失败: ${error.message}`, 'error');
        res.status(500).json({ error: `分页获取股票K线数据失败: ${error.message}` });
    }
});

module.exports = router;
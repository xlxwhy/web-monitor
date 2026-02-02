const stockService = require('../service/StockService.js');
const { log } = require('../utils/monitor.js');

class Spider {
    constructor() {
        this.stockService = stockService;
    }

    // 批量获取股票K线数据
    async batchGetStockKLines(pageSize = 10, totalPages = 2) {
        try {
            log('开始批量获取股票K线数据');
            log(`配置: 每页 ${pageSize} 个股票，总共 ${totalPages} 页`);
            
            // 直接调用StockService的batchGetStockKline方法
            const result = await this.stockService.batchGetStockKline(pageSize, totalPages);
            
            return result;
        } catch (error) {
            log(`批量获取股票K线数据失败: ${error.message}`, 'error');
            return {
                success: false,
                error: `批量获取股票K线数据失败: ${error.message}`
            };
        }
    }

    /**
     * 获取股票数据（基于StockService的getStockData方法）
     * @param {number} page - 当前页码
     * @param {number} pageSize - 每页数量
     * @param {string} search - 搜索关键词
     * @param {string} date - 数据日期（格式：YYYY-MM-DD）
     * @returns {Promise<Object>} 股票数据结果
     */
    async fetchStockData(page = 1, pageSize = 10, search = '', date = '') {
        try {
            log('开始获取股票数据');
            log(`配置: 页码 ${page}，每页 ${pageSize} 个股票`);
            if (search) {
                log(`搜索条件: ${search}`);
            }
            if (date) {
                log(`数据日期: ${date}`);
            }
            
            // 调用StockService的getStockData方法
            const result = await this.stockService.getStockData(page, pageSize, search, date);
            
            if (result.success) {
                log(`成功获取股票数据，共 ${result.total} 个股票，当前页 ${result.currentPage}/${Math.ceil(result.total / result.pageSize)}`);
            } else {
                log(`获取股票数据失败: ${result.error}`, 'error');
            }
            
            return result;
        } catch (error) {
            log(`获取股票数据失败: ${error.message}`, 'error');
            return { 
                success: false, 
                error: `获取股票数据失败: ${error.message}` 
            };
        }
    }
}

// 如果直接运行这个文件，则执行测试
if (require.main === module) {
    const spider = new Spider();
    
    // 测试批量获取股票K线数据（我们已经验证过这个功能可以正常工作）
    (async () => {
        console.log('=== 测试批量获取股票K线数据（每页10个，共2页）===');
        const result = await spider.batchGetStockKLines(10, 2);
        console.log(`结果: ${result.success ? '成功' : '失败'}`);
        if (result.success) {
            console.log(`成功获取: ${result.successCount} 个`);
            console.log(`失败获取: ${result.failedCount} 个`);
        } else {
            console.log(`错误信息: ${result.error}`);
        }
    })();
}

module.exports = Spider;
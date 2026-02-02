const stockService = require('../service/StockService.js');
const { log } = require('../utils/monitor.js');
// 从新文件导入已完成股票列表工具函数
const completedStocksUtils = require('../utils/completedStocksUtils.js');

class Spider {
    constructor() {
        this.stockService = stockService;
    }

    // 批量获取股票K线数据
    async batchGetStockKLines(pageSize = 10, totalPages = 2) {
        try {
            log('开始批量获取股票K线数据');
            log(`配置: 每页 ${pageSize} 个股票，总共 ${totalPages} 页`);
            
            // 读取已完成的股票列表
            const completedStocks = completedStocksUtils.readCompletedStocks();
            log(`已完成获取K线数据的股票数量: ${completedStocks.size}`);
            
            // 直接调用StockService的batchGetStockKline方法，并传入已完成列表进行过滤
            const result = await this.stockService.batchGetStockKline(pageSize, totalPages, completedStocks);
            
            // 输出更新后的已完成计数
            log(`批量获取完成，成功处理 ${result.successCount} 个股票，失败 ${result.failedCount || 0} 个`);
            const updatedCompletedStocks = completedStocksUtils.readCompletedStocks();
            log(`更新后已完成获取K线数据的股票总数: ${updatedCompletedStocks.size}`);
            
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
    
    // 解析命令行参数
    const args = process.argv.slice(2);
    let pageSize = 10; // 默认每页10个
    let totalPages = 1; // 默认共1页
    
    // 解析参数：--pageSize 或 -p，--totalPages 或 -t
    for (let i = 0; i < args.length; i++) {
        if ((args[i] === '--pageSize' || args[i] === '-p') && args[i + 1]) {
            pageSize = parseInt(args[i + 1]);
            i++;
        } else if ((args[i] === '--totalPages' || args[i] === '-t') && args[i + 1]) {
            totalPages = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--help' || args[i] === '-h') {
            console.log('使用方法: node Spider.js [选项]');
            console.log('选项:');
            console.log('  --pageSize, -p <数量>    每页股票数量 (默认: 10)');
            console.log('  --totalPages, -t <数量>   总共页数 (默认: 1)');
            console.log('  --help, -h               显示帮助信息');
            process.exit(0);
        }
    }
    
    // 验证参数有效性
    if (isNaN(pageSize) || pageSize <= 0) {
        console.error('错误: 每页数量必须是正数');
        process.exit(1);
    }
    if (isNaN(totalPages) || totalPages <= 0) {
        console.error('错误: 总共页数必须是正数');
        process.exit(1);
    }
    
    // 执行批量获取股票K线数据
    (async () => {
        console.log(`=== 批量获取股票K线数据（每页${pageSize}个，共${totalPages}页）===`);
        const result = await spider.batchGetStockKLines(pageSize, totalPages);
        console.log(`结果: ${result.success ? '成功' : '失败'}`);
        if (result.success) {
            console.log(`成功获取: ${result.successCount} 个`);
            console.log(`失败获取: ${result.failedCount || 0} 个`);
        } else {
            console.log(`错误信息: ${result.error}`);
        }
    })();
}

module.exports = Spider;
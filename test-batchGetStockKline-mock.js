const StockService = require('./src/service/StockService');
const EastMoney = require('./src/api/EastMoney');

// 保存原始方法
const originalGetStockPage = EastMoney.getStockPage;
const originalGetStockKLines = EastMoney.getStockKLines;

// 模拟数据
const mockStockPageData = {
    data: {
        diff: [
            { f12: '000001', f14: '平安银行', f13: '0' },
            { f12: '000002', f14: '万科A', f13: '0' }
        ]
    }
};

const mockKLineData = [
    '2023-01-01,10.00,10.50,9.80,10.30,1000000',
    '2023-01-02,10.35,10.80,10.20,10.70,1200000',
    '2023-01-03,10.75,11.00,10.60,10.90,1500000'
];

// 测试批量获取股票K线数据方法（使用模拟数据）
async function test_batchGetStockKline_withMock() {
    console.log('开始测试batchGetStockKline方法（使用模拟数据）...');
    
    try {
        // 替换为模拟方法
        EastMoney.getStockPage = async (page, size) => {
            console.log(`模拟调用getStockPage: page=${page}, size=${size}`);
            return mockStockPageData;
        };
        
        EastMoney.getStockKLines = async (stock, date) => {
            const stockCode = typeof stock === 'string' ? stock : stock.f12;
            console.log(`模拟调用getStockKLines: ${stockCode}`);
            return mockKLineData;
        };
        
        // 使用分页参数：2页，每页2个股票
        const pageSize = 2;
        const totalPages = 2;
        
        console.log(`测试参数：pageSize=${pageSize}, totalPages=${totalPages}`);
        const result = await StockService.batchGetStockKline(pageSize, totalPages);
        
        // 验证返回结果结构
        console.log('\n=== 测试结果 ===');
        console.log('请求状态:', result.success ? '成功' : '失败');
        console.log('总股票数:', result.total);
        console.log('成功获取:', result.successCount);
        console.log('获取失败:', result.failureCount);
        
        // 输出详细结果
        if (result.data && result.data.length > 0) {
            console.log('\n股票数据详情:');
            result.data.forEach((item, index) => {
                console.log(`${index + 1}. ${item.code}(${item.name}): ${item.success ? '✅ 成功' : '❌ 失败'}`);
                if (item.success) console.log(`   获取K线数量: ${item.klineCount}`);
            });
        }
        
        // 验证业务逻辑正确性
        if (result.success && 
            result.total === pageSize * totalPages && 
            result.successCount === pageSize * totalPages && 
            result.failureCount === 0) {
            console.log('\n✅ 测试通过：批量获取K线数据功能正常');
        } else {
            console.log('\n❌ 测试失败：返回结果不符合预期');
        }
        
    } catch (error) {
        console.error('\n测试过程中发生错误:', error.message);
        console.error('错误堆栈:', error.stack);
    } finally {
        // 恢复原始方法
        EastMoney.getStockPage = originalGetStockPage;
        EastMoney.getStockKLines = originalGetStockKLines;
    }
}

// 执行测试
test_batchGetStockKline_withMock();
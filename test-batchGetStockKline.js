const StockService = require('./src/service/StockService');

// 测试批量获取股票K线数据方法
async function test_batchGetStockKline() {
    console.log('开始测试batchGetStockKline方法...');
    
    try {
        // 使用分页参数：2页，每页2个股票（小规模测试）
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
                if (!item.success) console.log(`   原因: ${item.message}`);
            });
        }
        
        // 验证业务逻辑正确性
        if (result.success && result.total === pageSize * totalPages) {
            console.log('\n✅ 测试通过：批量获取K线数据功能正常');
        } else {
            console.log('\n❌ 测试失败：返回结果不符合预期');
        }
    } catch (error) {
        console.error('\n测试过程中发生错误:', error.message);
        console.error('错误堆栈:', error.stack);
    }
}

// 执行测试
test_batchGetStockKline();
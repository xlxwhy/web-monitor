const axios = require('axios');

// 测试/stock-kline/all接口
async function testStockKlineAll() {
    try {
        console.log('开始测试 /stock-kline/all 接口');
        
        // 使用用户要求的测试参数：2页，每页10个股票
        const response = await axios.get('http://localhost:3000/api/stock-kline/all', {
            params: {
                pageSize: 10,
                totalPages: 2
            }
        });
        
        console.log('接口响应状态:', response.status);
        console.log('接口响应数据:');
        console.log(JSON.stringify(response.data, null, 2));
        
        // 验证响应数据结构
        if (response.data.success) {
            console.log('\n✅ 测试通过！');
            console.log(`📊 总股票数: ${response.data.total}`);
            console.log(`✅ 成功获取: ${response.data.successCount} 个`);
            console.log(`❌ 获取失败: ${response.data.failureCount} 个`);
            
            // 验证每个股票的数据结构
            response.data.data.forEach((stock, index) => {
                console.log(`\n股票 ${index + 1}:`);
                console.log(`  代码: ${stock.code}`);
                console.log(`  名称: ${stock.name}`);
                console.log(`  市场: ${stock.market}`);
                console.log(`  状态: ${stock.success ? '成功' : '失败'}`);
                if (stock.success) {
                    console.log(`  K线数据条数: ${stock.klineCount}`);
                } else {
                    console.log(`  失败原因: ${stock.message}`);
                }
            });
        } else {
            console.log('\n❌ 测试失败:', response.data.error);
        }
    } catch (error) {
        console.log('\n❌ 测试失败:', error.message);
        if (error.response) {
            console.log('错误响应状态:', error.response.status);
            console.log('错误响应数据:', error.response.data);
        }
    }
}

// 运行测试
testStockKlineAll();

const axios = require('axios');

// 测试/batch-stock-kline接口（小批量测试）
async function test_batch_stock_kline_api_small() {
    console.log('开始测试/batch-stock-kline接口（小批量测试）...');
    
    try {
        // 测试参数：1页，每页2个股票
        const pageSize = 2;
        const totalPages = 1;
        
        console.log(`测试参数：pageSize=${pageSize}, totalPages=${totalPages}`);
        console.log(`请求URL：http://localhost:3000/api/batch-stock-kline?pageSize=${pageSize}&totalPages=${totalPages}`);
        
        // 发送请求
        const startTime = Date.now();
        const response = await axios.get(`http://localhost:3000/api/batch-stock-kline?pageSize=${pageSize}&totalPages=${totalPages}`);
        const endTime = Date.now();
        
        console.log(`\n=== 接口响应 ===`);
        console.log(`响应状态码: ${response.status}`);
        console.log(`响应时间: ${endTime - startTime}ms`);
        
        // 验证响应结构
        const data = response.data;
        console.log(`\n=== 响应数据 ===`);
        console.log('请求状态:', data.success ? '成功' : '失败');
        
        if (data.success) {
            console.log('总股票数:', data.total);
            console.log('成功获取:', data.successCount);
            console.log('获取失败:', data.failureCount);
            
            // 输出所有股票数据
            if (data.data && data.data.length > 0) {
                console.log('\n股票数据详情:');
                data.data.forEach((item, index) => {
                    console.log(`${index + 1}. ${item.code}(${item.name}): ${item.success ? '✅ 成功' : '❌ 失败'}`);
                    if (item.success && item.klineCount) {
                        console.log(`   K线数据数量: ${item.klineCount}`);
                    }
                    if (!item.success) {
                        console.log(`   失败原因: ${item.message}`);
                    }
                });
                
                console.log('\n✅ 小批量测试通过：接口可以正常工作');
            }
        } else {
            console.log('错误信息:', data.error);
            console.log('\n❌ 小批量测试失败：接口无法正常工作');
        }
        
    } catch (error) {
        console.error('\n测试过程中发生错误:');
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        } else if (error.request) {
            console.error('请求已发送但未收到响应:', error.request);
        } else {
            console.error('请求配置错误:', error.message);
        }
        console.log('\n❌ 小批量测试失败：接口无法正常工作');
    }
}

// 执行测试
test_batch_stock_kline_api_small();
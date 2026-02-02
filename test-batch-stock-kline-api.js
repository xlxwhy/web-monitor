const axios = require('axios');

// 测试/batch-stock-kline接口
async function test_batch_stock_kline_api() {
    console.log('开始测试/batch-stock-kline接口...');
    
    try {
        // 测试参数：前10页，每页10个股票
        const pageSize = 10;
        const totalPages = 10;
        
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
            
            // 输出部分成功的股票数据
            if (data.data && data.data.length > 0) {
                console.log('\n股票数据详情（前5条）:');
                const sampleData = data.data.slice(0, 5);
                sampleData.forEach((item, index) => {
                    console.log(`${index + 1}. ${item.code}(${item.name}): ${item.success ? '✅ 成功' : '❌ 失败'}`);
                    if (item.success && item.klineCount) {
                        console.log(`   K线数据数量: ${item.klineCount}`);
                    }
                    if (!item.success) {
                        console.log(`   失败原因: ${item.message}`);
                    }
                });
                
                // 统计成功和失败的数量
                const successItems = data.data.filter(item => item.success);
                const failedItems = data.data.filter(item => !item.success);
                console.log(`\n成功获取 ${successItems.length} 个股票的K线数据`);
                console.log(`获取失败 ${failedItems.length} 个股票的K线数据`);
            }
        } else {
            console.log('错误信息:', data.error);
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
    }
}

// 执行测试
test_batch_stock_kline_api();
const EastMoney = require('./src/api/EastMoney');

// 测试getStockKLines方法
async function test_getStockKLines() {
    console.log('开始测试getStockKLines方法...');
    
    try {
        // 先初始化EastMoney模块
        await EastMoney.init();
        console.log('EastMoney模块初始化完成');
        
        // 测试1: 默认参数（日线，前复权）
        console.log('\n=== 测试1: 默认参数（日线，前复权）===');
        const stockCode = '000001';
        console.log(`获取股票代码 ${stockCode} 的K线数据...`);
        
        // 调用getStockKLines方法
        const result = await EastMoney.getStockKLines(stockCode);
        
        console.log('测试结果:', result ? '成功' : '失败');
        console.log('基本信息:', {
            stockCode: result.stockCode,
            market: result.market,
            period: result.period,
            adjust: result.adjust,
            count: result.count
        });
        
        if (result.count > 0) {
            console.log('\n✅ K线数据获取成功! 共获取', result.count, '条数据');
            console.log('K线数据字段:', Object.keys(result.klines[0]));
        } else {
            console.log('❌ 未获取到K线数据');
        }
        
        // 测试2: 自定义参数（周线，不复权，限制10条数据）
        console.log('\n=== 测试2: 自定义参数（周线，不复权，限制10条数据）===');
        const result2 = await EastMoney.getStockKLines(stockCode, null, 102, 0, 10);
        
        console.log('测试结果:', result2 ? '成功' : '失败');
        console.log('基本信息:', {
            stockCode: result2.stockCode,
            market: result2.market,
            period: result2.period,
            adjust: result2.adjust,
            count: result2.count
        });
        
        if (result2.count > 0) {
            console.log('\n✅ 周线数据获取成功! 共获取', result2.count, '条数据');
        } else {
            console.log('❌ 未获取到周线数据');
        }
        
    } catch (error) {
        console.error('测试过程中发生错误:', error.message);
        console.error('错误堆栈:', error.stack);
    }
}

// 运行测试
test_getStockKLines();

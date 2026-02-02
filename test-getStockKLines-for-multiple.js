const EastMoney = require('./src/api/EastMoney');

// 测试获取股票列表并获取每个股票的K线数据
async function test_getStockListAndKLines() {
    console.log('开始测试获取股票列表并获取K线数据...');
    
    try {
        // 先初始化EastMoney模块
        await EastMoney.init();
        console.log('EastMoney模块初始化完成');
        
        // 获取第1页的20个股票
        const page = 1;
        const size = 20;
        console.log(`\n=== 获取第${page}页的${size}个股票 ===`);
        
        // 调用getStockPage方法获取股票列表
        const stockPageResult = await EastMoney.getStockPage(page, size);
        
        // 检查返回结果结构
        console.log('API返回结果结构:', {
            hasData: !!stockPageResult.data,
            hasDiff: !!stockPageResult.data?.diff,
            diffLength: stockPageResult.data?.diff?.length || 0
        });
        
        // 提取股票列表
        const stockList = stockPageResult.data?.diff || [];
        
        console.log(`获取到 ${stockList.length} 个股票`);
        console.log('股票列表:', stockList.map(stock => `${stock.f14} (${stock.f12})`));
        
        // 遍历股票列表，获取每个股票的K线数据
        for (let i = 0; i < stockList.length; i++) {
            const stock = stockList[i];
            console.log(`\n=== 获取股票 ${stock.f14} (${stock.f12}) 的K线数据 ===`);
            
            try {
                // 调用getStockKLines方法获取K线数据
                const kLineResult = await EastMoney.getStockKLines(stock);
                
                console.log('K线数据获取结果:', {
                    stockCode: kLineResult.stockCode,
                    market: kLineResult.market,
                    period: kLineResult.period,
                    adjust: kLineResult.adjust,
                    count: kLineResult.count
                });
                
                if (kLineResult.count > 0) {
                    console.log(`数据时间范围: 从 ${kLineResult.klines[0].date} 到 ${kLineResult.klines[kLineResult.klines.length - 1].date}`);
                    console.log(`最新收盘价: ${kLineResult.klines[kLineResult.klines.length - 1].close}`);
                    
                    // 显示最近3条K线数据
                    console.log('最近3条K线数据:');
                    const recentKLines = kLineResult.klines.slice(-3);
                    recentKLines.forEach((kLine, index) => {
                        console.log(`${index + 1}. 日期: ${kLine.date}, 开盘: ${kLine.open}, 收盘: ${kLine.close}, 最高: ${kLine.high}, 最低: ${kLine.low}`);
                    });
                } else {
                    console.log('未获取到K线数据');
                }
                
            } catch (error) {
                console.error(`获取股票 ${stock.f14} (${stock.f12}) 的K线数据失败:`, error.message);
            }
            
            // 添加适当的延迟，避免请求过于频繁
            if (i < stockList.length - 1) {
                console.log('等待1秒后继续获取下一个股票的K线数据...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log('\n=== 测试完成 ===');
        
    } catch (error) {
        console.error('测试过程中发生错误:', error.message);
        console.error('错误堆栈:', error.stack);
    }
}

// 运行测试
test_getStockListAndKLines();
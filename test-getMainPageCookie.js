const EastMoney = require('./src/api/EastMoney');

// 测试获取行情中心页面并保存cookie的方法
async function test_getMainPageCookie() {
    console.log('开始测试getMainPageCookie方法...');
    
    try {
        // 调用新添加的getMainPageCookie方法
        const result = await EastMoney.getMainPageCookie();
        
        console.log('测试结果:', result ? '成功' : '失败');
        
        // 测试调用getStockPage方法是否能正常获取股票数据（验证cookie是否有效）
        console.log('\n测试使用获取的cookie调用getStockPage方法...');
        const stockPageResult = await EastMoney.getStockPage(1, 5);
        
        if (stockPageResult && stockPageResult.data && stockPageResult.data.diff) {
            console.log('getStockPage调用成功，获取到', stockPageResult.data.diff.length, '条股票数据');
            console.log('第一条股票数据:', stockPageResult.data.diff[0]);
            console.log('\n结论：getMainPageCookie方法成功访问行情中心页面并保存了cookie信息，后续股票数据获取正常');
        } else {
            console.log('getStockPage调用失败或返回数据格式不正确');
        }
        
    } catch (error) {
        console.error('测试过程中发生错误:', error.message);
    }
}

// 运行测试
test_getMainPageCookie();

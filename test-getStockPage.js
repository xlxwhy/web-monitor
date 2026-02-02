// 测试 getStockPage 函数
const EastMoney = require('./src/api/EastMoney.js');

async function test_getStockPage() {
    try {
        console.log('开始测试 getStockPage 函数...');
        
        // 测试获取第一页，每页20条数据
        const page = 1;
        const size = 20;
        
        console.log(`调用 getStockPage(${page}, ${size})...`);
        const result = await EastMoney.getStockPage(page, size);
        
        console.log('测试结果：');
        console.log('=============================');
        console.log(`返回状态：${result?.rc}`);
        console.log(`返回消息：${result?.rt}`);
        console.log(`返回数据总条数：${result?.data?.total}`);
        console.log(`返回分页信息：页码=${result?.data?.pn}, 每页大小=${result?.data?.pz}`);
        console.log(`返回数据列表长度：${result?.data?.diff?.length || 0}`);
        
        if (result?.data?.diff?.length > 0) {
            console.log('\n第一条数据示例：');
            console.log(JSON.stringify(result.data.diff[0], null, 2));
        }
        
        console.log('\n测试完成！');
    } catch (error) {
        console.error('测试失败:', error);
    }
}

// 运行测试
test_getStockPage();
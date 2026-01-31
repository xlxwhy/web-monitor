// 东方财富股票数据接口测试逻辑

// 东方财富股票数据接口分页测试函数
async function testEastMoneyPagination(apiConfig, monitorApi, log) {
    try {
        // 简单测试策略：只测试2页
        const totalPagesToTest = 2;
        const currentPage = parseInt(apiConfig.params?.pn || '1');
        
        log(`东方财富股票数据接口 - 当前页: ${currentPage}, 计划测试总页数: ${totalPagesToTest}`);
        
        // 如果有更多页需要测试
        if (currentPage < totalPagesToTest) {
            log(`东方财富股票数据接口 - 准备查询第${currentPage + 1}页（测试模式）`);
            
            // 等待一段时间再查询下一页，避免接口限流
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 创建新的API配置，修改页码参数
            const nextPageConfig = JSON.parse(JSON.stringify(apiConfig));
            nextPageConfig.params = { ...nextPageConfig.params, pn: currentPage + 1 };
            
            // 查询下一页
            await monitorApi(nextPageConfig);
        } else if (currentPage === 1) {
            // 如果是第一页，直接查询第二页
            log(`东方财富股票数据接口 - 准备查询第2页（测试模式）`);
            
            // 等待一段时间再查询下一页，避免接口限流
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 创建新的API配置，修改页码参数
            const nextPageConfig = JSON.parse(JSON.stringify(apiConfig));
            nextPageConfig.params = { ...nextPageConfig.params, pn: 2 };
            
            // 查询下一页
            await monitorApi(nextPageConfig);
        }
    } catch (error) {
        log(`东方财富股票数据接口测试失败 - 错误: ${error.message}`, 'error');
    }
}

module.exports = {
    testEastMoneyPagination
};
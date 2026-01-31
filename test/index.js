// 测试主文件 - 集中管理所有测试逻辑

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

// 导出所有测试函数
module.exports = {
    testEastMoneyPagination
};

// 单独运行测试的功能
if (require.main === module) {
    // 引入主模块的必要功能
    const index = require('../src/index');
    const { monitorApi, log } = index;
    
    // 从配置文件获取API配置
    const config = require('../config/config.json');
    const eastmoneyApiConfig = config.apis.find(api => api.name === '东方财富股票数据');
    
    if (eastmoneyApiConfig) {
        log('开始单独运行东方财富股票数据接口测试...');
        testEastMoneyPagination(eastmoneyApiConfig, monitorApi, log)
            .then(() => {
                log('测试完成！');
                process.exit(0);
            })
            .catch(error => {
                log(`测试运行失败: ${error.message}`, 'error');
                process.exit(1);
            });
    } else {
        log('未找到东方财富股票数据接口配置', 'error');
        process.exit(1);
    }
}
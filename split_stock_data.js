const fs = require('fs');
const path = require('path');

// 读取CSV文件
const csvFile = path.join(__dirname, 'data', 'daily', 'EastmoneyStockData_2026-01-31.csv');
const stockDir = path.join(__dirname, 'data', 'stock');

fs.readFile(csvFile, 'utf8', (err, data) => {
    if (err) {
        console.error('读取CSV文件失败:', err);
        return;
    }

    // 解析CSV数据
    const lines = data.split('\n');
    if (lines.length < 2) {
        console.error('CSV文件数据不足');
        return;
    }

    const header = lines[0].trim();
    const stockData = {};

    // 处理每一行数据
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 分割CSV行（注意处理可能包含逗号的字段）
        const fields = line.split(',');
        const stockId = fields[0]; // f12字段是股票编号

        if (!stockId) continue;

        // 将数据按股票编号分组
        if (!stockData[stockId]) {
            stockData[stockId] = [header];
        }
        stockData[stockId].push(line);
    }

    // 将每组数据保存到独立文件
    let savedCount = 0;
    for (const [stockId, rows] of Object.entries(stockData)) {
        const stockFile = path.join(stockDir, `stock_${stockId}.csv`);
        const content = rows.join('\n');

        fs.writeFile(stockFile, content, 'utf8', (err) => {
            if (err) {
                console.error(`保存股票${stockId}数据失败:`, err);
            } else {
                savedCount++;
                console.log(`已保存股票${stockId}的数据`);
            }

            // 当所有文件都保存完成后输出总结
            if (savedCount === Object.keys(stockData).length) {
                console.log(`\n处理完成！共保存了${savedCount}只股票的数据到${stockDir}`);
            }
        });
    }
});
const fs = require('fs');
const path = require('path');

// 检查文件是否存在
const dataDate = '2026-02-01';
const dataFile = path.join(__dirname, 'web/public/data/daily', `EastmoneyStockData_${dataDate}.csv`);
console.log(`文件路径: ${dataFile}`);
console.log(`文件是否存在: ${fs.existsSync(dataFile)}`);

if (fs.existsSync(dataFile)) {
    // 读取文件的前几行
    const content = fs.readFileSync(dataFile, 'utf8');
    const lines = content.trim().split('\n');
    console.log(`文件行数: ${lines.length}`);
    if (lines.length > 0) {
        console.log(`第一行（表头）: ${lines[0]}`);
        if (lines.length > 1) {
            console.log(`第二行（数据）: ${lines[1]}`);
        }
    }
}
const fs = require('fs');
const path = require('path');

// 新的解析函数
function parseCSV(csvText) {
  // 处理被错误换行的CSV数据
  const lines = [];
  const headerLine = csvText.split('\n')[0].trim();
  const headers = headerLine.split(',');
  const expectedFields = headers.length;
  
  let currentLine = '';
  const allLines = csvText.split('\n');
  
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i].trim();
    if (!line) continue;
    
    if (currentLine) {
      // 合并行
      currentLine += line;
    } else {
      // 新行
      currentLine = line;
    }
    
    // 检查当前行是否以逗号结尾（表示被换行拆分）
    if (!currentLine.endsWith(',')) {
      // 不以逗号结尾，认为是完整行
      lines.push(currentLine);
      currentLine = '';
    }
  }
  
  // 如果还有未处理完的行，也添加进去
  if (currentLine) {
    lines.push(currentLine);
  }
  
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',');
    
    // 确保有足够的字段
    if (values.length < expectedFields) {
      console.warn(`行 ${i} 字段数不足: 预期 ${expectedFields}, 实际 ${values.length}`);
      continue;
    }
    
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : '';
    });
    
    // 处理不同文件的字段名差异
    row.code = row.f12 || row.f57 || '';
    row.name = row.f14 || row.f58 || '';
    
    data.push(row);
  }
  
  return data;
}

// 读取CSV文件并测试
const csvPath = path.join(__dirname, 'web/public/data/daily/EastmoneyStockData_2026-02-01.csv');
const csvText = fs.readFileSync(csvPath, 'utf8');

console.log('=== 测试新的解析逻辑 ===');
console.log('原始文件行数:', csvText.split('\n').length);

const parsedData = parseCSV(csvText);
console.log('解析后的数据行数:', parsedData.length);

// 检查是否有重复数据
const codes = new Set();
parsedData.forEach(row => {
  codes.add(row.code);
});
console.log('唯一股票代码数:', codes.size);

// 显示前20个解析结果
console.log('\n前20条解析结果:');
parsedData.slice(0, 20).forEach((row, index) => {
  console.log(`${index + 1}. ${row.code} ${row.name}`);
});

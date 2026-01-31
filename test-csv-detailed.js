const fs = require('fs');
const path = require('path');

// 读取CSV文件
const csvPath = path.join(__dirname, 'web/public/data/daily/EastmoneyStockData_2026-02-01.csv');
const csvText = fs.readFileSync(csvPath, 'utf8');

// 分析CSV文件
console.log('=== CSV文件分析 ===');
console.log('原始文件大小:', csvText.length, '字符');

// 按行分割
const allLines = csvText.split('\n');
console.log('原始行数:', allLines.length);

// 获取标题行
const headerLine = allLines[0].trim();
const headers = headerLine.split(',');
const expectedFields = headers.length;
console.log('标题行:', headerLine);
console.log('预期字段数:', expectedFields);

// 分析数据行
console.log('\n=== 数据行分析 ===');
let totalLines = 0;
let completeLines = 0;
let incompleteLines = 0;

// 统计完整行和不完整行
for (let i = 1; i < allLines.length; i++) {
  const line = allLines[i].trim();
  if (!line) continue;
  totalLines++;
  
  const commaCount = (line.match(/,/g) || []).length;
  if (commaCount >= expectedFields - 1) {
    completeLines++;
  } else {
    incompleteLines++;
    if (incompleteLines <= 5) {
      console.log(`不完整行 ${i}: ${line}`);
      if (i < allLines.length - 1) {
        console.log(`  下一行: ${allLines[i + 1].trim()}`);
      }
    }
  }
}

console.log(`\n数据行统计:`);
console.log(`  总数据行: ${totalLines}`);
console.log(`  完整行: ${completeLines}`);
console.log(`  不完整行: ${incompleteLines}`);

// 测试修复后的解析逻辑
console.log('\n=== 测试解析逻辑 ===');
function parseCSV(csvText) {
  const lines = [];
  const headerLine = csvText.split('\n')[0].trim();
  const headers = headerLine.split(',');
  const expectedFields = headers.length;
  
  let currentLine = '';
  const allLines = csvText.split('\n');
  
  // 用于调试的计数器
  let mergeCount = 0;
  let skippedLines = 0;
  
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i].trim();
    if (!line) {
      skippedLines++;
      continue;
    }
    
    if (currentLine) {
      // 合并行
      currentLine += line;
      mergeCount++;
    } else {
      // 新行
      currentLine = line;
    }
    
    // 检查当前行的字段数是否匹配
    const commaCount = (currentLine.match(/,/g) || []).length;
    
    if (commaCount >= expectedFields - 1) {
      // 字段数足够，添加到结果中
      lines.push(currentLine);
      currentLine = '';
    }
  }
  
  // 如果还有未处理完的行，也添加进去
  if (currentLine) {
    lines.push(currentLine);
  }
  
  console.log(`\n解析过程统计:`);
  console.log(`  合并的行数: ${mergeCount}`);
  console.log(`  跳过的空行: ${skippedLines}`);
  console.log(`  处理后的总行数: ${lines.length}`);
  
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',');
    
    // 调试：检查字段数
    if (values.length !== expectedFields) {
      console.log(`\n警告：行 ${i} 的字段数不匹配`);
      console.log(`  预期: ${expectedFields}, 实际: ${values.length}`);
      console.log(`  行内容: ${line}`);
      // 继续处理，不跳过
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

const parsedData = parseCSV(csvText);
console.log(`\n最终解析结果:`);
console.log(`  成功解析的数据行数: ${parsedData.length}`);

// 检查是否有重复数据
const codes = new Set();
let duplicateCount = 0;
parsedData.forEach(row => {
  if (codes.has(row.code)) {
    duplicateCount++;
  } else {
    codes.add(row.code);
  }
});
console.log(`  唯一股票代码数: ${codes.size}`);
console.log(`  重复数据行数: ${duplicateCount}`);

// 显示前20个解析结果
console.log('\n前20条解析结果:');
parsedData.slice(0, 20).forEach((row, index) => {
  console.log(`${index + 1}. ${row.code} ${row.name}`);
});

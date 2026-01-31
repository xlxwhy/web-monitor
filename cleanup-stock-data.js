const fs = require('fs');
const path = require('path');

// 数据目录
const stockDir = path.join(__dirname, 'web/public/data/stock');

// 创建日志目录
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// 日志记录函数
function log(message, level = 'info') {
    // 使用中国时区格式化时间
    const timestamp = new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(new Date());
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(path.join(logsDir, 'cleanup.log'), logMessage);
}

// CSV行解析函数（处理带引号的数据）
function parseCSVLine(line) {
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // 处理转义的引号 ""
                currentValue += '"';
                i += 2;
            } else {
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            // 分隔符
            values.push(currentValue);
            currentValue = '';
            i++;
        } else {
            currentValue += char;
            i++;
        }
    }
    
    // 添加最后一个值
    values.push(currentValue);
    
    return values;
}

// 清理单个股票文件的重复数据
function cleanupStockFile(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.trim().split('\n');
        
        if (lines.length < 2) {
            // 文件只有标题行或空文件，无需清理
            return 0;
        }
        
        const headers = parseCSVLine(lines[0]);
        const dateIndex = headers.indexOf('date');
        
        if (dateIndex === -1) {
            log(`文件 ${path.basename(filePath)} 中未找到日期字段`, 'warning');
            return 0;
        }
        
        const uniqueRows = new Map(); // 使用Map来存储唯一行，键为日期
        uniqueRows.set('header', lines[0]); // 保留标题行
        
        // 从第二行开始处理数据行
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = parseCSVLine(line);
            const date = values[dateIndex];
            
            if (date) {
                // 只保留每个日期的最后一条记录（最新数据）
                uniqueRows.set(date, line);
            }
        }
        
        // 计算移除的重复记录数
        const removedCount = lines.length - uniqueRows.size;
        
        if (removedCount > 0) {
            // 将唯一行写回文件，保持标题行在第一行
            const newContent = Array.from(uniqueRows.values()).join('\n') + '\n';
            fs.writeFileSync(filePath, newContent);
            log(`文件 ${path.basename(filePath)} 已清理，移除 ${removedCount} 条重复记录`);
        }
        
        return removedCount;
    } catch (error) {
        log(`清理文件 ${path.basename(filePath)} 失败: ${error.message}`, 'error');
        return 0;
    }
}

// 主函数
function main() {
    log('开始清理股票数据文件中的重复日期数据...');
    
    try {
        // 检查股票数据目录是否存在
        if (!fs.existsSync(stockDir)) {
            log('股票数据目录不存在: ' + stockDir, 'error');
            return;
        }
        
        // 获取所有CSV文件
        const files = fs.readdirSync(stockDir)
            .filter(file => file.endsWith('.csv'))
            .map(file => path.join(stockDir, file));
        
        log(`找到 ${files.length} 个股票数据文件`);
        
        // 清理每个文件
        let totalRemoved = 0;
        for (const file of files) {
            totalRemoved += cleanupStockFile(file);
        }
        
        log(`清理完成！总共移除 ${totalRemoved} 条重复记录`);
    } catch (error) {
        log(`清理过程中发生错误: ${error.message}`, 'error');
    }
}

// 执行主函数
main();
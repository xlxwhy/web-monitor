# Web Monitor

一个基于Node.js和Express的接口监控系统，用于定期监听接口获取数据并记录监控结果。

## 功能特性

- 支持配置多个API进行监控
- 基于cron表达式的灵活调度
- 记录接口响应时间、状态码和响应数据
- 提供健康检查接口
- 提供监控数据查询接口
- 日志记录功能

## 技术栈

- Node.js
- Express
- Axios (HTTP请求)
- node-cron (定时任务)

## 安装与运行

### 安装依赖

```bash
npm install
```

### 配置API监控

编辑 `config/config.json` 文件，添加需要监控的API配置：

```json
{
  "apis": [
    {
      "name": "示例API",
      "url": "https://api.example.com/data",
      "method": "GET",
      "cron": "*/5 * * * *",
      "timeout": 5000,
      "headers": {},
      "params": {},
      "data": {}
    }
  ]
}
```

配置说明：
- `name`: API名称
- `url`: API地址
- `method`: 请求方法 (GET, POST, PUT, DELETE等)
- `cron`: 定时任务表达式 (例如：`*/5 * * * *` 表示每5分钟执行一次)
- `timeout`: 请求超时时间 (毫秒)
- `headers`: 请求头
- `params`: URL参数
- `data`: 请求体数据

### 启动服务

```bash
npm start
```

服务默认启动在 http://localhost:3000

## API接口

### 健康检查

```
GET /health
```

返回服务状态和监控的API列表。

### 获取监控数据

```
GET /monitor-data?date=2023-10-01
```

参数：
- `date`: 可选，指定日期 (格式：YYYY-MM-DD)，默认当天

返回指定日期的监控数据。

## 日志

监控日志和数据存储在 `logs` 目录下：
- `monitor.log`: 系统日志
- `monitor_data_YYYY-MM-DD.json`: 每日监控数据

## 开发

### 项目结构

```
web-monitor/
├── config/
│   └── config.json      # 配置文件
├── logs/               # 日志目录
├── index.js            # 主程序
├── package.json        # 项目配置
└── README.md           # 项目说明
```

### 添加新功能

1. 编辑 `index.js` 添加新功能
2. 更新配置文件（如果需要）
3. 重启服务

## 部署

### 环境变量

- `PORT`: 服务端口 (默认：3000)

### 生产环境运行

使用PM2等进程管理工具运行：

```bash
npm install -g pm2
pm run build
pm run start:prod
```

## 许可证

ISC
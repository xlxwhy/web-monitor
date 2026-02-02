# Tushare 股票数据获取工具

基于tushare库开发的股票数据获取工具，提供常用的股票数据接口，支持分页获取、K线数据、基本信息等功能。

## 功能特性

1. **当天股票数据**：支持分页获取当天所有股票的交易数据
2. **股票K线数据**：获取指定股票的K线数据，支持多种周期（日线、周线、月线、分钟线等）
3. **股票基本信息**：获取所有股票的基本信息，包括名称、行业、上市日期等
4. **批量K线数据**：基于所有股票信息逐个获取K线数据，支持批量处理

## 安装依赖

```bash
# 安装tushare库
pip3 install tushare

# 安装其他依赖（如果需要）
pip3 install pandas numpy
```

## 获取Tushare API Token

使用本工具需要先在tushare官网注册账号并获取API密钥：

1. 访问 https://tushare.pro/register 注册账号
2. 登录后，在 "个人中心" -> "接口TOKEN" 页面获取您的API密钥
3. 将API密钥填入 `config.py` 文件中的 `TUSHARE_TOKEN` 变量

## 使用方法

### 1. 基本使用

```python
from tushare_stock_data import TushareStockData
from config import TUSHARE_TOKEN

# 初始化
stock_data = TushareStockData(TUSHARE_TOKEN)
```

### 2. 获取当天股票数据（分页）

```python
# 获取第1页，每页50条数据
daily_data = stock_data.get_daily_stocks(page=1, page_size=50)

# 获取指定日期的数据
daily_data = stock_data.get_daily_stocks(trade_date='20240520', page=1, page_size=100)
```

### 3. 获取指定股票K线数据

```python
# 获取平安银行（000001.SZ）近30天的日线数据
kline_data = stock_data.get_stock_kline(ts_code='000001.SZ', freq='D')

# 获取中国平安（601318.SH）近7天的5分钟线数据
kline_data = stock_data.get_stock_kline(
    ts_code='601318.SH', 
    start_date='20240513', 
    end_date='20240520', 
    freq='5MIN'
)
```

### 4. 获取所有股票基本信息

```python
# 获取所有股票基本信息
basic_data = stock_data.get_all_stock_basic()

# 获取深交所股票基本信息
sz_stocks = stock_data.get_all_stock_basic(exchange='SZSE')
```

### 5. 批量获取所有股票K线数据

```python
# 批量获取所有股票的近30天日线数据
all_kline_data = stock_data.get_all_stocks_kline(freq='D', batch_size=50)

# 获取指定日期范围内的周线数据
all_kline_data = stock_data.get_all_stocks_kline(
    start_date='20240101', 
    end_date='20240520', 
    freq='W',
    batch_size=30
)
```

## API 说明

### `TushareStockData(token)`
- **参数**：`token` - tushare API密钥
- **功能**：初始化tushare连接

### `get_daily_stocks(page=1, page_size=100, trade_date=None)`
- **参数**：
  - `page` - 页码，默认第1页
  - `page_size` - 每页大小，默认100
  - `trade_date` - 交易日期，格式YYYYMMDD，默认当天
- **返回**：股票交易数据DataFrame

### `get_stock_kline(ts_code, start_date=None, end_date=None, freq='D')`
- **参数**：
  - `ts_code` - 股票代码，格式如'000001.SZ'或'600000.SH'
  - `start_date` - 开始日期，格式YYYYMMDD，默认30天前
  - `end_date` - 结束日期，格式YYYYMMDD，默认当天
  - `freq` - 周期，默认'D'（日线），可选值：'1MIN', '5MIN', '15MIN', '30MIN', '60MIN', 'D', 'W', 'M'
- **返回**：K线数据DataFrame

### `get_all_stock_basic(exchange=None)`
- **参数**：`exchange` - 交易所，可选'SSE'（上交所）、'SZSE'（深交所）、'BJ'（北交所）
- **返回**：股票基本信息DataFrame

### `get_all_stocks_kline(start_date=None, end_date=None, freq='D', batch_size=50)`
- **参数**：
  - `start_date` - 开始日期，格式YYYYMMDD，默认30天前
  - `end_date` - 结束日期，格式YYYYMMDD，默认当天
  - `freq` - 周期，默认'D'（日线）
  - `batch_size` - 每批次处理股票数量，防止请求过于频繁
- **返回**：所有股票K线数据的字典，key为股票代码，value为K线数据DataFrame

## 注意事项

1. **API调用限制**：tushare有API调用次数限制，免费用户有一定的请求额度限制，请合理使用
2. **数据更新时间**：当天数据通常在收盘后更新
3. **股票代码格式**：需要使用tushare格式的股票代码，如'000001.SZ'（深交所）或'600000.SH'（上交所）
4. **网络连接**：确保网络连接正常，避免频繁请求导致IP被限制
5. **错误处理**：工具内置了错误处理机制，当API调用失败时会返回空DataFrame

## 示例运行

在 `tushare_stock_data.py` 文件中包含了完整的使用示例，您可以：

1. 在 `config.py` 中设置您的API密钥
2. 直接运行 `python3 tushare_stock_data.py` 查看示例输出

## 数据字段说明

### 股票交易数据（daily）
- `ts_code` - 股票代码
- `trade_date` - 交易日期
- `open` - 开盘价
- `high` - 最高价
- `low` - 最低价
- `close` - 收盘价
- `pre_close` - 昨收价
- `change` - 涨跌额
- `pct_chg` - 涨跌幅（%）
- `vol` - 成交量（手）
- `amount` - 成交额（千元）

### 股票基本信息（stock_basic）
- `ts_code` - 股票代码
- `symbol` - 股票代码（不含交易所）
- `name` - 股票名称
- `area` - 所在地区
- `industry` - 所属行业
- `fullname` - 股票全称
- `enname` - 英文名称
- `market` - 市场类型（主板/中小板/创业板/科创板）
- `exchange` - 交易所代码
- `curr_type` - 交易货币
- `list_status` - 上市状态
- `list_date` - 上市日期
- `delist_date` - 退市日期

## 技术支持

如果您在使用过程中遇到问题，可以：

1. 查看tushare官方文档：https://tushare.pro/document/2
2. 检查API密钥是否正确
3. 确认网络连接正常
4. 查看错误日志获取详细信息

## 许可证

本工具基于MIT许可证开源。

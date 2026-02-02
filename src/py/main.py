import yfinance as yf
import pandas as pd
import time
from datetime import datetime, timedelta
import sys

class ChinaStockData:
    """
    基于yfinance的中国股票数据获取工具
    支持获取上交所(.SS)和深交所(.SZ)股票数据
    """
    
    def __init__(self, retry_times=3, retry_delay=5):
        self.base_url = "https://finance.yahoo.com"
        self.retry_times = retry_times
        self.retry_delay = retry_delay
    
    def format_stock_code(self, stock_code, market="SZ"):
        """
        格式化中国股票代码为yfinance可识别的格式
        
        Args:
            stock_code: 股票代码，如"000001"
            market: 市场类型，"SH"表示上交所，"SZ"表示深交所
            
        Returns:
            格式化后的股票代码，如"000001.SS"或"000001.SZ"
        """
        if market.upper() == "SH":
            return f"{stock_code}.SS"
        else:
            return f"{stock_code}.SZ"
    
    def get_stock_data(self, stock_code, market="SZ", period="1y", interval="1d"):
        """
        获取股票历史K线数据
        
        Args:
            stock_code: 股票代码
            market: 市场类型，"SH"或"SZ"
            period: 时间周期，如"1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"
            interval: 数据间隔，如"1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"
            
        Returns:
            pandas.DataFrame: 包含日期、开盘价、最高价、最低价、收盘价、成交量等信息的DataFrame
        """
        formatted_code = self.format_stock_code(stock_code, market)
        for attempt in range(self.retry_times):
            try:
                stock = yf.Ticker(formatted_code)
                data = stock.history(period=period, interval=interval)
                return data
            except Exception as e:
                if attempt < self.retry_times - 1:
                    print(f"获取股票{stock_code}数据失败 (尝试 {attempt+1}/{self.retry_times}): {str(e)}")
                    print(f"等待{self.retry_delay}秒后重试...")
                    time.sleep(self.retry_delay)
                else:
                    print(f"获取股票{stock_code}数据失败: {str(e)}")
                    return None
    
    def get_stock_info(self, stock_code, market="SZ"):
        """
        获取股票基本信息
        
        Args:
            stock_code: 股票代码
            market: 市场类型，"SH"或"SZ"
            
        Returns:
            dict: 包含股票基本信息的字典
        """
        formatted_code = self.format_stock_code(stock_code, market)
        for attempt in range(self.retry_times):
            try:
                stock = yf.Ticker(formatted_code)
                return stock.info
            except Exception as e:
                if attempt < self.retry_times - 1:
                    print(f"获取股票{stock_code}基本信息失败 (尝试 {attempt+1}/{self.retry_times}): {str(e)}")
                    print(f"等待{self.retry_delay}秒后重试...")
                    time.sleep(self.retry_delay)
                else:
                    print(f"获取股票{stock_code}基本信息失败: {str(e)}")
                    return None
    
    def get_realtime_quote(self, stock_code, market="SZ"):
        """
        获取股票实时行情数据
        
        Args:
            stock_code: 股票代码
            market: 市场类型，"SH"或"SZ"
            
        Returns:
            dict: 包含实时行情信息的字典
        """
        formatted_code = self.format_stock_code(stock_code, market)
        for attempt in range(self.retry_times):
            try:
                stock = yf.Ticker(formatted_code)
                data = stock.history(period="1d", interval="1m")
                if not data.empty:
                    latest_data = data.iloc[-1]
                    return {
                        "datetime": latest_data.name.strftime("%Y-%m-%d %H:%M:%S"),
                        "open": latest_data["Open"],
                        "high": latest_data["High"],
                        "low": latest_data["Low"],
                        "close": latest_data["Close"],
                        "volume": latest_data["Volume"]
                    }
                return None
            except Exception as e:
                if attempt < self.retry_times - 1:
                    print(f"获取股票{stock_code}实时行情失败 (尝试 {attempt+1}/{self.retry_times}): {str(e)}")
                    print(f"等待{self.retry_delay}秒后重试...")
                    time.sleep(self.retry_delay)
                else:
                    print(f"获取股票{stock_code}实时行情失败: {str(e)}")
                    return None
    
    def get_dividends(self, stock_code, market="SZ", period="1y"):
        """
        获取股票分红数据
        
        Args:
            stock_code: 股票代码
            market: 市场类型，"SH"或"SZ"
            period: 时间周期
            
        Returns:
            pandas.DataFrame: 包含分红信息的DataFrame
        """
        formatted_code = self.format_stock_code(stock_code, market)
        for attempt in range(self.retry_times):
            try:
                stock = yf.Ticker(formatted_code)
                return stock.dividends
            except Exception as e:
                if attempt < self.retry_times - 1:
                    print(f"获取股票{stock_code}分红数据失败 (尝试 {attempt+1}/{self.retry_times}): {str(e)}")
                    print(f"等待{self.retry_delay}秒后重试...")
                    time.sleep(self.retry_delay)
                else:
                    print(f"获取股票{stock_code}分红数据失败: {str(e)}")
                    return None
    
    def get_financials(self, stock_code, market="SZ"):
        """
        获取股票财务报表数据
        
        Args:
            stock_code: 股票代码
            market: 市场类型，"SH"或"SZ"
            
        Returns:
            tuple: (利润表, 资产负债表, 现金流量表)
        """
        formatted_code = self.format_stock_code(stock_code, market)
        for attempt in range(self.retry_times):
            try:
                stock = yf.Ticker(formatted_code)
                income_stmt = stock.financials
                balance_sheet = stock.balance_sheet
                cash_flow = stock.cashflow
                return income_stmt, balance_sheet, cash_flow
            except Exception as e:
                if attempt < self.retry_times - 1:
                    print(f"获取股票{stock_code}财务数据失败 (尝试 {attempt+1}/{self.retry_times}): {str(e)}")
                    print(f"等待{self.retry_delay}秒后重试...")
                    time.sleep(self.retry_delay)
                else:
                    print(f"获取股票{stock_code}财务数据失败: {str(e)}")
                    return None, None, None
    
    def get_multiple_stocks(self, stock_list, market="SZ", period="1y", interval="1d"):
        """
        批量获取多只股票数据
        
        Args:
            stock_list: 股票代码列表，如["000001", "000002"]
            market: 市场类型，"SH"或"SZ"
            period: 时间周期
            interval: 数据间隔
            
        Returns:
            dict: 包含各股票数据的字典，键为股票代码
        """
        result = {}
        for stock_code in stock_list:
            data = self.get_stock_data(stock_code, market, period, interval)
            if data is not None:
                result[stock_code] = data
            # 添加额外延迟避免频繁请求
            time.sleep(1)
        return result

    def get_tushare_recommendation(self):
        """
        推荐使用tushare库获取中国股票数据
        tushare是专门为中国股票市场设计的Python库，提供更全面、更准确的数据
        """
        print("\n=== 推荐使用tushare库 ===")
        print("yfinance对中国股票数据的支持有限，且容易遇到访问限制问题")
        print("推荐使用tushare库获取中国股票数据，它是专门为中国股票市场设计的")
        print("安装方法: pip install tushare")
        print("详细使用文档: https://tushare.pro/document/2")
        print("需要注册获取token: https://tushare.pro/register?reg=446838")


# 示例用法
if __name__ == "__main__":
    # 创建股票数据获取实例
    stock_api = ChinaStockData(retry_times=2, retry_delay=3)
    
    print("=== 中国股票数据获取工具 ===")
    print("使用yfinance库获取中国股票数据")
    print("支持上交所(.SS)和深交所(.SZ)股票")
    print()
    
    # 显示使用说明
    print("=== 功能列表 ===")
    print("1. get_stock_data(stock_code, market='SZ', period='1y', interval='1d') - 获取历史K线数据")
    print("2. get_stock_info(stock_code, market='SZ') - 获取股票基本信息")
    print("3. get_realtime_quote(stock_code, market='SZ') - 获取实时行情")
    print("4. get_dividends(stock_code, market='SZ', period='1y') - 获取分红数据")
    print("5. get_financials(stock_code, market='SZ') - 获取财务报表")
    print("6. get_multiple_stocks(stock_list, market='SZ', period='1y', interval='1d') - 批量获取股票数据")
    print()
    
    # 简化测试: 只测试一个功能，避免触发访问限制
    print("=== 测试示例 (简化版) ===")
    print("由于yfinance对中国股票数据访问有限制，以下测试可能会失败")
    print("建议使用tushare库获取更稳定的中国股票数据")
    print()
    
    # 示例1: 获取单只股票的历史数据
    print("1. 获取股票'000001'(平安银行)的历史数据:")
    stock_data = stock_api.get_stock_data("000001", market="SZ", period="7d", interval="1d")
    if stock_data is not None:
        print(stock_data.head())
    else:
        print("获取失败，请稍后重试或使用tushare库")
    
    # 显示tushare推荐
    stock_api.get_tushare_recommendation()
import tushare as ts
import pandas as pd
import time
import logging
from config import TUSHARE_TOKEN

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TushareStockData:
    """
    基于tushare库的股票数据获取工具
    功能包括：
    1. 获取当天所有股票的数据，支持分页获取
    2. 获取指定某个股票的K线数据
    3. 获取所有股票的基本信息
    4. 基于所有股票信息逐个获取K线数据
    """
    
    def __init__(self, token):
        """
        初始化tushare
        :param token: tushare的API密钥，需要在 https://tushare.pro/ 注册获取
        """
        self.token = token
        ts.set_token(token)
        self.pro = ts.pro_api()
        logger.info("TushareStockData初始化成功")
    
    def get_daily_stocks(self, page=1, page_size=100, trade_date=None):
        """
        获取当天所有股票的数据，支持分页获取
        :param page: 页码，默认第1页
        :param page_size: 每页大小，默认100
        :param trade_date: 交易日期，格式YYYYMMDD，默认当天
        :return: 股票数据DataFrame
        """
        try:
            if not trade_date:
                # 如果没有指定日期，使用当天
                trade_date = pd.Timestamp.today().strftime('%Y%m%d')
            
            # 计算偏移量
            offset = (page - 1) * page_size
            
            # 获取数据
            df = self.pro.daily(trade_date=trade_date, offset=offset, limit=page_size)
            logger.info(f"成功获取{trade_date}第{page}页股票数据，共{len(df)}条")
            return df
        except Exception as e:
            logger.error(f"获取当天股票数据失败: {e}")
            return pd.DataFrame()
    
    def get_stock_kline(self, ts_code, start_date=None, end_date=None, freq='D'):
        """
        获取指定某个股票的K线数据
        :param ts_code: 股票代码，格式如'000001.SZ'或'600000.SH'
        :param start_date: 开始日期，格式YYYYMMDD，默认30天前
        :param end_date: 结束日期，格式YYYYMMDD，默认当天
        :param freq: 周期，默认'D'（日线），可选'1MIN'（1分钟）、'5MIN'（5分钟）、'15MIN'（15分钟）、'30MIN'（30分钟）、'60MIN'（60分钟）、'D'（日线）、'W'（周线）、'M'（月线）
        :return: K线数据DataFrame
        """
        try:
            if not start_date:
                # 默认30天前
                start_date = (pd.Timestamp.today() - pd.Timedelta(days=30)).strftime('%Y%m%d')
            if not end_date:
                end_date = pd.Timestamp.today().strftime('%Y%m%d')
            
            # 日线数据使用daily接口
            if freq == 'D':
                df = self.pro.daily(ts_code=ts_code, start_date=start_date, end_date=end_date)
            # 其他周期数据使用mc_bar接口
            else:
                df = ts.pro_bar(ts_code=ts_code, start_date=start_date, end_date=end_date, freq=freq)
            
            logger.info(f"成功获取{ts_code}从{start_date}到{end_date}的{freq}K线数据，共{len(df)}条")
            return df
        except Exception as e:
            logger.error(f"获取{ts_code}K线数据失败: {e}")
            return pd.DataFrame()
    
    def get_all_stock_basic(self, exchange=None):
        """
        获取所有股票的基本信息
        :param exchange: 交易所，可选'SSE'（上交所）、'SZSE'（深交所）、'BJ'（北交所），默认所有
        :return: 股票基本信息DataFrame
        """
        try:
            df = self.pro.stock_basic(exchange=exchange, list_status='L')
            logger.info(f"成功获取所有股票基本信息，共{len(df)}条")
            return df
        except Exception as e:
            logger.error(f"获取股票基本信息失败: {e}")
            return pd.DataFrame()
    
    def get_all_stocks_kline(self, start_date=None, end_date=None, freq='D', batch_size=50):
        """
        基于所有股票信息逐个获取K线数据
        :param start_date: 开始日期，格式YYYYMMDD，默认30天前
        :param end_date: 结束日期，格式YYYYMMDD，默认当天
        :param freq: 周期，默认'D'（日线）
        :param batch_size: 每批次处理股票数量，防止请求过于频繁
        :return: 所有股票K线数据的字典，key为股票代码，value为K线数据DataFrame
        """
        try:
            # 获取所有股票基本信息
            stock_basic = self.get_all_stock_basic()
            if stock_basic.empty:
                logger.warning("没有获取到股票基本信息，无法批量获取K线数据")
                return {}
            
            all_kline_data = {}
            total_stocks = len(stock_basic)
            
            for i, (_, stock) in enumerate(stock_basic.iterrows()):
                ts_code = stock['ts_code']
                
                # 获取K线数据
                kline_df = self.get_stock_kline(ts_code, start_date, end_date, freq)
                
                if not kline_df.empty:
                    all_kline_data[ts_code] = kline_df
                
                # 显示进度
                logger.info(f"处理进度: {i+1}/{total_stocks}，股票代码: {ts_code}")
                
                # 每处理batch_size个股票，休息一下，避免请求过于频繁
                if (i + 1) % batch_size == 0 and i + 1 < total_stocks:
                    logger.info(f"已处理{i+1}个股票，休息3秒...")
                    time.sleep(3)
            
            logger.info(f"批量获取K线数据完成，成功获取{len(all_kline_data)}/{total_stocks}个股票的K线数据")
            return all_kline_data
        except Exception as e:
            logger.error(f"批量获取K线数据失败: {e}")
            return {}

if __name__ == "__main__":
    # 使用示例
    # 注意：需要先在 https://tushare.pro/ 注册获取API密钥，并填入 config.py 文件中
    
    if TUSHARE_TOKEN == "your_token_here":
        print("请先在 https://tushare.pro/ 注册获取API密钥，并填入 config.py 文件中的 TUSHARE_TOKEN")
        print("注册完成后，在 '个人中心' -> '接口TOKEN' 可以找到您的API密钥")
    else:
        # 初始化
        stock_data = TushareStockData(TUSHARE_TOKEN)
        
        # 1. 获取当天股票数据（分页）
        print("\n=== 1. 获取当天股票数据（第1页，每页50条） ===")
        daily_data = stock_data.get_daily_stocks(page=1, page_size=50)
        if not daily_data.empty:
            print(daily_data.head())
        
        # 2. 获取指定股票K线数据
        print("\n=== 2. 获取指定股票K线数据（平安银行，近30天日线） ===")
        kline_data = stock_data.get_stock_kline(ts_code='000001.SZ', freq='D')
        if not kline_data.empty:
            print(kline_data.head())
        
        # 3. 获取所有股票基本信息
        print("\n=== 3. 获取所有股票基本信息（前10条） ===")
        basic_data = stock_data.get_all_stock_basic()
        if not basic_data.empty:
            print(basic_data.head(10))
        
        # 4. 基于所有股票信息逐个获取K线数据（仅前5个股票作为示例）
        print("\n=== 4. 基于所有股票信息逐个获取K线数据（仅前5个股票） ===")
        # 获取前5个股票代码
        if not basic_data.empty:
            sample_stocks = basic_data.head(5)['ts_code'].tolist()
            
            # 创建一个临时的基本信息DataFrame，只包含前5个股票
            temp_basic = basic_data[basic_data['ts_code'].isin(sample_stocks)]
            
            # 批量获取K线数据
            batch_kline_data = {}
            for ts_code in sample_stocks:
                kline_df = stock_data.get_stock_kline(ts_code, freq='D')
                if not kline_df.empty:
                    batch_kline_data[ts_code] = kline_df
                time.sleep(1)  # 休息1秒，避免请求过于频繁
            
            # 打印结果
            for ts_code, df in batch_kline_data.items():
                print(f"\n股票代码: {ts_code}，K线数据条数: {len(df)}")
                print(df.head(3))
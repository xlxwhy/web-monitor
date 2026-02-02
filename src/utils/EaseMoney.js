
let fs = require('fs')
var argv = require('minimist')(process.argv.slice(2));
const axios = require('axios');

// const AxiosRequest =require("../../http/AxiosRequest.js") 
const FileHelper =require("../file/FileHelper.js") 
const Helper =require("./Helper.js") 

const PATH="./data"


async function getIndustryList(page,size){ 
    let result=await getIndustryPage(page, size)
    if(!result || !result.data) return []; 
    return result.data.diff
}

// 调用验证码检查接口，避免被服务器hand up
async function checkUser() {
    const checkUserUrl = 'https://i.eastmoney.com/websitecaptcha/api/checkuser?callback=wsc_checkuser';
    
    // 使用随机User-Agent
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/126.0'
    ];
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    // 生成随机的Cookie值
    const randomCookie = `qgqp_b_id=${generateRandomString(32)}; st_nvi=${generateRandomString(20)}; websitepoptg_api_time=${Date.now()}; nid18=${generateRandomString(32)}; nid18_create_time=${Date.now()}; gviem=${generateRandomString(20)}; gviem_create_time=${Date.now()}; st_si=${Math.floor(Math.random() * 1000000000000)}; fullscreengg=1; fullscreengg2=1; p_origin=https%3A%2F%2Fpassport2.eastmoney.com; mtp=1; sid=${Math.floor(Math.random() * 100000000)}; vtpst=|; st_asi=delete; st_sn=${Math.floor(Math.random() * 100)}; st_psi=${Date.now()}-${Math.floor(Math.random() * 1000000000000)}-${Math.floor(Math.random() * 1000000000)}; st_pvi=${Math.floor(Math.random() * 100000000000000)}; st_sp=${formatDate(new Date())}%20${formatTime(new Date())}; st_inirUrl=https%3A%2F%2Fwww.baidu.com%2Flink`;
    
    try {
        await axios.get(checkUserUrl, {
            headers: {
                'accept': '*/*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'script',
                'sec-fetch-mode': 'no-cors',
                'sec-fetch-site': 'same-site',
                'cookie': randomCookie,
                'Referer': 'https://quote.eastmoney.com/center/gridlist.html',
                'User-Agent': randomUserAgent,
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'DNT': '1'
            },
            timeout: 30000,
            // 使用keep-alive并设置合理的参数
            httpAgent: new (require('http').Agent)({ 
                keepAlive: true,
                maxSockets: 5,
                timeout: 30000
            }),
            httpsAgent: new (require('https').Agent)({ 
                keepAlive: true,
                maxSockets: 5,
                timeout: 30000,
                rejectUnauthorized: true
            })
        });
        console.log('验证码检查接口调用成功');
    } catch (error) {
        console.warn('验证码检查接口调用失败，但继续执行后续请求:', error.message);
        // 即使验证码检查失败，也继续执行后续请求
    }
}

// 生成随机字符串
function generateRandomString(length) {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 格式化日期为YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 格式化时间为HH:MM:SS
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// 使用axios发送请求的通用方法，包含重试机制和反爬虫策略
async function fetchWithRetry(url, retryCount = 0, maxRetries = 5) {
    // 首先调用验证码检查接口
    await checkUser();
    
    // 添加随机延迟避免请求过于频繁（3-8秒）
    const randomDelay = Math.floor(Math.random() * 5000) + 3000;
    await Helper.sleep(randomDelay);
    
    // 随机User-Agent列表
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/126.0',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    ];
    
    // 随机选择User-Agent
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    // 生成随机的Cookie值
    const randomCookie = `qgqp_b_id=${generateRandomString(32)}; st_nvi=${generateRandomString(20)}; websitepoptg_api_time=${Date.now()}; nid18=${generateRandomString(32)}; nid18_create_time=${Date.now()}; gviem=${generateRandomString(20)}; gviem_create_time=${Date.now()}; st_si=${Math.floor(Math.random() * 1000000000000)}; fullscreengg=1; fullscreengg2=1; p_origin=https%3A%2F%2Fpassport2.eastmoney.com; mtp=1; sid=${Math.floor(Math.random() * 100000000)}; vtpst=|; st_asi=delete; st_sn=${Math.floor(Math.random() * 100)}; st_psi=${Date.now()}-${Math.floor(Math.random() * 1000000000000)}-${Math.floor(Math.random() * 1000000000)}; st_pvi=${Math.floor(Math.random() * 100000000000000)}; st_sp=${formatDate(new Date())}%20${formatTime(new Date())}; st_inirUrl=https%3A%2F%2Fwww.baidu.com%2Flink`;
    
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': randomUserAgent,
                'Referer': 'https://quote.eastmoney.com/',
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Connection': 'keep-alive',
                'DNT': '1',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'cookie': randomCookie,
                'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site'
            },
            timeout: 90000, // 增加超时时间到90秒
            // 使用keep-alive并设置合理的参数
            httpAgent: new (require('http').Agent)({ 
                keepAlive: true,
                maxSockets: 5,
                timeout: 90000
            }),
            httpsAgent: new (require('https').Agent)({ 
                keepAlive: true,
                maxSockets: 5,
                timeout: 90000,
                rejectUnauthorized: true
            }),
            // 允许重定向
            maxRedirects: 5
        });
        return response;
    } catch (error) {
        let errorMessage = error.message;
        if (error.response) {
            errorMessage = `服务器返回错误状态码: ${error.response.status} - ${error.response.statusText}`;
        } else if (error.request) {
            errorMessage = `未收到服务器响应: ${error.message}`;
        }
        
        // 重试机制，增加重试次数和延迟时间
        if (retryCount < maxRetries) {
            const retryDelay = Math.pow(2, retryCount) * 3000 + Math.floor(Math.random() * 2000); // 指数退避，从3秒开始
            await Helper.sleep(retryDelay);
            return fetchWithRetry(url, retryCount + 1, maxRetries);
        } else {
            throw new Error(errorMessage);
        }
    }
}

async function getIndustryPage(page,size){ 
    TIMESTAMP=new Date().getTime()
    CB='jQuery1124012455371791067993_'+TIMESTAMP 
    ORDER=1
    url='http://19.push2.eastmoney.com/api/qt/clist/get'
    url+='?cb='+CB+'&pn='+page+'&pz='+size+'&po='+ORDER+'&_='+TIMESTAMP
    url+='&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&wbp2u=|0|0|0|web&fid=f3&fs=m:90+t:2+f:!50'
    url+="&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f26,f22,f33,f11,f62,f128,f136,f115,f152,f124,f107,f104,f105,f140,f141,f207,f208,f209,f222"
    eval("function "+CB+"(data){return data;}");
    const response = await fetchWithRetry(url);
    return eval(response.data);
}

async function getIndustryKLines(code,fromDate){ 
    TIMESTAMP=new Date().getTime()
    CB='jQuery35106590144496053485_'+TIMESTAMP
    SECID="90."+code
    START=fromDate?fromDate:"0"
    url='http://50.push2his.eastmoney.com/api/qt/stock/kline/get'
    url+='?cb='+CB
    url+='&secid='+SECID
    url+='&ut=fa5fd1943c7b386f172d6893dbfba10b'
    url+='&fields1=f1%2Cf2%2Cf3%2Cf4%2Cf5%2Cf6&fields2=f51%2Cf52%2Cf53%2Cf54%2Cf55%2Cf56%2Cf57%2Cf58%2Cf59%2Cf60%2Cf61'
    url+="&klt=101&fqt=1"
    url+='&beg=0&end=20500101&lmt=1000000&_='+TIMESTAMP

    eval("function "+CB+"(data){return data;}");
    const response = await fetchWithRetry(url);
    let result=eval(response.data);
    if(result&& result.data && result.data.klines) {
        let klines=[]
        result.data.klines.forEach(e=>{
            klines.push(e)
        })
        console.log("获取"+code+"共"+klines.length+"个klines");
        return klines
    }else{
        return [];
    }
}




async function getNationHolderList(pages){    
    let nationData=[]
    for (let cti = 0; cti < pages; cti++) {
        let page=cti+1
        await Helper.sleep(parseInt(Math.random()*800))
        let nationResult=await getNationHolderPage(page)
        if(nationResult && nationResult.data){
            nationData.push(...nationResult.data)
        }
    }
    return nationData
}

async function getNationHolderPage(page,size){   
    let url='https://data.hexin.cn/gjd/team/type/3/page/'+page+'/'
    const response = await fetchWithRetry(url);
    return response.data;
}



async function getStockList(page,size){ 
    let result=await getStockPage(page, size)
    if(!result || !result.data) return []; 
    return result.data.diff
}


async function getStockPage(page,size){
    const num=parseInt(Math.random()*50)
    timestamp=new Date().getTime()
    cb='jQuery112405355366022981742_'+timestamp 
    order=1
    url='http://'+num+'.push2.eastmoney.com/api/qt/clist/get'
    url+='?cb='+cb+'&pn='+page+'&pz='+size+'&po='+order+'&_='+timestamp
    url+='&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&wbp2u=|0|0|0|web'
    url+="&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048"
    url+="&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152"
    eval("function "+cb+"(data){return data;}");
    const response = await fetchWithRetry(url);
    return eval(response.data);
}


/**
   kline: 
   "2022-12-30,15.50,17.42,17.42,15.42,1735005,2883635635.00,12.63,9.97,1.58,63.48"
    日期, 开盘, 收盘, 最高, 最低, 成交量, 成交额，振幅, 涨跌幅, 涨跌额, 换手率
    date, open,close, max, min, deal_num, deal_amount, amplitude, final_amp, final_amp_amount, turnover
 */

// 安全的JSONP解析方法
function parseJsonp(jsonpString) {
    try {
        // 去除开头和结尾的空白字符
        const trimmedResponse = jsonpString.trim();
        
        // 寻找第一个左括号和最后一个右括号
        const startIndex = trimmedResponse.indexOf('(');
        const endIndex = trimmedResponse.lastIndexOf(')');
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            const jsonString = trimmedResponse.substring(startIndex + 1, endIndex);
            return JSON.parse(jsonString);
        } else {
            throw new Error('JSONP response format error');
        }
    } catch (parseError) {
        throw new Error(`JSONP解析失败: ${parseError.message}`);
    }
}

// 获取股票K线数据 - 支持股票代码字符串参数
async function getStockKLines(stockOrCode, fromDate) {
    try {
        // 处理参数：支持stock对象或股票代码字符串
        let stockCode;
        let market;
        
        if (typeof stockOrCode === 'string') {
            // 如果是字符串，直接使用作为股票代码
            stockCode = stockOrCode;
            // 根据股票代码判断市场（6开头是沪市，其他是深市）
            market = stockCode.startsWith('6') ? '1' : '0';
        } else {
            // 如果是对象，使用f12作为股票代码，f13作为市场
            stockCode = stockOrCode.f12;
            market = stockOrCode.f13;
        }
        
        // 生成随机参数
        const num = parseInt(Math.random() * 50);
        const TIMESTAMP = new Date().getTime();
        const CB = 'jQuery' + Math.floor(Math.random() * 10000000000) + '_' + TIMESTAMP;
        const SECID = `${market}.${stockCode}`;
        // 减少请求数据量，只请求最近5年的数据
        const START = fromDate ? fromDate : '20200101';
        const END = '20250101';
        
        // 尝试使用https协议
        const protocol = Math.random() > 0.5 ? 'https' : 'http';
        
        // 构建URL - 使用更简单的参数组合
        const url = `${protocol}://${num}.push2his.eastmoney.com/api/qt/stock/kline/get`
            + `?cb=${CB}`
            + `&secid=${SECID}`
            + `&ut=fa5fd1943c7b386f172d6893dbfba10b`
            + '&fields1=f1,f2,f3,f4,f5,f6'
            + '&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61'
            + `&klt=101&fqt=1`
            + `&beg=${START}&end=${END}`
            + `&lmt=10000`
            + `&_=${TIMESTAMP}`;
        
        // 发送请求并安全解析JSONP响应
        const response = await fetchWithRetry(url);
        const result = parseJsonp(response.data);
        
        if (result && result.data && result.data.klines) {
            return result.data.klines;
        } else {
            return [];
        }
    } catch (error) {
        console.error(`获取股票K线数据失败: ${error.message}`);
        throw error;
    }
}


async function fetchData(type, startPage, pages, size, fromDate){
    let codes=[]
    console.log("fetch",type, startPage, pages, size);
    //page
    for (let index = startPage; index < startPage+pages; index++) {
        //stocks
        let page=index+1
        let list=(type=="Stock")?await getStockList(page, size) : await getIndustryList(page, size) 
        if(list && list.length){
            console.log("获取到",list.length,"个",type,"数据, 当前页="+page,",总页数=", pages,"页");
        }else{
            console.log("没有"+type+"数据, page="+page);
            continue;
        }

        for(let ei=0;ei<list.length;ei++){
            try {
                let e=list[ei];
                //random time
                await Helper.sleep(parseInt(Math.random()*10))
                //klines
                let klines=(type=="Stock")?await getStockKLines(e,fromDate) : await getIndustryKLines(e.f12,fromDate) 
                let data={code:e.f12,name:e.f14,market:e.f13,klines:klines}
                toFiles([data])
                //
                codes.push(data.code)
            } catch (error) {
                console.error(error)
            }
        }
        console.log(" next page!");
    }
    return codes
}



function toFiles(data, splitByYear = false){
    data.forEach(e => {
        //
        const codeFolder=PATH+"/stock/spider/klines/"+e.code
        if(!fs.existsSync(codeFolder)) { fs.mkdirSync(codeFolder); } 
        
        if (splitByYear) {
            // save by year
            let lastValue=""
            for (let index = 0; index < e.klines.length; index++) {
                const kline = e.klines[index];
                const klineDate=kline.split(",")[0];
                const klineYear=klineDate.substr(0,4) 
                const file=codeFolder+"/"+klineYear+".dat"
                let isChange=(lastValue!=klineYear);
                if(isChange) {
                    FileHelper.write(file, kline, "utf8", false)  
                } else{
                    FileHelper.append(file, "\n"+kline)
                }
                lastValue=klineYear
            }
        } else {
            // save all to one file
            const file=codeFolder+"/all.dat"
            // Write header line first
            FileHelper.write(file, e.klines[0], "utf8", false)
            // Append remaining lines
            for (let index = 1; index < e.klines.length; index++) {
                FileHelper.append(file, "\n"+e.klines[index])
            }
        }
        let path=PATH+"/company/"+e.code+".json"
        e.klines=[]
        FileHelper.write(path, JSON.stringify(e, null, 2), "utf8", true)  
    });
}


function getPages(total,size){
    return parseInt(total/size)+((total%size==0)?0:1)
}
 



module.exports = {
    getStockPage,
    getPages,
    fetchData,
    getStockKLines
}

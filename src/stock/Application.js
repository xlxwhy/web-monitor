
let fs = require('fs')
var args = require('minimist')(process.argv.slice(2));
let argv = process.argv

const AxiosRequest = require("../http/AxiosRequest.js")
const FileHelper = require("../file/FileHelper.js")
const Helper = require("../utils/Helper.js")

const PATH = "./data"


/**
   kline: 
   "2022-12-30,15.50,17.42,17.42,15.42,1735005,2883635635.00,12.63,9.97,1.58,63.48"
    日期, 开盘, 收盘, 最高, 最低, 成交量, 成交额，振幅, 涨跌幅, 涨跌额, 换手率
    date, open,close, max, min, deal_num, deal_amount, amplitude, final_amp, final_amp_amount, turnover
 */

async function getStockKLines(stock, fromDate) {
    const num = parseInt(Math.random() * 50)
    TIMESTAMP = new Date().getTime()
    CB = 'jsonp' + TIMESTAMP
    SECID = stock.f13 + "." + stock.f12
    START = fromDate ? fromDate : "0"
    url = 'http://' + num + '.push2his.eastmoney.com/api/qt/stock/kline/get'
    url += '?fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61'
    url += "&beg=" + START + "&end=20500101&ut=fa5fd1943c7b386f172d6893dbfba10b&rtntype=6&secid=" + SECID + "&klt=101&fqt=1"
    url += '&cb=' + CB

    eval("function " + CB + "(data){return data;}");
    let result = eval(await AxiosRequest.get(url))
    if (result && result.data && result.data.klines) {
        process.stdout.write(SECID + "|")
        return result.data.klines
    } else {
        return [];
    }
}


const ROOT = __dirname + "/../.."

const TARGET = "d:/ndev/temp/stock_prediction-based-on-lstm-and-transformer"


async function main() {
    const start = Date.now();

    let companyFolder = ROOT + "/data/company"
    let targetFolder = TARGET + "/stock_daily/kline/V00001"

    let cmd = argv[2]
    let codes = argv[3] ? argv[3].split(",") : []

    switch (cmd) {
        case "fetch":
            for (let index = 0; index < codes.length; index++) {
                const code = codes[index];
                let company = JSON.parse(FileHelper.read(companyFolder + "/" + code + ".json", true));
                let klines = await getStockKLines({ f13: company.market, f12: company.code }, null)
                let file = targetFolder + "/train-" + code + ".csv"
                if (klines && klines.length > 0) {
                    let content=klines.join("\n") 
                    FileHelper.write(file, content)
                }
            }
            break;
        default:
            console.log("Not supported cmd[" + cmd + "]");
            break;
    }


    console.log("spend: ", Date.now() - start, " ms")

}


main()









let fs = require('fs')
var argv = require('minimist')(process.argv.slice(2));

const AxiosRequest =require("../http/AxiosRequest.js") 
const FileHelper =require("../file/FileHelper.js") 
const Helper =require("../utils/Helper.js") 

const PATH="./data"


async function getIndustryList(page,size){ 
    let result=await getIndustryPage(page, size)
    if(!result || !result.data) return []; 
    return result.data.diff
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
    return eval(await AxiosRequest.get(url) )
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
    let result=eval(await AxiosRequest.get(url)) 
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
    return await AxiosRequest.get(url)
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
    return eval(await AxiosRequest.get(url) )
}


/**
   kline: 
   "2022-12-30,15.50,17.42,17.42,15.42,1735005,2883635635.00,12.63,9.97,1.58,63.48"
    日期, 开盘, 收盘, 最高, 最低, 成交量, 成交额，振幅, 涨跌幅, 涨跌额, 换手率
    date, open,close, max, min, deal_num, deal_amount, amplitude, final_amp, final_amp_amount, turnover
 */

async function getStockKLines(stock, fromDate){ 
    const num=parseInt(Math.random()*50)
    TIMESTAMP=new Date().getTime()
    CB='jsonp'+TIMESTAMP
    SECID=stock.f13+"."+stock.f12
    START=fromDate?fromDate:"0"
    url='http://'+num+'.push2his.eastmoney.com/api/qt/stock/kline/get'
    url+='?fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61'
    url+="&beg="+START+"&end=20500101&ut=fa5fd1943c7b386f172d6893dbfba10b&rtntype=6&secid="+SECID+"&klt=101&fqt=1"
    url+='&cb='+CB

    eval("function "+CB+"(data){return data;}");
    let result=eval(await AxiosRequest.get(url)) 
    if(result&& result.data && result.data.klines) {
        process.stdout.write(SECID+"|")
        return result.data.klines
    }else{
        return [];
    }
}


async function fetchData(type, startPage, pages, size, fromDate){
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
            } catch (error) {
                console.error(error)
            }
        }
        console.log(" next page!");
    }
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

async function main(){
    const start=Date.now();
    const today=Helper.formatDate()
    let size=20
    let startPage=0
    let result, pages


    // fromDate(15天前的当年1号)
    // 必须整年获取数据
    let fromDate;
    if(argv["append-klines"]=="true"){ 
        const date=new Date(Date.now()-15*24*3600*1000)
        fromDate=date.getFullYear()+"0101"
    }

    // local
    if(argv["local"]=="true"){
        // fetch Stock
        result=await getStockPage(1, 20) 
        pages=getPages(result.data.total, size)
        await fetchData("Stock", startPage, pages, 20, fromDate);
 
 
        // fetch Industry
        result=await getIndustryPage(1, 1) 
        pages=getPages(result.data.total, size)
        await fetchData("Industry", startPage, pages, size);
 
        
        // fetch nation holder
        let nationPages=30
        let nationData=await getNationHolderList(nationPages)
        let file="./data/temp/nation-"+today+".dat"
        FileHelper.write(file, JSON.stringify(nationData,null,2))
        Helper.config(file,"spider","nation")
 
    }


    // github
    if(argv["github"]=="true"){
        try {            
            // fetch Stock
            result=await getStockPage(1, 1) 
            pages=getPages(result.data.total, size)
            await fetchData("Stock", startPage, pages, size, fromDate);
        } catch (error) {
            console.log("fetch Stock error!");
        }

        try {
            // fetch Industry
            result=await getIndustryPage(1, 1)
            pages=getPages(result.data.total, size)
            await fetchData("Industry", startPage, pages, size, fromDate);
        } catch (error) {
            console.log("fetch Industry error!");
        }

        try {
            // fetch nation holder
            let nationPages=30
            let nationData=await getNationHolderList(nationPages)
            let file="./data/stock/spider/nation/nation-"+today+".json"
            FileHelper.write(file, JSON.stringify(nationData,null,2))
            Helper.config(file,"spider","nation")
        } catch (error) {
            console.log("fetch nation holder error!");
        }
    }

    console.log("spend: ",Date.now()-start, " ms")

}


main()
     






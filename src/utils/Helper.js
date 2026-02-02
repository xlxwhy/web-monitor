const ROOT=__dirname+"/../.."
const lodash=require("lodash")


const FileHelper =require("../file/FileHelper.js") 

 
module.exports = {
    avg(...list) {
        return lodash.sum(list)/list.length
    },

    avgList(list, start, end, field) {
        let sum=0;
        for (let i = start; i < end; i++) { 
            sum+=Number(list[i][field])
        }
        return sum/(end-start)
    },

    formatDate(date) {
        var date =date?date: new Date();
        var year = date.getFullYear();
        var month = date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1;
        var day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
        return year +""+ month +""+ day;
    },

    sleep(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms)
        })
    },

    config(value, key1, key2, key3){
        let configPath=ROOT+"/data/stock/stock.json"
        let config=JSON.parse(FileHelper.read(configPath));

        //read config
        if(!value) return config;

        //write config
        if(!key2){ 
            config[key1]=value ; 
            FileHelper.write(configPath, JSON.stringify(config, null, 2))
            return  
        }
 
        if(!config[key1]){ config[key1]={} }
        if(!key3){ 
            config[key1][key2]=value ; 
            FileHelper.write(configPath, JSON.stringify(config, null, 2))
            return  
        }

        if(!config[key1][key2]){ config[key1][key2]={} }
        config[key1][key2][key3]=value

        FileHelper.write(configPath, JSON.stringify(config, null, 2))

    }
}
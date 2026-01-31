const axios = require('axios');

async function testAPI() {
    try {
        const url = 'https://push2.eastmoney.com/api/qt/clist/get';
        const params = {
            np: 1,
            fltt: 1,
            invt: 2,
            cb: `jQuery331000000000000038416_${Date.now()}`,
            fs: 'm:0+t:6+f:!2,m:0+t:80+f:!2,m:1+t:2+f:!2,m:1+t:23+f:!2,m:0+t:81+s:262144+f:!2',
            fields: 'f12,f13,f14,f1,f2,f4,f3,f152,f5,f6,f7,f15,f18,f16,f17,f10,f8,f9,f23',
            fid: 'f12',
            pn: 1,
            pz: 100,
            po: 0,
            dect: 1,
            ut: 'fa5fd1943c7b386f172d6893dbfba10b',
            wbp2u: '|0|0|0|web',
            _: Date.now()
        };

        const response = await axios.get(url, {
            params: params,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Referer': 'https://quote.eastmoney.com/center/gridlist.html',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 30000
        });

        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        } else if (error.request) {
            console.error('No response received:', error.request);
        }
    }
}

testAPI();
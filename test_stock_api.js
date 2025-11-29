const axios = require('axios');

async function testZhituApi() {
  try {
    const ZHITU_API_TOKEN = 'C8FEB6BA-970C-4616-BDEC-1826F1BA2CCD';
    const ZHITU_API_URL = `https://api.zhituapi.com/hs/list/all?token=${ZHITU_API_TOKEN}`;
    
    console.log('正在调用智兔API...');
    const response = await axios.get(ZHITU_API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    console.log('API调用成功，返回数据长度:', response.data.length);
    
    // 查找000651股票
    const stock = response.data.find(stock => stock.dm === '000651');
    console.log('查找000651股票结果:', stock);
    
    // 打印前10个股票，看看数据格式
    console.log('前10个股票:', response.data.slice(0, 10));
    
  } catch (error) {
    console.error('API调用失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testZhituApi();

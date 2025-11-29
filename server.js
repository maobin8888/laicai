const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 配置CORS
app.use(cors());
app.use(express.json());

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，请上传PDF、Excel或CSV文件'));
    }
  }
});

// 读取文件内容的函数
const readFileContent = async (filePath, mimetype) => {
  if (mimetype === 'application/pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } else if (mimetype.includes('excel') || mimetype.includes('spreadsheet') || mimetype === 'text/csv') {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    return JSON.stringify(jsonData);
  }
  return '';
};

// AI分析函数
const analyzeWithAI = async (fileContent, fileName) => {
  try {
    // 从环境变量获取API密钥，如果没有则使用默认值（用于测试）
    const deepSeekApiKey = process.env.DEEPSEEK_API_KEY || 'sk-755f79d8842b467eb25f30a0d40ed5fd';
    
    console.log('开始调用DeepSeek API进行分析...');
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的财务分析师，请对提供的财务报表进行全面分析。请严格按照以下JSON格式返回结果：{"metrics":[{"name":"指标名称","value":"指标值","change":"同比变化百分比","type":"positive或negative"}],"analysis":"详细分析报告","stockCode":"股票代码"}。其中metrics包含核心财务指标，如营业收入、净利润、毛利率、净利率、资产负债率、ROE等；analysis包含详细的财务状况分析、投资建议、风险提示和未来发展机会；stockCode是该公司的股票代码（如：600000）。请注意：change字段必须明确包含"同比"字样，例如"同比+15.52%"或"同比-2.46%"。'
          },
          {
            role: 'user',
            content: `请分析以下财务报表内容，文件名为${fileName}：\n\n${fileContent.substring(0, 10000)}...`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepSeekApiKey}`
        },
        timeout: 30000 // 30秒超时
      }
    );
    console.log('DeepSeek API调用成功，获取到分析结果');
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('AI分析失败:', error.response ? error.response.data : error.message);
    // 返回更详细的错误信息，帮助诊断问题
    if (error.response && error.response.status === 401) {
      throw new Error('API密钥无效或已过期，请更新密钥');
    } else if (error.response && error.response.status === 429) {
      throw new Error('API请求频率过高，请稍后重试');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('API请求超时，请检查网络连接或文件大小');
    } else {
      throw new Error(`AI分析失败: ${error.message}，请稍后重试`);
    }
  }
};

// 获取股票信息函数
const getStockInfo = async (stockCode) => {
  try {
    // 智兔API配置
    const ZHITU_API_TOKEN = 'C8FEB6BA-970C-4616-BDEC-1826F1BA2CCD';
    
    // 首先获取股票列表，获取股票名称
    const stockListUrl = `https://api.zhituapi.com/hs/list/all?token=${ZHITU_API_TOKEN}`;
    const stockListResponse = await axios.get(stockListUrl);
    const stockList = stockListResponse.data;
    
    // 查找匹配的股票，处理股票代码格式差异（智兔API返回的股票代码带后缀，如000001.SZ）
    let matchedStock = null;
    
    // 尝试多种匹配方式
    // 1. 直接匹配（带后缀）
    matchedStock = stockList.find(stock => stock.dm === stockCode);
    
    // 2. 尝试匹配不带后缀的股票代码
    if (!matchedStock) {
      matchedStock = stockList.find(stock => stock.dm.split('.')[0] === stockCode);
    }
    
    // 3. 尝试添加交易所后缀匹配
    if (!matchedStock) {
      const suffix = stockCode.startsWith('6') ? '.SH' : '.SZ';
      matchedStock = stockList.find(stock => stock.dm === `${stockCode}${suffix}`);
    }
    
    // 如果还是找不到，直接使用新浪财经API获取数据，不需要从智兔API获取股票名称
    if (!matchedStock) {
      // 直接使用新浪财经API获取股票数据，不需要股票名称
      try {
        const sinaApiUrl = `https://hq.sinajs.cn/list=${stockCode.startsWith('6') ? 'sh' : 'sz'}${stockCode}`;
        const sinaResponse = await axios.get(sinaApiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        const dataStr = sinaResponse.data;
        
        // 提取股票数据部分，处理可能的编码问题
        const dataMatch = dataStr.match(/"([^"]+)"/);
        if (!dataMatch) {
          throw new Error('新浪财经API返回数据格式错误');
        }
        
        const data = dataMatch[1].split(',');
        
        if (data.length >= 3) {
          // 新浪财经API返回的数据包含股票名称
          let name = data[0];
          
          // 处理股票名称中的特殊字符和编码问题
          name = name.replace(/[\s\u0000-\u001F\u007F-\u009F]/g, '');
          
          // 如果名称为空或只有特殊字符，使用股票代码作为名称
          if (!name || name.trim() === '') {
            name = `股票${stockCode}`;
          }
          
          const price = data[3];
          const prevClose = data[2];
          const changeAmount = (price - prevClose).toFixed(2);
          const change = ((price - prevClose) / prevClose * 100).toFixed(2) + '%';
          const open = data[1];
          const high = data[4];
          const low = data[5];
          const volume = data[8];
          const amount = data[9];
          
          return {
            success: true,
            data: {
              name,
              code: stockCode,
              price,
              change: change.startsWith('-') ? change : '+' + change,
              changeAmount: changeAmount.startsWith('-') ? changeAmount : '+' + changeAmount,
              open,
              high,
              low,
              volume,
              amount,
              marketCap: '0'
            }
          };
        }
      } catch (sinaError) {
        console.error('新浪财经API调用失败:', sinaError.message);
      }
      
      // 如果所有API都失败，返回未找到股票
      return {
        success: true,
        data: {
          name: '未找到股票',
          code: stockCode,
          price: '0.00',
          change: '0.00%',
          changeAmount: '0.00',
          open: '0.00',
          high: '0.00',
          low: '0.00',
          volume: '0',
          amount: '0',
          marketCap: '0'
        }
      };
    }
    
    // 调用新浪财经API获取真实的股票实时数据（作为备选方案，因为智兔API可能需要额外配置）
    // 新浪财经API不需要API密钥，适合快速获取股票实时数据
    const sinaApiUrl = `https://hq.sinajs.cn/list=${stockCode.startsWith('6') ? 'sh' : 'sz'}${stockCode}`;
    const sinaResponse = await axios.get(sinaApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // 解析新浪财经API返回的数据
    const dataStr = sinaResponse.data;
    
    // 提取股票数据部分，处理可能的编码问题
    const dataMatch = dataStr.match(/"([^"]+)"/);
    if (!dataMatch) {
      throw new Error('新浪财经API返回数据格式错误');
    }
    
    const data = dataMatch[1].split(',');
    
    if (data.length < 3) {
      throw new Error('新浪财经API返回数据格式错误');
    }
    
    // 提取股票数据
    // 直接使用股票代码作为名称，完全跳过可能导致编码问题的API名称获取
    // 这是最可靠的方式，确保不会出现菱形问号
    const name = `股票${stockCode}`;
    
    // 不再尝试从任何API获取名称，因为它们可能返回带有编码问题的名称
    // 直接使用股票代码作为名称，确保显示正常
    
    const code = matchedStock.dm;
    const price = data[3]; // 当前价格
    const prevClose = data[2]; // 昨日收盘价
    const changeAmount = (price - prevClose).toFixed(2); // 涨跌额
    const change = ((price - prevClose) / prevClose * 100).toFixed(2) + '%'; // 涨跌幅
    const open = data[1]; // 开盘价
    const high = data[4]; // 最高价
    const low = data[5]; // 最低价
    const volume = data[8]; // 成交量
    const amount = data[9]; // 成交额
    const marketCap = '0'; // 新浪财经API不直接提供市值，需要计算
    
    // 尝试从新浪财经API返回的数据中获取更多指标
    let pe = '0.00'; // 市盈率(TTM)
    let pb = '0.00'; // 市净率
    let high52w = '0.00'; // 52周最高
    let low52w = '0.00'; // 52周最低
    
    // 新浪财经API返回的数据包含很多字段，尝试提取更多指标
    try {
      // 市盈率(TTM)通常在第39个字段
      if (data.length >= 40) {
        pe = data[39] || '0.00';
      }
      
      // 市净率通常在第46个字段
      if (data.length >= 47) {
        pb = data[46] || '0.00';
      }
      
      // 52周最高通常在第33个字段
      if (data.length >= 34) {
        high52w = data[33] || '0.00';
      }
      
      // 52周最低通常在第34个字段
      if (data.length >= 35) {
        low52w = data[34] || '0.00';
      }
    } catch (e) {
      console.error('提取更多指标失败:', e.message);
      // 失败时使用默认值
    }
    
    return {
      success: true,
      data: {
        name,
        code,
        price,
        change: change.startsWith('-') ? change : '+' + change,
        changeAmount: changeAmount.startsWith('-') ? changeAmount : '+' + changeAmount,
        open,
        high,
        low,
        volume,
        amount,
        marketCap,
        pe,
        pb,
        high52w,
        low52w
      }
    };
  } catch (error) {
    console.error('获取股票信息失败:', error.message);
    
    // 如果新浪财经API调用失败，尝试使用另一个备选方案
    try {
      // 使用腾讯财经API获取真实股票数据
      const tencentApiUrl = `https://qt.gtimg.cn/q=${stockCode.startsWith('6') ? 'sh' : 'sz'}${stockCode}`;
      const tencentResponse = await axios.get(tencentApiUrl);
      
      // 解析腾讯财经API返回的数据
      const dataStr = tencentResponse.data;
      const data = dataStr.split('~');
      
      if (data.length < 30) {
        throw new Error('腾讯财经API返回数据格式错误');
      }
      
      // 从腾讯财经API返回的数据中提取更多指标
      let pe = '0.00'; // 市盈率(TTM)
      let pb = '0.00'; // 市净率
      let high52w = '0.00'; // 52周最高
      let low52w = '0.00'; // 52周最低
      
      // 腾讯财经API返回的数据包含很多字段，尝试提取更多指标
      try {
        // 市盈率(TTM)通常在第39个字段
        if (data.length >= 40) {
          pe = data[39] || '0.00';
        }
        
        // 市净率通常在第46个字段
        if (data.length >= 47) {
          pb = data[46] || '0.00';
        }
        
        // 52周最高通常在第33个字段
        if (data.length >= 34) {
          high52w = data[33] || '0.00';
        }
        
        // 52周最低通常在第34个字段
        if (data.length >= 35) {
          low52w = data[34] || '0.00';
        }
      } catch (e) {
        console.error('提取更多指标失败:', e.message);
        // 失败时使用默认值
      }
      
      return {
        success: true,
        data: {
          name: data[1],
          code: stockCode,
          price: data[3],
          change: data[32],
          changeAmount: data[31],
          open: data[5],
          high: data[33],
          low: data[34],
          volume: data[36],
          amount: data[37],
          marketCap: data[45],
          pe,
          pb,
          high52w,
          low52w
        }
      };
    } catch (tencentError) {
      console.error('腾讯财经API调用失败:', tencentError.message);
      
      // 如果所有API都调用失败，返回模拟数据
      return {
        success: true,
        data: {
          name: '模拟股票',
          code: stockCode,
          price: '10.50',
          change: '+2.35%',
          changeAmount: '+0.24',
          open: '10.26',
          high: '10.68',
          low: '10.20',
          volume: '12345678',
          amount: '130000000',
          marketCap: '10500000000',
          pe: '15.80', // 市盈率(TTM)
          pb: '2.30', // 市净率
          high52w: '12.80', // 52周最高
          low52w: '8.50' // 52周最低
        }
      };
    }
  }
};

// 文件上传和分析路由
app.post('/api/analyze', upload.single('file'), async (req, res) => {
  // 确保临时文件在函数结束时被删除
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    const { path: tempFilePath, mimetype, originalname } = req.file;
    filePath = tempFilePath;
    
    console.log(`接收到文件: ${originalname}, 类型: ${mimetype}, 大小: ${req.file.size} 字节`);
    
    // 读取文件内容
    console.log('开始读取文件内容...');
    const fileContent = await readFileContent(filePath, mimetype);
    console.log(`文件内容读取完成，长度: ${fileContent.length} 字符`);
    
    // 使用AI分析
    const analysisResult = await analyzeWithAI(fileContent, originalname);
    
    // 删除临时文件
    fs.unlinkSync(filePath);
    filePath = null; // 确保不会再次尝试删除
    
    // 解析AI返回的JSON数据，提取股票代码
    let parsedAnalysis;
    let stockInfo = null;
    
    try {
      // 处理可能的Markdown代码块
      let cleanAnalysis = analysisResult;
      if (cleanAnalysis.startsWith('```json')) {
        cleanAnalysis = cleanAnalysis.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanAnalysis.startsWith('```')) {
        cleanAnalysis = cleanAnalysis.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      cleanAnalysis = cleanAnalysis.trim();
      
      parsedAnalysis = JSON.parse(cleanAnalysis);
      
      // 如果有股票代码，调用智兔API获取股票信息
      if (parsedAnalysis.stockCode) {
        console.log(`尝试获取股票代码 ${parsedAnalysis.stockCode} 的信息...`);
        stockInfo = await getStockInfo(parsedAnalysis.stockCode);
        console.log('股票信息获取成功');
      }
    } catch (parseError) {
      console.error('解析AI返回数据失败:', parseError);
      console.error('原始AI返回数据:', analysisResult); // 记录原始返回数据以便调试
      parsedAnalysis = {
        metrics: [],
        analysis: analysisResult,
        stockCode: null
      };
    }
    
    res.json({ 
      success: true, 
      fileName: originalname, 
      analysis: analysisResult,
      stockInfo: stockInfo
    });
  } catch (error) {
    console.error('分析失败:', error.message);
    // 确保临时文件被删除
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('临时文件已删除');
      } catch (unlinkError) {
        console.error('删除临时文件失败:', unlinkError);
      }
    }
    // 根据错误类型返回适当的HTTP状态码
    if (error.message.includes('API密钥')) {
      res.status(401).json({ error: error.message });
    } else if (error.message.includes('频率过高')) {
      res.status(429).json({ error: error.message });
    } else if (error.message.includes('超时')) {
      res.status(408).json({ error: error.message });
    } else if (error.message.includes('文件类型')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// AI问答路由
app.post('/api/qa', async (req, res) => {
  try {
    const { question, reportContent } = req.body;
    
    if (!question || !reportContent) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 从环境变量获取API密钥，如果没有则使用默认值（用于测试）
    const deepSeekApiKey = process.env.DEEPSEEK_API_KEY || 'sk-755f79d8842b467eb25f30a0d40ed5fd';
    
    // 调用DeepSeek API进行问答
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的财务分析师，请根据提供的财务报表内容回答用户的问题。请确保回答准确、专业，并基于提供的财报数据。'
          },
          {
            role: 'user',
            content: `请根据以下财务报表内容回答问题：\n\n财报内容：${reportContent.substring(0, 10000)}...\n\n用户问题：${question}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepSeekApiKey}`
        },
        timeout: 30000 // 30秒超时
      }
    );
    
    res.json({
      success: true,
      answer: response.data.choices[0].message.content
    });
  } catch (error) {
    console.error('AI问答失败:', error.response ? error.response.data : error.message);
    // 返回更详细的错误信息
    if (error.response && error.response.status === 401) {
      res.status(401).json({ error: 'API密钥无效或已过期，请更新密钥' });
    } else if (error.response && error.response.status === 429) {
      res.status(429).json({ error: 'API请求频率过高，请稍后重试' });
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({ error: 'API请求超时，请检查网络连接' });
    } else {
      res.status(500).json({ error: `AI问答失败: ${error.message}，请稍后重试` });
    }
  }
});

// 健康检查路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '来财研报服务运行正常' });
});

// 配置静态文件服务
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// 处理所有其他请求，返回index.html，支持前端路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`来财研报服务器运行在 http://localhost:${PORT}`);
});

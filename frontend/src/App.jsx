import React, { useState, useRef } from 'react';
import axios from 'axios';
import AIQAFloatWindow from './AIQAFloatWindow.jsx';

function App() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [stockInfo, setStockInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateFile(selectedFile);
    }
  };

  const validateFile = (selectedFile) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('不支持的文件类型，请上传PDF、Excel或CSV文件');
      return;
    }
    
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (selectedFile.size > maxSize) {
      setError('文件大小不能超过50MB');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateFile(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('请先选择文件');
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setError(null);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      const response = await axios.post('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      clearInterval(progressInterval);
      setProgress(100);
      
      try {
        // 保存股票信息
        setStockInfo(response.data.stockInfo || null);
        
        // 解析AI返回的JSON数据，处理可能的Markdown代码块格式
        let aiResponse = response.data.analysis;
        
        // 移除Markdown代码块标记
        if (aiResponse.startsWith('```json')) {
          aiResponse = aiResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (aiResponse.startsWith('```')) {
          aiResponse = aiResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // 清理可能的空白字符
        aiResponse = aiResponse.trim();
        
        const parsedData = JSON.parse(aiResponse);
        
        setAnalysisResult({
          ...response.data,
          metrics: parsedData.metrics || [],
          analysis: parsedData.analysis || ''
        });
      } catch (parseError) {
        // 如果解析失败，使用原始数据
        console.error('解析AI返回数据失败:', parseError);
        setAnalysisResult({
          ...response.data,
          metrics: [],
          analysis: response.data.analysis
        });
        setStockInfo(response.data.stockInfo || null);
      }
      
      setIsUploading(false);
    } catch (err) {
      setIsUploading(false);
      setError(err.response?.data?.error || '分析失败，请稍后重试');
      console.error('分析错误:', err);
    }
  };

  const resetForm = () => {
    setFile(null);
    setProgress(0);
    setAnalysisResult(null);
    setStockInfo(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container">
      <header>
        <h1>来财研报</h1>
        <p>上传您的财务报表，获取AI驱动的深度分析报告</p>
      </header>

      <main>
        <section className="upload-section">
          <h2>上传财务报表</h2>
          
          <div 
            className={`upload-area ${isDragging ? 'dragover' : ''}`}
            onClick={() => fileInputRef.current.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.xls,.xlsx,.csv"
            />
            <p>📁 点击或拖拽文件到此处上传</p>
            <p className="file-types">支持PDF、Excel (.xls, .xlsx) 和CSV格式，最大50MB</p>
            
            {file && (
              <div className="success">
                ✅ 已选择文件: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          <button 
            className="btn" 
            onClick={handleUpload}
            disabled={isUploading || !file}
          >
            {isUploading ? '分析中...' : '开始AI分析'}
          </button>

          {isUploading && (
            <div className="progress-section">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="progress-text">分析进度: {progress}%</p>
            </div>
          )}

          {error && (
            <div className="error">
              ❌ {error}
            </div>
          )}
        </section>

        {analysisResult && (
          <section className="result-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>分析结果</h2>
              <button className="btn" onClick={resetForm}>
                上传新文件
              </button>
            </div>
            
            <div className="file-info">
              <p><strong>文件名:</strong> {analysisResult.fileName}</p>
              <p><strong>分析时间:</strong> {new Date().toLocaleString()}</p>
            </div>
            
            {/* 股票信息板块 */}
            {stockInfo && stockInfo.success && (
              <div className="stock-section">
                <h3>当前公司股票信息</h3>
                <div className="stock-card">
                  <div className="stock-header">
                    <div className="stock-name">
                      <span className="stock-full-name">{stockInfo.data.name}</span>
                      <span className="stock-code">{stockInfo.data.code}</span>
                    </div>
                    <div className="stock-price">
                      <span className="current-price">{stockInfo.data.price}</span>
                      <span className={`stock-change ${stockInfo.data.change.startsWith('+') ? 'positive' : 'negative'}`}>
                        {stockInfo.data.change.startsWith('+') ? '↑' : '↓'} {stockInfo.data.change}
                      </span>
                    </div>
                  </div>
                  <div className="stock-details">
                    <div className="stock-detail-item">
                      <span className="detail-label">开盘价:</span>
                      <span className="detail-value">{stockInfo.data.open}</span>
                    </div>
                    <div className="stock-detail-item">
                      <span className="detail-label">最高价:</span>
                      <span className="detail-value">{stockInfo.data.high}</span>
                    </div>
                    <div className="stock-detail-item">
                      <span className="detail-label">最低价:</span>
                      <span className="detail-value">{stockInfo.data.low}</span>
                    </div>
                    <div className="stock-detail-item">
                      <span className="detail-label">成交量:</span>
                      <span className="detail-value">{parseInt(stockInfo.data.volume).toLocaleString()}</span>
                    </div>
                    <div className="stock-detail-item">
                      <span className="detail-label">成交额:</span>
                      <span className="detail-value">{parseInt(stockInfo.data.amount).toLocaleString()}</span>
                    </div>
                    <div className="stock-detail-item">
                      <span className="detail-label">市值:</span>
                      <span className="detail-value">{parseInt(stockInfo.data.marketCap).toLocaleString()}</span>
                    </div>
                    <div className="stock-detail-item">
                      <span className="detail-label">市盈率(TTM):</span>
                      <span className="detail-value">{stockInfo.data.pe || '0.00'}</span>
                    </div>
                    <div className="stock-detail-item">
                      <span className="detail-label">市净率:</span>
                      <span className="detail-value">{stockInfo.data.pb || '0.00'}</span>
                    </div>
                    <div className="stock-detail-item">
                      <span className="detail-label">52周最高:</span>
                      <span className="detail-value">{stockInfo.data.high52w || '0.00'}</span>
                    </div>
                    <div className="stock-detail-item">
                      <span className="detail-label">52周最低:</span>
                      <span className="detail-value">{stockInfo.data.low52w || '0.00'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 核心财务指标展示板块 */}
            <div className="metrics-section">
              <h3>核心财务指标</h3>
              <div className="metrics-grid">
                {analysisResult.metrics && analysisResult.metrics.length > 0 ? (
                  analysisResult.metrics.map((metric, index) => (
                    <div key={index} className="metric-card">
                      <div className="metric-name">{metric.name}</div>
                      <div className="metric-value">{metric.value}</div>
                      <div className={`metric-change ${metric.type}`}>
                        <span className={`arrow ${metric.type}`}>
                          {metric.type === 'positive' ? '↑' : '↓'}
                        </span> {metric.change}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="loading">正在提取核心财务指标...</div>
                )}
              </div>
            </div>
            
            {/* AI分析报告 */}
            <div className="analysis-section">
              <h3>详细分析报告</h3>
              <div className="analysis-result">
                {analysisResult.analysis || '正在生成详细分析报告...'}
              </div>
            </div>
          </section>
        )}
      </main>
      
      {/* AI问答浮窗 */}
      <AIQAFloatWindow reportContent={analysisResult?.analysis || ''} />
    </div>
  );
}

export default App;

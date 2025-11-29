import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

function AIQAFloatWindow({ reportContent }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputValue
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/qa', {
        question: inputValue,
        reportContent: reportContent
      });

      const aiMessage = {
        role: 'assistant',
        content: response.data.answer
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI问答失败:', error);
      const errorMessage = {
        role: 'assistant',
        content: '抱歉，AI问答服务暂时不可用，请稍后重试。'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理键盘事件
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="ai-qa-container">
      {/* 浮窗按钮 */}
      <button 
        className={`ai-qa-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="AI问答"
      >
        {isOpen ? '✕' : '💬 AI问答'}
      </button>

      {/* 浮窗内容 */}
      {isOpen && (
        <div className="ai-qa-window">
          {/* 浮窗头部 */}
          <div className="ai-qa-header">
            <h3>💬 AI财报问答</h3>
            <button 
              className="ai-qa-close"
              onClick={() => setIsOpen(false)}
              aria-label="关闭"
            >
              ✕
            </button>
          </div>

          {/* 消息列表 */}
          <div className="ai-qa-messages">
            {messages.length === 0 ? (
              <div className="ai-qa-welcome">
                <p>您好！我是AI财报分析师，有什么关于这份财报的问题可以问我。</p>
                <p>例如：</p>
                <ul>
                  <li>这份财报的净利润是多少？</li>
                  <li>公司的毛利率情况如何？</li>
                  <li>有哪些风险需要注意？</li>
                  <li>未来发展机会有哪些？</li>
                </ul>
              </div>
            ) : (
              messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`ai-qa-message ${message.role}`}
                >
                  <div className="message-content">
                    {message.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="ai-qa-message assistant loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="ai-qa-input-area">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="请输入您的问题..."
              disabled={isLoading}
              rows={2}
            />
            <button 
              className="ai-qa-send"
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? '发送中...' : '发送'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIQAFloatWindow;

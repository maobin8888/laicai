# AI财务报表分析网站

一个基于AI的财务报表分析平台，支持PDF、Excel和CSV三种主流财报文件格式，能够自动研读财报并生成全面的分析报告。

## 功能特性

- 📁 **多格式支持**: 支持PDF、Excel (.xls, .xlsx) 和CSV格式
- 🤖 **AI深度分析**: 利用DeepSeek API进行智能财报分析
- 📊 **核心指标展示**: 自动提取和分析关键财务指标
- 💡 **投资建议**: 提供专业的投资建议和风险提示
- 🚀 **现代化界面**: 采用React + Vite构建的响应式设计
- ⚡ **快速上传**: 支持拖拽上传和进度显示

## 技术栈

### 后端
- Node.js + Express
- Multer (文件上传)
- pdf-parse (PDF解析)
- xlsx (Excel/CSV解析)
- Axios (API请求)

### 前端
- React 18
- Vite
- Axios
- 现代化CSS设计

## 项目结构

```
.
├── server.js          # 后端主入口
├── package.json       # 后端依赖
├── frontend/          # 前端项目
│   ├── src/
│   │   ├── App.jsx    # 前端主组件
│   │   ├── main.jsx   # 前端入口
│   │   └── index.css  # 样式文件
│   ├── index.html
│   ├── vite.config.js
│   └── package.json   # 前端依赖
└── README.md
```

## 安装和运行

### 1. 安装依赖

#### 后端依赖
```bash
npm install
```

#### 前端依赖
```bash
cd frontend
npm install
```

### 2. 配置API密钥

在 `server.js` 文件中，确保已配置正确的DeepSeek API密钥：

```javascript
'Authorization': `Bearer sk-755f79d8842b467eb25f30a0d40ed5fd`
```

### 3. 启动服务

#### 启动后端服务
```bash
node server.js
```
或使用nodemon（开发模式）：
```bash
npm run dev
```

后端服务将运行在 `http://localhost:3001`

#### 启动前端服务
```bash
cd frontend
npm run dev
```

前端服务将运行在 `http://localhost:3000`

### 4. 访问应用

在浏览器中打开 `http://localhost:3000` 即可使用应用。

## 使用说明

1. **上传文件**: 点击或拖拽财务报表文件到上传区域
2. **选择文件**: 系统会自动验证文件类型和大小
3. **开始分析**: 点击"开始AI分析"按钮
4. **查看结果**: 等待分析完成后，查看详细的分析报告
5. **上传新文件**: 点击"上传新文件"可以分析其他财报

## 支持的文件格式

- **PDF**: 适用于扫描或电子生成的财务报表
- **Excel**: 支持 .xls 和 .xlsx 格式
- **CSV**: 逗号分隔值文件

## 文件大小限制

- 单个文件最大支持50MB

## API端点

### POST /api/analyze
- **功能**: 上传并分析财务报表
- **请求类型**: multipart/form-data
- **参数**: file (财务报表文件)
- **响应**: 包含分析结果的JSON对象

### GET /api/health
- **功能**: 健康检查
- **响应**: 服务状态信息

## 开发说明

### 构建生产版本

```bash
# 构建前端
cd frontend
npm run build

# 构建后的文件将生成在 frontend/dist 目录
```

### 环境变量

可以通过环境变量配置以下参数：

- `PORT`: 后端服务端口（默认3001）

## 注意事项

1. 确保网络连接正常，能够访问DeepSeek API
2. 大文件分析可能需要较长时间，请耐心等待
3. 分析结果的准确性取决于AI模型和财报质量
4. 建议使用结构化的财务报表以获得更好的分析效果

## 许可证

MIT

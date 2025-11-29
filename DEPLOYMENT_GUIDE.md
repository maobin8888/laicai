# 来财研报 - 部署指南

本指南将帮助您将项目部署到Vercel平台。

## 方法一：使用GitHub Actions自动部署（推荐）

我已经为您创建了GitHub Actions配置文件 `.github/workflows/vercel-deploy.yml`，实现了自动部署功能。

### 配置步骤：

1. **将代码推送到GitHub仓库**
   ```bash
   git init
   git add .
   git commit -m "初始化项目"
   git remote add origin https://github.com/您的用户名/您的仓库名.git
   git push -u origin master
   ```

2. **在Vercel创建项目**
   - 访问 [Vercel官网](https://vercel.com) 并登录
   - 点击"New Project"
   - 选择您的GitHub仓库
   - 按照提示完成项目创建（不需要部署，只需创建项目）

3. **获取Vercel配置信息**
   - 进入项目设置
   - 复制 `ORG_ID` 和 `PROJECT_ID`
   - 创建一个新的 `Token`：点击右上角头像 → Settings → Tokens

4. **配置GitHub Secrets**
   - 进入您的GitHub仓库 → Settings → Secrets and variables → Actions
   - 添加以下Secrets：
     - `VERCEL_TOKEN`：您的Vercel令牌
     - `VERCEL_ORG_ID`：您的组织ID
     - `VERCEL_PROJECT_ID`：您的项目ID

5. **触发部署**
   - 推送新的提交到 `main` 或 `master` 分支
   - GitHub Actions将会自动运行部署流程

## 方法二：手动部署

如果您更喜欢手动部署，可以按照以下步骤操作：

1. **安装Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录Vercel**
   ```bash
   vercel login
   ```
   按照提示完成登录。

3. **部署项目**
   ```bash
   # 在项目根目录执行
   vercel
   ```

4. **生产环境部署**
   ```bash
   vercel --prod
   ```

## 环境变量配置

如果您的应用需要环境变量，请在Vercel项目设置中配置：

1. 进入Vercel项目 → Settings → Environment Variables
2. 添加必要的环境变量
3. 部署时环境变量将自动应用

## 验证部署

部署成功后，您可以通过Vercel提供的URL访问您的应用。通常格式为：
`https://您的项目名-您的用户名.vercel.app`

## 常见问题

1. **部署失败**
   - 检查构建日志
   - 确保所有依赖正确安装
   - 验证环境变量配置

2. **访问API失败**
   - 检查CORS配置
   - 确认后端API正确部署

祝您部署顺利！如有问题，请查看Vercel [官方文档](https://vercel.com/docs) 或联系技术支持。

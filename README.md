# 平台加密参数生成服务

这是一个专门用于生成各大平台加密参数的服务。通过浏览器自动化技术，该服务能够模拟真实用户环境，生成各种平台所需的加密参数，用于绕过安全验证。

## 功能特点

- **多平台支持**: 支持生成多个主流平台的加密参数
- **API接口**: 提供RESTful API接口，方便集成到其他系统中
- **错误处理**: 完善的错误处理机制，确保服务稳定性
- **易于扩展**: 模块化设计，方便添加新的平台支持

## 当前支持平台

- 腾讯混元AI (Hunyuan AI) - Ticket参数生成

## 技术架构

### 分层设计
```
┌─────────────┐
│    Main     │  路由注册器
└─────────────┘
       ↓
┌─────────────┐
│   Service   │  业务逻辑层
└─────────────┘
       ↓
┌─────────────┐
│    Core     │  核心功能实现
└─────────────┘
```

### 目录结构
```
.
├── core/                 核心功能模块
│   └── tencent/          腾讯平台相关核心功能
│       ├── tencent_config.js  腾讯平台配置信息
│       └── ticket_generator.js 腾讯Ticket生成器
├── service/              业务逻辑层
├── middleware/           中间件
├── main.js              应用入口文件
└── README.md            说明文档
```

## 快速开始

### 环境要求
- Node.js >= 14.x
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 启动服务
```bash
node main.js
```

服务默认运行在 `http://localhost:5001`

### 使用接口
```bash
# 获取腾讯混元AI验证码Ticket (POST请求)
curl -X POST http://localhost:5001/ticket \
  -H "Content-Type: application/json" \
  -d '{"app": "hunyuan"}'
```

## API 接口文档

### POST /ticket
获取指定平台的验证码Ticket参数

**请求参数:**
```json
{
  "app": "hunyuan"  // 平台标识，目前支持 hunyuan/tencent
}
```

**响应示例:**
```json
{
  "ret": 0,
  "ticket": "t03X55ZctDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "randstr": "@HWiA0kXXX",
  "platform": "hunyuan",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

## 平台配置

目前支持的腾讯平台配置保存在 `core/tencent/tencent_config.js` 中：

```javascript
const platformAppIds = {
    'hunyuan': '2048700062',   // 腾讯混元AI平台
    'tencent': '2048700062'    // 腾讯验证码平台
};
```

如需添加新平台，只需在该配置文件中添加相应的平台标识和appid即可。

## 错误处理

服务包含完善的错误处理机制：
- 全局异常捕获
- 启动错误处理
- 请求错误处理
- 404页面处理

## 扩展新平台

1. 在 `core/` 目录下创建对应平台的目录
2. 实现参数生成功能
3. 添加平台配置文件
4. 在 `service/` 目录下创建对应的业务逻辑（如需要）
5. 在 `main.js` 中注册新的路由（如需要）

## 注意事项

1. 服务需要能够访问互联网以加载各平台的SDK
2. 服务需要足够的系统资源来运行浏览器实例
3. 某些平台可能有人机验证频率限制，请合理使用

## 许可证

MIT

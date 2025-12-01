import express from 'express';
import { handleTicketRequest } from './service/tencent/ticket_service.js';
import { handleGeneralError, handleNotFoundError } from './middleware/error_handler.js';
import { setupAppMiddlewares } from './middleware/app_middlewares.js';

// 创建Express应用
const app = express();
const PORT = 5001;

// 设置应用级中间件
setupAppMiddlewares(app);

// Ticket生成接口 - POST请求
app.post('/tencent/ticket', handleTicketRequest);

// 添加错误处理中间件
app.use((err, req, res, next) => {
    handleGeneralError(err, res);
});

// 添加404处理
app.use((req, res) => {
    handleNotFoundError(req, res);
});

// 启动服务器
const server = app.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
        console.error('服务器启动失败:', err);
        process.exit(1);
    }
    
    console.log(`参数生成服务已启动`);
    console.log(`访问地址: http://localhost:${PORT}`);
    // console.log(`获取ticket接口: http://localhost:${PORT}/ticket (POST方法)`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
    console.error('未捕获的异常:', err);
    process.exit(1);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
    process.exit(1);
});
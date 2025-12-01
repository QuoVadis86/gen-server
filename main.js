import express, { json, urlencoded } from 'express';
import cors from 'cors';
import { handleTicketRequest } from './service/ticket_service.js';
import { handleGeneralError, handleNotFoundError } from './service/error_handler.js';

// 创建Express应用
const app = express();
const PORT = 5001;

// 添加CORS中间件，允许所有来源
app.use(cors());

// 添加其他中间件
app.use(json());
app.use(urlencoded({ extended: true }));

// Ticket生成接口
app.get('/ticket', handleTicketRequest);

// 添加错误处理中间件
app.use((err, req, res, next) => {
    handleGeneralError(err, res);
});

// 添加404处理
app.use((req, res) => {
    handleNotFoundError(req, res);
});

// 启动服务器
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`腾讯验证码Ticket生成服务已启动`);
    console.log(`访问地址: http://localhost:${PORT}`);
    console.log(`获取ticket接口: http://localhost:${PORT}/ticket`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});
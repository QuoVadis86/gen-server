import express, { json, urlencoded } from 'express';
import cors from 'cors';
import { generateTicket } from './tencent/generate_ticket.js';

// 创建Express应用
const app = express();
const PORT = 5001;

// 添加CORS中间件，允许所有来源
app.use(cors());

// 添加其他中间件
app.use(json());
app.use(urlencoded({ extended: true }));


// Ticket生成接口
app.get('/ticket', async (req, res) => {
    console.log('收到获取ticket的请求，IP:', req.ip);
    
    try {
        // 设置响应头
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        // 调用生成ticket的函数
        console.log('开始生成ticket...');
        const result = await generateTicket("2048700062");
        console.log('ticket生成成功:', result);
        
        // 返回JSON格式的结果
        res.json({
            ret: result.ret,
            ticket: result.ticket,
            randstr: result.randstr,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('生成ticket时出错:', error);
        res.status(500).json({
            error: '生成ticket失败',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 添加错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err.stack);
    res.status(500).json({
        error: '服务器内部错误',
        message: err.message
    });
});

// 添加404处理
app.use((req, res) => {
    res.status(404).json({
        error: '接口不存在',
        message: `请求的接口 ${req.originalUrl} 不存在`
    });
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
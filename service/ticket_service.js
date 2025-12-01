import { generateTicket } from '../core/tencent/ticket_generator.js';

/**
 * 处理腾讯验证码Ticket生成请求的服务
 * @param {string} appid - 腾讯验证码的appid
 * @returns {Promise<Object>} 包含ticket和randstr的对象
 */
async function handleTicketGeneration(appid = "2048700062") {
    try {
        console.log('开始生成ticket...');
        const result = await generateTicket(appid);
        console.log('ticket生成成功:', result);
        
        return {
            ret: result.ret,
            ticket: result.ticket,
            randstr: result.randstr,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('生成ticket时出错:', error);
        throw error;
    }
}

/**
 * 处理Ticket请求的完整HTTP处理函数
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function handleTicketRequest(req, res) {
    console.log('收到获取ticket的请求，IP:', req.ip);
    
    try {
        // 设置响应头
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        // 调用service层处理业务逻辑
        const result = await handleTicketGeneration("2048700062");
        
        // 返回JSON格式的结果
        res.json(result);
    } catch (error) {
        // 这里应该抛出错误给main.js中的错误处理中间件处理
        throw error;
    }
}

export { handleTicketRequest };
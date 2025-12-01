import { generateTicket } from '../../core/tencent/ticket_generator.js';
import { getApp } from '../../core/tencent/tencent_config.js';

/**
 * Ticket生成结果
 * @typedef {Object} TicketResult
 * @property {number} ret - 返回码
 * @property {string} ticket - 验证码ticket
 * @property {string} randstr - 随机字符串
 * @property {string} platform - 平台标识
 * @property {string} platformName - 平台名称
 * @property {string} timestamp - 时间戳
 */

/**
 * 处理腾讯验证码Ticket生成请求的服务
 * @param {string} app - 平台名称
 * @returns {Promise<TicketResult>} 包含ticket和randstr的对象
 */
async function handleTicketGeneration(app = "hunyuan") {
    try {
        // 获取平台配置信息
        const appConfig = getApp(app);
        
        if (!appConfig) {
            throw new Error(`不支持的平台: ${app}`);
        }
        
        const appid = appConfig.appid;
        
        console.log(`开始生成${app}的ticket...`);
        const result = await generateTicket(appid);
        console.log(`${app}的ticket生成成功:`, result);
        
        return {
            ret: result.ret,
            ticket: result.ticket,
            randstr: result.randstr,
            // platform: app,
            platformName: appConfig.name,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error(`生成${app}平台ticket时出错:`, error);
        throw error;
    }
}

/**
 * HTTP请求对象
 * @typedef {Object} HttpRequest
 * @property {Object} body - 请求体
 * @property {string} ip - 请求IP地址
 */

/**
 * HTTP响应对象
 * @typedef {Object} HttpResponse
 * @property {Function} setHeader - 设置响应头
 * @property {Function} json - 发送JSON响应
 */

/**
 * 处理Ticket请求的完整HTTP处理函数
 * @param {HttpRequest} req - Express请求对象
 * @param {HttpResponse} res - Express响应对象
 * @returns {Promise<void>}
 */
async function handleTicketRequest(req, res) {
    console.log('收到获取ticket的请求，IP:', req.ip);
    
    try {
        // 获取平台参数
        const { app } = req.body;
        const platform = app || "hunyuan"; // 默认使用混元AI平台
        
        // 设置响应头
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        // 调用service层处理业务逻辑
        const result = await handleTicketGeneration(platform);
        
        // 返回JSON格式的结果
        res.json(result);
    } catch (error) {
        // 这里应该抛出错误给main.js中的错误处理中间件处理
        throw error;
    }
}

export { handleTicketRequest };
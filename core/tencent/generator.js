import { getPage, closePage } from '../utils/browser_pool.js';
import {solveSliderCaptcha} from './slover.js';
/**
 * 验证码验证结果对象
 * @typedef {Object} CaptchaResult
 * @property {number} ret - 验证码返回码 (0表示成功)
 * @property {string} ticket - 验证票据，用于后端验证
 * @property {string} randstr - 随机字符串，用于后端验证
 * @property {string} [errMessage] - 错误信息（如果存在）
 * @property {string} [level] - 安全等级
 */


/**
 * 获取腾讯云验证码的票据和随机字
 * @param {string} [appid="2048700062"] - 腾讯云验证码应用的appid
 * @returns {Promise<CaptchaResult>} 返回包含ticket、randstr及其他验证信息的Promise对象
 * @throws {Error} 当验证码验证超时或发生错误时抛出异常
 * 
 * @example
 * generateTicket("2048700062").then(result => {
 *   console.log('Ticket:', result.ticket);
 *   console.log('Randstr:', result.randstr);
 * }).catch(error => {
 *   console.error('验证失败:', error);
 * });
 * 
 * @since 1.0.0
 * @version 1.0.0
 */
async function generateTicket(appid = "2048700062") {
    console.log('正在获取浏览器页面...');

    // 获取页面
    const page = await getPage('tencent');

    // 设置页面内容
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>腾讯验证码Ticket生成器</title>
        <meta charset="UTF-8">
    </head>
    <body>
        <h1>腾讯验证码Ticket生成器</h1>
        <div id="status">正在加载验证码...</div>
        <div id="result"></div>
        
        <!-- 引入腾讯验证码JS -->
        <script src="https://ssl.captcha.qq.com/TCaptcha.js"></script>
        <script>
            let captchaInstance = null;
            let resolvePromise = null;
            
            // 初始化验证码
            function initCaptcha() {
                try {
                    // 按照规范正确初始化验证码
                    captchaInstance = new TencentCaptcha("${appid}", function(res) {
                        console.log('回调结果:', res);
                        
                        // 更新状态显示
                        document.getElementById('status').innerHTML = '验证完成';
                        
                        // 显示结果
                        document.getElementById('result').innerHTML = 
                            '<h2>验证结果:</h2>' +
                            '<p>Ret: ' + res.ret + '</p>' +
                            '<p>Ticket: ' + (res.ticket || 'N/A') + '</p>' +
                            '<p>Randstr: ' + (res.randstr || 'N/A') + '</p>';
                        
                        // 如果验证成功，解决Promise
                        if (res.ret === 0 && res.ticket) {
                            // 向父窗口发送结果
                            window.parent.postMessage({
                                type: 'TICKET_RESULT',
                                data: res
                            }, '*');
                            
                            // 如果有Promise等待解决，则解决它
                            if (resolvePromise) {
                                resolvePromise(res);
                            }
                        }
                    });
                    
                    // 显示验证码
                    captchaInstance.show();
                    document.getElementById('status').innerHTML = '请完成验证码验证...';
                } catch (e) {
                    console.error('初始化验证码出错:', e);
                    document.getElementById('status').innerHTML = '初始化错误: ' + e.message;
                }
            }
            
            // 页面加载完成后初始化
            document.addEventListener('DOMContentLoaded', function() {
                initCaptcha();
            });
        </script>
    </body>
    </html>
    `;

    // 导航到自定义页面
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    console.log('页面已加载，请完成验证码验证...');
     // TODO:实现自动处理验证码
     await solveSliderCaptcha(page);
    // 创建Promise并返回结果
    return new Promise((resolve, reject) => {
        // 设置超时
        const timeout = setTimeout(async () => {
            await closePage(page, 'tencent');
            reject(new Error('验证码验证超时'));
        }, 120000); // 2分钟超时

        // 监听来自页面的消息
        // page.on('console', msg => console.log('页面控制台:', msg.text()));

        // // 监听来自iframe的消息
        // page.on('response', response => {
        //     console.log('页面响应:', response.url());
        // });

        // // 监听页面消息
        // page.on('message', message => {
        //     console.log('收到页面消息:', message);
        // });

        // // 监听来自页面的postMessage
        // page.on('request', request => {
        //     // 检查是否是验证码相关请求
        //     if (request.url().includes('captcha')) {
        //         console.log('验证码相关请求:', request.url());
        //     }
        // });

        // 监听来自页面的消息
        page.evaluate(() => {
            window.addEventListener('message', function (event) {
                if (event.data && event.data.type === 'TICKET_RESULT') {
                    // 将结果发送到Node环境
                    window.ticketResult = event.data.data;
                }
            });
        });

        // 定期检查结果
        const checkResult = setInterval(async () => {
            try {
                const result = await page.evaluate(() => {
                    return window.ticketResult || null;
                });

                if (result) {
                    clearInterval(checkResult);
                    clearTimeout(timeout);
                    await closePage(page, 'tencent');
                    console.log('成功获取验证码结果');
                    resolve(result);
                }
            } catch (e) {
                console.error('检查结果时出错:', e);
            }
        }, 1000);
    });
}

// 导出函数
export { generateTicket };
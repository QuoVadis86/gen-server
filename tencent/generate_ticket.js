import { launch } from 'puppeteer';

/**
 * 生成腾讯验证码ticket的函数
 * @param {string} appid - 腾讯验证码的appid
 * @returns {Promise<Object>} 包含ticket和randstr的对象
 */
async function generateTicket(appid = "2048700062") {
    console.log('正在启动浏览器...');
    
    // 启动浏览器
    const browser = await launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
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
    
    // 创建Promise并返回结果
    return new Promise((resolve, reject) => {
        // 设置超时
        const timeout = setTimeout(() => {
            reject(new Error('验证码验证超时'));
            browser.close();
        }, 120000); // 2分钟超时
        
        // 监听来自页面的消息
        page.on('console', msg => console.log('页面控制台:', msg.text()));
        
        // 监听来自iframe的消息
        page.on('response', response => {
            console.log('页面响应:', response.url());
        });
        
        // 监听页面消息
        page.on('message', message => {
            console.log('收到页面消息:', message);
        });
        
        // 监听来自页面的postMessage
        page.on('request', request => {
            // 检查是否是验证码相关请求
            if (request.url().includes('captcha')) {
                console.log('验证码相关请求:', request.url());
            }
        });
        
        // 监听来自页面的消息
        page.evaluate(() => {
            window.addEventListener('message', function(event) {
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
                    await browser.close();
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
export default { generateTicket };

// 如果直接运行此脚本，则执行测试
if (require.main === module) {
    generateTicket("2048700062")
        .then(result => {
            console.log('\n=== 验证码Ticket生成成功 ===');
            console.log('Ret:', result.ret);
            console.log('Ticket:', result.ticket);
            console.log('Randstr:', result.randstr);
            console.log('==========================\n');
        })
        .catch(error => {
            console.error('生成Ticket失败:', error);
        });
}
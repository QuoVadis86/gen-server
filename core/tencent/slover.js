import { launch ,Page,Browser} from 'puppeteer';
import { PNG } from 'pngjs';
import { writeFileSync, createWriteStream } from 'fs';
import { join } from 'path';

/**
 * 腾讯滑块验证码自动处理模块
 */

/**
 * 自动解决滑块验证码
 * @param {Page} page - Puppeteer页面对象
 * @returns {Promise<boolean>} 是否成功解决验证码
 */
async function solveSliderCaptcha(page) {
    // 存储验证码图片
    const captchaImages = {
        background: null,
        fragment: null
    };
    
    // 请求和响应监听器引用，便于清理
    let requestListener, responseListener;
    
    try {
        // 启用请求拦截
        await page.setRequestInterception(true);
        
        // 监听网络请求
        requestListener = request => {
            const url = request.url();
            // 检查是否为验证码图片请求
            if (url.includes('cap_union_new_getcapbysig') && url.includes('img_index=')) {
                console.log('拦截到验证码图片请求:', url);
            }
            request.continue().catch(e => {
                console.warn('请求继续失败:', e.message);
            });
        };
        
        responseListener = async response => {
            const url = response.url();
            // 检查是否为验证码图片响应
            if (url.includes('cap_union_new_getcapbysig') && url.includes('img_index=')) {
                try {
                    const buffer = await response.buffer();
                    if (url.includes('img_index=0')) {
                        console.log('获取到碎片图');
                        captchaImages.fragment = buffer;
                    } else if (url.includes('img_index=1')) {
                        console.log('获取到背景图');
                        captchaImages.background = buffer;
                    }
                } catch (e) {
                    console.error('获取图片数据失败:', e);
                }
            }
        };

        page.on('request', requestListener);
        page.on('response', responseListener);

        // 等待验证码iframe加载，使用确定的ID
        const iframeSelector = '#tcaptcha_iframe_dy';
        await page.waitForSelector(iframeSelector, { timeout: 10000 });
        
        // 获取iframe元素
        const iframeElement = await page.$(iframeSelector);
        if (!iframeElement) {
            throw new Error('无法找到验证码iframe元素');
        }

        // 获取iframe的contentFrame（即#document）
        const iframe = await iframeElement.contentFrame();
        if (!iframe) {
            throw new Error('无法访问iframe的contentFrame');
        }
        
        // 等待一段时间确保图片加载完成
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 检查是否成功获取图片
        if (!captchaImages.background || !captchaImages.fragment) {
            throw new Error('未能成功获取验证码图片');
        }
        
        // 识别缺口位置
        const gapPosition = findGapPosition(captchaImages.background, captchaImages.fragment);
        
        // 获取滑块元素
        const sliderElement = await iframe.$('.tc-slider-normal');
        if (!sliderElement) {
            throw new Error('无法找到滑块元素 (.tc-slider-normal)');
        }
        
        // 获取滑块元素位置信息
        const sliderBox = await sliderElement.boundingBox();

        if (!sliderBox) {
            throw new Error('无法获取滑块元素位置信息');
        }

        // 计算需要移动的距离
        const slideDistance = gapPosition;
        
        // 添加随机偏移量，模拟人类操作
        const offset = -3 + Math.random() * 6;
        const finalDistance = slideDistance + offset;

        // 生成拖拽轨迹
        const tracks = generateDragTrack(finalDistance);

        // 执行拖拽操作
        const sliderX = sliderBox.x + sliderBox.width / 2;
        const sliderY = sliderBox.y + sliderBox.height / 2;

        // 移动到滑块并按下
        await page.mouse.move(sliderX, sliderY);
        await sleep(200 + Math.random() * 300); // 随机停顿
        await page.mouse.down();

        // 按轨迹移动
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            await page.mouse.move(
                sliderX + track,
                sliderY + (Math.random() * 6 - 3) // 添加Y轴抖动
            );
            
            // 随机延迟，模拟人类操作
            if (i % 5 === 0) {
                await sleep(Math.random() * 50 + 10);
            }
        }

        // 随机停顿后释放鼠标
        await sleep(100 + Math.random() * 200);
        await page.mouse.up();

        // 等待验证结果
        await sleep(2000);

        // 检查是否验证成功
        try {
            // 检查是否存在成功的元素
            const successElement = await iframe.$('.tc-success');
            if (successElement) {
                const successStyle = await iframe.evaluate(el => el.style.visibility, successElement);
                if (successStyle !== 'hidden') {
                    return true;
                }
            }
            
            // 检查是否仍在原页面（验证失败）
            const failElement = await iframe.$('.tc-fail');
            if (failElement) {
                const failStyle = await iframe.evaluate(el => el.style.visibility, failElement);
                if (failStyle !== 'hidden') {
                    // 尝试点击刷新按钮
                    const refreshButton = await iframe.$('.refreshButton');
                    if (refreshButton) {
                        await iframe.click('.refreshButton');
                        await sleep(1000);
                    }
                    return false;
                }
            }
            
            // 检查加载状态是否消失（验证完成）
            const loadingElement = await iframe.$('.tc-loading');
            if (loadingElement) {
                const loadingStyle = await iframe.evaluate(el => el.style.display, loadingElement);
                if (loadingStyle === 'none') {
                    // 加载完成可能意味着验证成功
                    return true;
                }
            }
        } catch (e) {
            // 如果找不到特定元素，假设验证已提交
        }

        return true;
    } catch (error) {
        console.error('自动解决滑块验证码时出错:', error);
        return false;
    } finally {
        // 清理监听器
        if (requestListener) {
            page.off('request', requestListener);
        }
        if (responseListener) {
            page.off('response', responseListener);
        }
        
        // 关闭请求拦截
        try {
            await page.setRequestInterception(false);
        } catch (e) {
            // 忽略错误
        }
    }
}

/**
 * 休眠函数
 * @param {number} ms - 毫秒数
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成模拟人类的拖拽轨迹
 * @param {number} distance - 需要拖拽的距离
 * @returns {Array} 轨迹点数组
 */
function generateDragTrack(distance) {
    const tracks = [];
    let current = 0;
    const mid = distance * 0.7; // 减速阈值
    const t = Math.random() * 0.2 + 0.8; // 计算系数
    const v = 0; // 初始速度

    while (current < distance) {
        if (current < mid) {
            // 加速
            const a = Math.random() * 5 + 2;
            const move = v * t + 0.5 * a * t * t;
            current += move;
            tracks.push(Math.round(current));
        } else {
            // 减速
            const a = -(Math.random() * 3 + 2);
            let move = v * t + 0.5 * a * t * t;
            if (move <= 0) {
                move = 1;
            }
            current += move;
            if (current > distance) {
                current = distance;
            }
            tracks.push(Math.round(current));
        }
    }

    // 回退一段距离，模拟人类的修正行为
    while (current > distance - 2) {
        current -= 1;
        tracks.push(Math.round(current));
    }

    return tracks;
}

/**
 * 识别滑块缺口位置
 * @param {Buffer} backgroundBuffer - 背景图Buffer
 * @param {Buffer} fragmentBuffer - 碎片图Buffer
 * @returns {number} 缺口的X坐标位置
 */
function findGapPosition(backgroundBuffer, fragmentBuffer) {
    try {
        // 验证数据是否为有效的PNG格式
        if (!backgroundBuffer || !fragmentBuffer) {
            throw new Error('图像数据为空');
        }
        
        // 检查是否是PNG格式（文件头为89 50 4E 47 0D 0A 1A 0A）
        if (backgroundBuffer.length < 8 || fragmentBuffer.length < 8) {
            throw new Error('图像数据不完整');
        }
        
        // const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        // for (let i = 0; i < 8; i++) {
        //     if (backgroundBuffer[i] !== pngHeader[i] || fragmentBuffer[i] !== pngHeader[i]) {
        //         throw new Error('图像数据不是有效的PNG格式');
        //     }
        // }
        
        // 解析PNG图像
        const backgroundPng = PNG.sync.read(backgroundBuffer);
        const fragmentPng = PNG.sync.read(fragmentBuffer);
        
        const backgroundData = backgroundPng.data;
        const fragmentData = fragmentPng.data;
        const bgWidth = backgroundPng.width;
        const fgWidth = fragmentPng.width;
        const fgHeight = fragmentPng.height;
        
        // 查找最佳匹配位置
        let minDiff = Infinity;
        let bestX = 0;
        
        // 在背景图中滑动查找最佳匹配位置
        for (let x = 0; x < bgWidth - fgWidth; x++) {
            let diff = 0;
            
            // 比较每个像素点
            for (let fy = 0; fy < fgHeight; fy++) {
                for (let fx = 0; fx < fgWidth; fx++) {
                    const fgIdx = (fy * fgWidth + fx) * 4;
                    const bgIdx = (fy * bgWidth + x + fx) * 4;
                    
                    // 边界检查
                    if (bgIdx + 3 >= backgroundData.length) continue;
                    
                    // 获取RGBA值
                    const fgAlpha = fragmentData[fgIdx + 3];
                    
                    // 如果碎片图的alpha通道不为0，则参与比较
                    if (fgAlpha > 0) {
                        const fgRed = fragmentData[fgIdx];
                        const fgGreen = fragmentData[fgIdx + 1];
                        const fgBlue = fragmentData[fgIdx + 2];
                        
                        const bgRed = backgroundData[bgIdx];
                        const bgGreen = backgroundData[bgIdx + 1];
                        const bgBlue = backgroundData[bgIdx + 2];
                        
                        // 计算颜色差值
                        diff += Math.abs(fgRed - bgRed) + 
                               Math.abs(fgGreen - bgGreen) + 
                               Math.abs(fgBlue - bgBlue);
                    }
                }
            }
            
            if (diff < minDiff) {
                minDiff = diff;
                bestX = x;
            }
        }
        
        return bestX;
    } catch (error) {
        console.error('图像处理错误:', error.message);
        // 如果图像处理失败，返回一个默认值
        return 100; // 返回默认位置
    }
}

/**
 * 使用sharp库识别滑块缺口位置
 * @param {Buffer} backgroundBuffer - 背景图Buffer
 * @param {Buffer} fragmentBuffer - 碎片图Buffer
 * @returns {Promise<number>} 缺口的X坐标位置
 */
async function findGapPositionWithSharp(backgroundBuffer, fragmentBuffer) {
    try {
        // 使用sharp处理图像
        const background = sharp(backgroundBuffer);
        const fragment = sharp(fragmentBuffer);
        
        // 获取图像信息
        const backgroundMetadata = await background.metadata();
        const fragmentMetadata = await fragment.metadata();
        
        const bgWidth = backgroundMetadata.width;
        const fgWidth = fragmentMetadata.width;
        const fgHeight = fragmentMetadata.height;
        
        // 将图像转换为原始像素数据
        const backgroundRaw = await background.raw().toBuffer();
        const fragmentRaw = await fragment.raw().toBuffer();
        
        // 查找最佳匹配位置
        let minDiff = Infinity;
        let bestX = 0;
        
        // 在背景图中滑动查找最佳匹配位置
        for (let x = 0; x < bgWidth - fgWidth; x++) {
            let diff = 0;
            
            // 比较每个像素点
            for (let fy = 0; fy < fgHeight; fy++) {
                for (let fx = 0; fx < fgWidth; fx++) {
                    const fgIdx = (fy * fgWidth + fx) * 4;
                    const bgIdx = (fy * bgWidth + x + fx) * 4;
                    
                    // 边界检查
                    if (bgIdx + 3 >= backgroundRaw.length) continue;
                    
                    // 获取RGBA值
                    const fgAlpha = fragmentRaw[fgIdx + 3];
                    
                    // 如果碎片图的alpha通道不为0，则参与比较
                    if (fgAlpha > 0) {
                        const fgRed = fragmentRaw[fgIdx];
                        const fgGreen = fragmentRaw[fgIdx + 1];
                        const fgBlue = fragmentRaw[fgIdx + 2];
                        
                        const bgRed = backgroundRaw[bgIdx];
                        const bgGreen = backgroundRaw[bgIdx + 1];
                        const bgBlue = backgroundRaw[bgIdx + 2];
                        
                        // 计算颜色差值
                        diff += Math.abs(fgRed - bgRed) + 
                               Math.abs(fgGreen - bgGreen) + 
                               Math.abs(fgBlue - bgBlue);
                    }
                }
            }
            
            if (diff < minDiff) {
                minDiff = diff;
                bestX = x;
            }
        }
        
        return bestX;
    } catch (error) {
        console.error('使用sharp处理图像时出错:', error.message);
        // 如果图像处理失败，返回一个默认值
        return 100;
    }
}

export { solveSliderCaptcha };
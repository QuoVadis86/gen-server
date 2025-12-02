import { launch ,Page,Browser} from 'puppeteer';

/**
 * 浏览器实例池管理器
 * 用于全局管理各平台的浏览器实例，避免重复创建和销毁浏览器
 */

// 浏览器实例池
const browserPool = new Map();

// 页面池，存储每个浏览器的页面
const pagePool = new Map();

// 浏览器关闭定时器
const closeTimers = new Map();

// 浏览器配置
const browserConfigs = {
    tencent: {
        headless: false,
        ignoreHTTPSErrors: true,
        defaultViewport: {
            width: 1366,
            height: 768
        },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-extensions',
            '--no-first-run',
            '--disable-dev-shm-usage',
            '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        ]
    },
    default: {
        headless: true,
        ignoreHTTPSErrors: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    }
};

// 默认keepalive时间为5分钟
const DEFAULT_KEEPALIVE = 5 * 60 * 1000;

/**
 * 获取指定平台的浏览器实例
 * @param {string} platform - 平台名称
 * @returns {Promise<Browser>} 浏览器实例
 */
async function getBrowser(platform = 'default') {
    // 清除关闭定时器（如果存在）
    if (closeTimers.has(platform)) {
        clearTimeout(closeTimers.get(platform));
        closeTimers.delete(platform);
    }
    
    // 如果该平台的浏览器实例已存在且未断开连接，则直接返回
    if (browserPool.has(platform)) {
        const browser = browserPool.get(platform);
        if (browser && !browser.isConnected()) {
            // 如果浏览器已断开连接，则删除该实例
            browserPool.delete(platform);
            pagePool.delete(platform);
        } else {
            return browser;
        }
    }

    // 创建新的浏览器实例
    const config = browserConfigs[platform] || browserConfigs.default;
    const browser = await launch(config);
    
    // 将浏览器实例存入池中
    browserPool.set(platform, browser);
    
    // 初始化页面池
    pagePool.set(platform, []);
    
    // 监听浏览器断开连接事件
    browser.on('disconnected', () => {
        browserPool.delete(platform);
        pagePool.delete(platform);
        if (closeTimers.has(platform)) {
            clearTimeout(closeTimers.get(platform));
            closeTimers.delete(platform);
        }
    });
    
    return browser;
}

/**
 * 为指定平台获取一个新的页面
 * @param {string} platform - 平台名称
 * @returns {Promise<Page>} 页面实例
 */
async function getPage(platform = 'default') {
    const browser = await getBrowser(platform);
    const page = await browser.newPage();
    
    // 将页面加入页面池
    if (!pagePool.has(platform)) {
        pagePool.set(platform, []);
    }
    pagePool.get(platform).push(page);
    
    return page;
}

/**
 * 关闭指定页面并根据keepalive设置决定是否关闭浏览器
 * @param {Page} page - 要关闭的页面
 * @param {string} platform - 平台名称
 * @param {number} keepalive - 保持活跃时间（毫秒）
 * @returns {Promise<void>}
 */
async function closePage(page, platform, keepalive = DEFAULT_KEEPALIVE) {
    if (!page) return;
    
    try {
        await page.close();
    } catch (error) {
        console.warn(`关闭页面时出错: ${error.message}`);
    }
    
    // 从页面池中移除页面
    if (pagePool.has(platform)) {
        const pages = pagePool.get(platform);
        const index = pages.indexOf(page);
        if (index > -1) {
            pages.splice(index, 1);
        }
    }
    
    // 如果页面池为空，设置定时器在keepalive时间后关闭浏览器
    if (pagePool.has(platform) && pagePool.get(platform).length === 0) {
        // 清除之前的定时器
        if (closeTimers.has(platform)) {
            clearTimeout(closeTimers.get(platform));
        }
        
        // 设置新的定时器
        const timer = setTimeout(async () => {
            await closeBrowser(platform);
        }, keepalive);
        
        closeTimers.set(platform, timer);
    }
}

/**
 * 关闭指定平台的浏览器实例
 * @param {string} platform - 平台名称
 * @returns {Promise<void>}
 */
async function closeBrowser(platform) {
    // 清除定时器
    if (closeTimers.has(platform)) {
        clearTimeout(closeTimers.get(platform));
        closeTimers.delete(platform);
    }
    
    if (browserPool.has(platform)) {
        const browser = browserPool.get(platform);
        if (browser && browser.isConnected()) {
            await browser.close();
        }
        browserPool.delete(platform);
        pagePool.delete(platform);
    }
}

/**
 * 关闭所有浏览器实例
 * @returns {Promise<void>}
 */
async function closeAllBrowsers() {
    // 清除所有定时器
    for (const [platform, timer] of closeTimers.entries()) {
        clearTimeout(timer);
    }
    closeTimers.clear();
    
    for (const [platform, browser] of browserPool.entries()) {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }
    browserPool.clear();
    pagePool.clear();
}

/**
 * 获取当前活跃的浏览器数量
 * @returns {number} 浏览器实例数量
 */
function getBrowserCount() {
    return browserPool.size;
}

export { getBrowser, getPage, closePage, closeBrowser, closeAllBrowsers, getBrowserCount };
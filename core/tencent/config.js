/**
 * 腾讯平台配置信息
 * 维护腾讯各产品的appid等配置信息
 */

/**
 * @typedef {Object} AppConfig
 * @property {string} appid - app的appid
 * @property {string} name - app名称
 * @property {string} description - app描述
 */

/**
 * 腾讯平台配置信息
 * @type {Object.<string, AppConfig>}
 */
const apps = {
    'hunyuan': {
        appid: '2048700062',
        name: '混元AI',
        description: '腾讯混元AI平台验证码'
    },
    'yuanbao': {
        appid: '2048700062',
        name: '元宝',
        description: '腾讯元宝平台验证码'
    },
    'meeting': {
        appid: '2001340261',
        name: '会议',
        description: '腾讯会议平台验证码'
    },
    'doc': {
        appid: '2053989439',
        name: '文档',
        description: '腾讯文档平台验证码'
    },
    // 'tencent': {
    //     appid: '2048700062',
    //     name: '腾讯验证码',
    //     description: '腾讯TCaptcha验证码服务'
    // }
    // 可以在这里添加更多腾讯产品的详细配置
    /*
    'example': {
        appid: 'example_appid',
        name: '示例平台',
        description: '示例平台验证码'
    }
    */
};

/**
 * 获取app配置信息
 * @param {string} app - app名称
 * @returns {AppConfig|null} app配置信息，如果找不到返回null
 */
function getApp(app) {
    return apps[app] || null;
}

export { getApp};
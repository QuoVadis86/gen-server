/**
 * 通用错误处理函数
 * @param {Error} error - 捕获到的错误对象
 * @param {Object} res - Express响应对象
 */
function handleGeneralError(error, res) {
    console.error('服务器错误:', error.stack);
    
    // 根据错误类型返回不同的响应
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            error: '参数验证失败',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
    
    if (error.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: '未授权访问',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
    
    // 默认服务器错误
    return res.status(500).json({
        error: '服务器内部错误',
        message: error.message,
        timestamp: new Date().toISOString()
    });
}

/**
 * 处理404错误
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
function handleNotFoundError(req, res) {
    return res.status(404).json({
        error: '接口不存在',
        message: `请求的接口 ${req.originalUrl} 不存在`,
        timestamp: new Date().toISOString()
    });
}

export { handleGeneralError, handleNotFoundError };
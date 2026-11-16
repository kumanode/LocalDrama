// 中文注释不能算泄漏
response.badRequest(res, '缺少参数')
// response.notFound(res, '配置不存在')
throw new Error('流程执行失败')
response.success(res, { message: '成功' })
function f(id) { throw new Error(`任务 ${id} 执行失败`) }
const label = '中文标签，不算用户可见错误'
writeSse(res, { type: 'error', message: '连接失败' })
writeNd({ type: 'error', message: '生成失败' })

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  try {
    const { scene, page } = event

    // 调用微信接口生成小程序码
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: scene,                    // shopId，最长32字符
      page: page || 'pages/index/index', // 必须是已发布的页面
      width: 430,
      autoColor: false,
      lineColor: { r: 7, g: 193, b: 96 }  // 绿色主题
    })

    // 上传到云存储
    const upload = await cloud.uploadFile({
      cloudPath: `wxacode/${scene}_${Date.now()}.png`,
      fileContent: result.buffer
    })

    return {
      code: 0,
      fileID: upload.fileID
    }
  } catch (err) {
    console.error('[getWxacode] 生成失败', err)
    return {
      code: -1,
      errMsg: err.message || '生成小程序码失败'
    }
  }
}

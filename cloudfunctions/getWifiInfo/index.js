// cloudfunctions/getWifiInfo/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const db = cloud.database()
  const { shopId } = event

  if (!shopId) {
    return { code: -1, errMsg: '缺少shopId参数' }
  }

  try {
    const res = await db.collection('wifi_list')
      .where({ shopId: shopId })
      .get()

    if (!res.data || res.data.length === 0) {
      return { code: -2, errMsg: '未找到该WiFi信息' }
    }

    const info = res.data[0]
    // 只返回必要字段，不暴露数据库_id等敏感信息
    return {
      code: 0,
      data: {
        ssid: info.ssid,
        password: info.password,
        shopName: info.shopName
      }
    }
  } catch (err) {
    return { code: -3, errMsg: err.message || '查询失败' }
  }
}
// cloudfunctions/getWifiInfo/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const db = cloud.database()
  const _ = db.command
  const { shopId, action } = event

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

    // 连接成功后递增计数
    if (action === 'incrementCount') {
      await db.collection('wifi_list').doc(info._id).update({
        data: { connectCount: _.inc(1) }
      })
      return { code: 0, msg: '计数已更新' }
    }

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
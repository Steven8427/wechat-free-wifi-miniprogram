/**
 * utils/wifi.js
 * WiFi连接封装
 */

function isDevTools() {
  try {
    return wx.getDeviceInfo().platform === 'devtools'
  } catch (e) {
    return false
  }
}

function initWifi() {
  return new Promise((resolve, reject) => {
    wx.startWifi({
      success: resolve,
      fail: (err) => {
        if (err.errCode === 12001) resolve()
        else reject(err)
      }
    })
  })
}

/**
 * 请求位置权限（Android连WiFi必须）
 * 分三种情况处理：
 * 1. 已授权 → 直接通过
 * 2. 未授权（首次）→ 弹出授权弹窗
 * 3. 曾经拒绝 → 引导去微信小程序设置页开启
 */
function requestLocation() {
  return new Promise((resolve, reject) => {
    // 先查当前小程序内权限状态
    wx.getSetting({
      success: (settingRes) => {
        const locationAuth = settingRes.authSetting['scope.userLocation']

        if (locationAuth === true) {
          // 已授权，直接通过
          resolve()
        } else if (locationAuth === false) {
          // 曾经拒绝过，openSetting 引导重新开启
          wx.showModal({
            title: '需要位置权限',
            content: '连接WiFi需要位置权限，请点击「去开启」在微信设置中打开位置权限',
            confirmText: '去开启',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting({
                  success: (res2) => {
                    if (res2.authSetting['scope.userLocation']) {
                      resolve()
                    } else {
                      reject({ errCode: 12007, errMsg: '用户拒绝授权位置' })
                    }
                  },
                  fail: () => {
                    reject({ errCode: 12007, errMsg: '打开设置失败' })
                  }
                })
              } else {
                reject({ errCode: 12007, errMsg: '用户取消授权' })
              }
            }
          })
        } else {
          // 未曾授权（undefined），首次弹出系统授权弹窗
          wx.authorize({
            scope: 'scope.userLocation',
            success: resolve,
            fail: () => {
              // 用户点了拒绝，引导去设置
              wx.showModal({
                title: '需要位置权限',
                content: '连接WiFi需要位置权限，请点击「去开启」在微信设置中打开位置权限',
                confirmText: '去开启',
                cancelText: '取消',
                success: (res) => {
                  if (res.confirm) {
                    wx.openSetting({
                      success: (res2) => {
                        if (res2.authSetting['scope.userLocation']) {
                          resolve()
                        } else {
                          reject({ errCode: 12007, errMsg: '用户拒绝授权位置' })
                        }
                      }
                    })
                  } else {
                    reject({ errCode: 12007, errMsg: '用户取消授权' })
                  }
                }
              })
            }
          })
        }
      },
      fail: () => {
        reject({ errCode: 12007, errMsg: '获取权限状态失败' })
      }
    })
  })
}

function doConnect(ssid, password) {
  return new Promise((resolve, reject) => {
    wx.connectWifi({
      SSID: ssid,
      password: password,
      maunal: false,
      success: resolve,
      fail: reject
    })
  })
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 校验是否真的连上了目标WiFi
 * connectWifi 的 success 不代表一定连上，这里再确认一次。
 * 策略偏保守：只有明确连到了「另一个」网络才判失败；
 * 拿不到连接信息时不误判（避免把真实成功误报为失败）。
 */
function verifyConnected(ssid) {
  return new Promise((resolve) => {
    wx.getConnectedWifi({
      success: (res) => {
        const current = res.wifi && res.wifi.SSID
        if (current && current !== ssid) {
          resolve({ ok: false, current: current })
        } else {
          resolve({ ok: true })
        }
      },
      fail: () => resolve({ ok: true })
    })
  })
}

/**
 * 连接WiFi（完整流程）
 */
function connectWifi(ssid, password) {
  if (isDevTools()) {
    console.log('[WIFI] 开发者工具模式，模拟连接:', ssid)
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('[WIFI] 模拟连接成功')
        resolve({ errMsg: 'connectWifi:ok (mock)' })
      }, 2000)
    })
  }

  const isAndroid = wx.getDeviceInfo().platform === 'android'
  let chain = Promise.resolve()

  if (isAndroid) {
    chain = chain.then(() => requestLocation())
  }

  return chain
    .then(() => initWifi())
    .then(() => doConnect(ssid, password))
    .then(() => delay(1000))
    .then(() => verifyConnected(ssid))
    .then((v) => {
      if (!v.ok) {
        return Promise.reject({ errCode: -100, errMsg: '未连接到目标WiFi，当前: ' + v.current })
      }
    })
}

module.exports = { connectWifi }
// pages/success/success.js

Page({
  data: {
    ssid: '',
    password: '',
    ip: '',
    isAndroid: false,
    showPassword: false
  },

  onLoad(options) {
    const ssid = options.ssid ? decodeURIComponent(options.ssid) : 'WiFi'
    const password = options.password ? decodeURIComponent(options.password) : ''
    const isAndroid = wx.getDeviceInfo().platform === 'android'
    this.setData({ ssid, password, isAndroid })
    // SEO: 动态设置页面标题
    wx.setNavigationBarTitle({ title: ssid + ' - 连接成功' })
    this._getConnectedInfo()

    // 安卓自动复制密码，方便用户去系统设置手动连接
    if (isAndroid && password) {
      wx.setClipboardData({
        data: password,
        success: () => {
          wx.showToast({ title: '密码已自动复制', icon: 'success', duration: 2000 })
        }
      })
    }
  },

  _getConnectedInfo() {
    wx.getConnectedWifi({
      success: (res) => console.log('[WIFI] 当前连接信息', res.wifi),
      fail: (err) => console.log('[WIFI] 获取连接信息失败', err)
    })
    wx.getLocalIPAddress({
      success: (res) => this.setData({ ip: res.localip || '' }),
      fail: () => this.setData({ ip: '' })
    })
  },

  // 复制密码到剪贴板
  onCopyPassword() {
    wx.setClipboardData({
      data: this.data.password,
      success: () => {
        wx.showToast({ title: '密码已复制', icon: 'success' })
      }
    })
  },

  onDone() {
    if (this.data.isAndroid) {
      wx.showToast({
        title: '请点右上角 ⊙ 退出',
        icon: 'none',
        duration: 3000
      })
    } else {
      wx.exitMiniProgram()
    }
  },

  onShareAppMessage() {
    return {
      title: this.data.ssid + ' - 免费WiFi，扫码即连',
      path: '/pages/index/index',
      imageUrl: ''
    }
  }
})

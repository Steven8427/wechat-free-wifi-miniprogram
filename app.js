// app.js

App({
  onLaunch(options) {
    console.log('[APP] 启动参数', options)

    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'YOUR_CLOUD_ENV_ID_HERE',
        traceUser: true
      })
    }

    // 处理扫码进入的场景
    const scanScenes = [1047, 1048, 1011, 1012, 1013]
    if (scanScenes.includes(options.scene)) {
      this._parseScanQuery(options.query)
    }

    // 监听隐私授权（正式版必须用此方式，showModal方式无效）
    if (wx.onNeedPrivacyAuthorization) {
      wx.onNeedPrivacyAuthorization((resolve) => {
        this.globalData._privacyResolve = resolve
        this.globalData._showPrivacyModal = true
        // 通知当前页面显示隐私弹窗
        const pages = getCurrentPages()
        const currentPage = pages[pages.length - 1]
        if (currentPage && currentPage.showPrivacyModal) {
          currentPage.showPrivacyModal()
        }
      })
    }
  },

  onShow(options) {
    if (options.query && options.query.shopId) {
      this._parseScanQuery(options.query)
    }
  },

  _parseScanQuery(query) {
    if (!query) return
    if (query.ssid) this.globalData.ssid = decodeURIComponent(query.ssid)
    if (query.shopId) this.globalData.shopId = query.shopId
    if (query.shopName) this.globalData.shopName = decodeURIComponent(query.shopName)
    console.log('[APP] 扫码参数已解析', this.globalData)
  },

  globalData: {
    ssid: '',
    shopId: '',
    shopName: ''
  }
})
// pages/index/index.js
const wifiHelper = require('../../utils/wifi')

const AD_CONFIG = {
  duration: 15,
  title: '欢迎光临',
  desc: '关注公众号获取更多优惠',
  imageUrl: '',
  linkUrl: ''
}

Page({
  data: {
    wifiInfo: {
      ssid: '',
      encryption: 'WPA2',
      shopName: ''
    },
    isAndroid: false,
    connecting: false,
    showAd: false,
    countdown: 0,
    adProgress: 0,
    adConfig: AD_CONFIG
  },

  _timer: null,
  _wifiPassword: '',

  onLoad(options) {
    // 小程序码扫码参数在 options.scene，官方生成器/普通跳转在 options.shopId
    const shopId = options.scene || options.shopId || '001'
    this._shopId = shopId
    const isAndroid = wx.getDeviceInfo().platform === 'android'
    this.setData({ isAndroid })
    this._fetchWifiPassword(shopId)
  },

  onUnload() {
    this._clearTimer()
  },

  _fetchWifiPassword(shopId) {
    // 通过云函数查询，云函数有管理员权限，数据库可设为「仅创建者可读写」
    wx.cloud.callFunction({
      name: 'getWifiInfo',
      data: { shopId: shopId }
    })
    .then(res => {
      const result = res.result
      if (result.code === 0) {
        this._wifiPassword = result.data.password
        this.setData({
          'wifiInfo.ssid': result.data.ssid,
          'wifiInfo.shopName': result.data.shopName
        })
        // SEO: 设置动态页面标题，帮助搜索引擎理解页面内容
        const title = result.data.shopName
          ? result.data.shopName + ' - 免费WiFi连接'
          : result.data.ssid + ' - 免费WiFi连接'
        wx.setNavigationBarTitle({ title: title })
        console.log('[WIFI] 查询成功', result.data.ssid)
      } else {
        console.warn('[WIFI] 未找到:', result.errMsg)
        wx.showToast({ title: '未找到该WiFi信息', icon: 'none' })
      }
    })
    .catch(err => {
      console.error('[WIFI] 云函数调用失败', err)
      wx.showToast({ title: '加载失败，请重试', icon: 'none' })
    })
  },

  onConnect() {
    // 爬虫访问时跳过广告和连接流程，直接展示页面内容
    const app = getApp()
    if (app.globalData.isCrawler) return
    // this._showCustomAd()  // 开启广告时取消注释
    this._startConnect()
  },

  _showCustomAd() {
    const duration = this.data.adConfig.duration || 15
    this.setData({ showAd: true, countdown: duration, adProgress: 0 })
    let elapsed = 0
    this._timer = setInterval(() => {
      elapsed++
      const remaining = duration - elapsed
      const progress = (elapsed / duration) * 100
      this.setData({
        countdown: remaining >= 0 ? remaining : 0,
        adProgress: progress > 100 ? 100 : progress
      })
      if (remaining <= 0) this._clearTimer()
    }, 1000)
  },

  onAdClose() {
    this._clearTimer()
    this.setData({ showAd: false })
    this._startConnect()
  },

  onAdTap() {
    const url = this.data.adConfig.linkUrl
    if (url) wx.navigateTo({ url })
  },

  preventMove() { return },

  _clearTimer() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  _startConnect() {
    this.setData({ connecting: true })
    const ssid = this.data.wifiInfo.ssid
    const password = this._wifiPassword || ''
    wifiHelper.connectWifi(ssid, password)
      .then(() => {
        console.log('[WIFI] 连接成功')
        wx.redirectTo({
          url: '/pages/success/success?ssid=' + encodeURIComponent(ssid) + '&password=' + encodeURIComponent(password)
        })
      })
      .catch((err) => {
        console.error('[WIFI] 连接失败', err)
        this.setData({ connecting: false })
        let msg = '连接失败，请重试'
        if (err.errCode === 12007) msg = '用户拒绝授权，无法连接WiFi'
        else if (err.errCode === 12005) msg = '未找到该WiFi，请确认在信号范围内'
        else if (err.errCode === 12010) msg = '系统不支持该操作'
        else if (err.errCode === 12013) msg = 'WiFi密码错误'
        wx.showModal({ title: '连接失败', content: msg, showCancel: false })
      })
  },

  onShareAppMessage() {
    const shopName = this.data.wifiInfo.shopName
    const ssid = this.data.wifiInfo.ssid
    return {
      title: shopName ? shopName + ' - 免费WiFi，扫码即连' : '免费WiFi，扫码即连 - ' + ssid,
      path: '/pages/index/index?shopId=' + (this._shopId || ''),
      imageUrl: '' // 可替换为店铺缩略图或品牌图
    }
  }
})
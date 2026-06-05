// pages/profile/profile.js

const CONTACT = {
  authorWechat: 'Steven_ryz',   // 作者微信号
}

const APP_VERSION = 'v1.0.0'

Page({
  data: {
    version: APP_VERSION
  },

  onFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback' })
  },

  onContact() {
    this._showContact('联系作者', CONTACT.authorWechat)
  },

  _showContact(title, wechat) {
    wx.showModal({
      title: title,
      content: '微信号：' + wechat + '\n\n复制后可在微信中添加好友',
      confirmText: '复制微信号',
      cancelText: '关闭',
      confirmColor: '#07C160',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: wechat,
            success: () => wx.showToast({ title: '微信号已复制', icon: 'success' })
          })
        }
      }
    })
  },

  onAbout() {
    wx.showModal({
      title: '关于灵动wifi连接',
      content: '一款生成WiFi连接码的小工具，扫码即可一键连网，无需手动输入密码。\n\n当前版本 ' + APP_VERSION,
      showCancel: false,
      confirmText: '我知道了',
      confirmColor: '#07C160'
    })
  },

  onShareAppMessage() {
    return {
      title: '扫码连WiFi，一键生成WiFi码',
      path: '/pages/list/list',
      imageUrl: ''
    }
  }
})

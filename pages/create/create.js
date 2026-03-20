// pages/create/create.js

Page({
  data: {
    shopName: '',
    ssid: '',
    password: '',
    creating: false,
    showResult: false,
    qrcodeUrl: '',
    currentShopId: ''
  },

  // ========== 表单输入 ==========

  onInputShopName(e) {
    this.setData({ shopName: e.detail.value })
  },

  onInputSsid(e) {
    this.setData({ ssid: e.detail.value })
  },

  onInputPassword(e) {
    this.setData({ password: e.detail.value })
  },

  // ========== 创建WiFi码 ==========

  async onCreate() {
    var that = this
    var shopName = that.data.shopName
    var ssid = that.data.ssid
    var password = that.data.password

    if (!ssid || !ssid.trim()) {
      wx.showToast({ title: '请输入WiFi名称', icon: 'none' })
      return
    }
    if (!password || !password.trim()) {
      wx.showToast({ title: '请输入WiFi密码', icon: 'none' })
      return
    }

    that.setData({ creating: true })

    try {
      // 1. 生成唯一 shopId
      var shopId = that._generateShopId()

      // 2. 保存到云数据库
      var db = wx.cloud.database()
      await db.collection('wifi_list').add({
        data: {
          shopId: shopId,
          ssid: ssid.trim(),
          password: password.trim(),
          shopName: (shopName && shopName.trim()) ? shopName.trim() : ssid.trim(),
          createTime: db.serverDate(),
          connectCount: 0
        }
      })

      console.log('[CREATE] WiFi已保存, shopId:', shopId)

      // 3. 调用云函数生成小程序码
      var res = await wx.cloud.callFunction({
        name: 'getWxacode',
        data: {
          scene: shopId,
          page: 'pages/index/index'
        }
      })

      if (res.result && res.result.code === 0) {
        // 获取临时URL
        var tempRes = await wx.cloud.getTempFileURL({
          fileList: [res.result.fileID]
        })
        var tempUrl = ''
        if (tempRes.fileList && tempRes.fileList[0]) {
          tempUrl = tempRes.fileList[0].tempFileURL
        }

        that.setData({
          creating: false,
          showResult: true,
          qrcodeUrl: tempUrl,
          currentShopId: shopId
        })

        // 更新数据库记录
        db.collection('wifi_list').where({ shopId: shopId }).update({
          data: { qrcodeFileID: res.result.fileID }
        })
      } else {
        throw new Error((res.result && res.result.errMsg) || '生成失败')
      }

    } catch (err) {
      console.error('[CREATE] 创建失败', err)
      that.setData({ creating: false })
      wx.showModal({
        title: '创建失败',
        content: err.message || '请稍后重试',
        showCancel: false
      })
    }
  },

  // ========== 工具方法 ==========

  _generateShopId: function() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    var id = ''
    for (var i = 0; i < 6; i++) {
      id += chars[Math.floor(Math.random() * chars.length)]
    }
    return id
  },

  // ========== 保存图片 ==========

  onSaveImage: function() {
    var url = this.data.qrcodeUrl
    if (!url) return

    wx.downloadFile({
      url: url,
      success: function(downloadRes) {
        wx.saveImageToPhotosAlbum({
          filePath: downloadRes.tempFilePath,
          success: function() {
            wx.showToast({ title: '已保存到相册', icon: 'success' })
          },
          fail: function(err) {
            if (err.errMsg && err.errMsg.indexOf('auth deny') > -1) {
              wx.showModal({
                title: '需要相册权限',
                content: '请在设置中允许保存图片到相册',
                confirmText: '去设置',
                success: function(res) {
                  if (res.confirm) wx.openSetting()
                }
              })
            } else {
              wx.showToast({ title: '保存失败', icon: 'none' })
            }
          }
        })
      },
      fail: function() {
        wx.showToast({ title: '下载失败', icon: 'none' })
      }
    })
  },

  // ========== 返回新建 ==========

  onBackToCreate: function() {
    this.setData({
      showResult: false,
      shopName: '',
      ssid: '',
      password: ''
    })
  },

  onShareAppMessage: function() {
    return {
      title: '扫码连WiFi，一键生成WiFi码',
      path: '/pages/create/create',
      imageUrl: ''
    }
  }
})
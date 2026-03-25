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

  // ========== 保存二维码图片 ==========

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

  // ========== 保存海报 ==========

  onSavePoster: function() {
    var url = this.data.qrcodeUrl
    if (!url) { wx.showToast({ title: '图片还未加载', icon: 'none' }); return }
    this._drawAndSave(url)
  },

  _roundRect: function(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  },

  _drawAndSave: function(qrcodeUrl) {
    wx.showLoading({ title: '生成海报中...' })

    var ssid = this.data.ssid
    var ratio = wx.getWindowInfo().pixelRatio
    var W = 375
    var H = 560
    var that = this

    var query = wx.createSelectorQuery()
    query.select('#posterCanvas').fields({ node: true, size: true }).exec(function(res) {
      var canvas = res[0].node
      var ctx = canvas.getContext('2d')
      canvas.width = W * ratio
      canvas.height = H * ratio
      ctx.scale(ratio, ratio)

      wx.downloadFile({
        url: qrcodeUrl,
        success: function(dlRes) {
          var img = canvas.createImage()
          img.src = dlRes.tempFilePath
          img.onload = function() {
            // 背景
            ctx.fillStyle = '#07C160'
            ctx.fillRect(0, 0, W, H)

            // 白色主卡片
            ctx.fillStyle = '#ffffff'
            that._roundRect(ctx, 20, 20, W - 40, H - 100, 20)
            ctx.fill()

            // 标题
            ctx.fillStyle = '#07C160'
            ctx.font = 'bold 24px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('微信扫码连WiFi', W / 2, 70)

            // 副标题
            ctx.fillStyle = '#888'
            ctx.font = '13px sans-serif'
            ctx.fillText('一键快速连接 · 无需密码 · 安全防蹭网', W / 2, 96)

            // 二维码
            var qrSize = 210
            var qrX = (W - qrSize) / 2
            var qrY = 115
            ctx.drawImage(img, qrX, qrY, qrSize, qrSize)

            // WiFi名称
            ctx.fillStyle = '#1a1a1a'
            ctx.font = 'bold 26px sans-serif'
            ctx.fillText(ssid, W / 2, qrY + qrSize + 58)

            ctx.fillStyle = '#999'
            ctx.font = '13px sans-serif'
            ctx.fillText('无需密码，扫码就能连！', W / 2, qrY + qrSize + 82)

            // 底部文字
            ctx.fillStyle = 'rgba(255,255,255,0.9)'
            ctx.font = '12px sans-serif'
            ctx.fillText('长按识别小程序码连接WiFi', W / 2, H - 30)

            // 导出并保存
            wx.canvasToTempFilePath({
              canvas: canvas,
              success: function(r) {
                wx.saveImageToPhotosAlbum({
                  filePath: r.tempFilePath,
                  success: function() {
                    wx.hideLoading()
                    wx.showToast({ title: '海报已保存到相册', icon: 'success' })
                  },
                  fail: function(err) {
                    wx.hideLoading()
                    if (err.errMsg && err.errMsg.indexOf('auth') > -1) {
                      wx.showModal({
                        title: '需要相册权限',
                        content: '请在设置中允许访问相册',
                        confirmText: '去设置',
                        success: function(r) { if (r.confirm) wx.openSetting() }
                      })
                    } else {
                      wx.showToast({ title: '保存失败', icon: 'none' })
                    }
                  }
                })
              },
              fail: function() {
                wx.hideLoading()
                wx.showToast({ title: '生成失败', icon: 'none' })
              }
            })
          }
          img.onerror = function() {
            wx.hideLoading()
            wx.showToast({ title: '图片加载失败', icon: 'none' })
          }
        },
        fail: function() {
          wx.hideLoading()
          wx.showToast({ title: '下载失败', icon: 'none' })
        }
      })
    })
  },

  // ========== 返回新建 ==========

  onBackToList: function() {
    wx.navigateBack({ delta: 1 })
  },

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
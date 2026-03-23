// pages/manage/manage.js

Page({
  data: {
    shopId: '',
    recordId: '',
    qrcodeFileID: '',  // 云存储文件ID，删除时一并清除
    ssid: '',
    password: '',
    shopName: '',
    qrcodeUrl: '',
    themeIndex: 0,
    loading: true,
    editing: false,
    editSsid: '',
    editPassword: '',
    editShopName: '',
    saving: false,
    showPrivacyModal: false,
    themes: [
      { bg: '#07C160', text: '#fff' },
      { bg: '#1890FF', text: '#fff' },
      { bg: '#FF6B35', text: '#fff' },
      { bg: '#9B59B6', text: '#fff' },
      { bg: '#1a1a1a', text: '#fff' }
    ]
  },

  onLoad(options) {
    const ssid = options.ssid ? decodeURIComponent(options.ssid) : ''
    this.setData({ shopId: options.shopId || '', ssid: ssid })
    // SEO: 动态设置页面标题
    if (ssid) wx.setNavigationBarTitle({ title: ssid + ' - WiFi管理' })
    this._loadDetail(options.shopId)
  },

  _loadDetail(shopId) {
    if (!shopId) return
    const db = wx.cloud.database()
    db.collection('wifi_list')
      .where({ shopId: shopId })
      .get()
      .then(res => {
        if (!res.data || res.data.length === 0) {
          this.setData({ loading: false })
          return
        }
        const item = res.data[0]
        this.setData({
          recordId: item._id,
          ssid: item.ssid,
          password: item.password || '',
          shopName: item.shopName || '',
          qrcodeFileID: item.qrcodeFileID || ''
        })
        if (!item.qrcodeFileID) {
          this.setData({ loading: false })
          return
        }
        wx.cloud.getTempFileURL({
          fileList: [item.qrcodeFileID],
          success: (tempRes) => {
            const url = tempRes.fileList[0] ? tempRes.fileList[0].tempFileURL : ''
            this.setData({ qrcodeUrl: url, loading: false })
          },
          fail: () => { this.setData({ loading: false }) }
        })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  // ========== 编辑功能 ==========

  onStartEdit() {
    this.setData({
      editing: true,
      editSsid: this.data.ssid,
      editPassword: this.data.password,
      editShopName: this.data.shopName
    })
  },

  onCancelEdit() {
    this.setData({ editing: false })
  },

  onEditSsid(e) { this.setData({ editSsid: e.detail.value }) },
  onEditPassword(e) { this.setData({ editPassword: e.detail.value }) },
  onEditShopName(e) { this.setData({ editShopName: e.detail.value }) },

  onSaveEdit() {
    const { editSsid, editPassword, editShopName, recordId } = this.data
    if (!editSsid || !editSsid.trim()) {
      wx.showToast({ title: '请输入WiFi名称', icon: 'none' })
      return
    }
    if (!editPassword || !editPassword.trim()) {
      wx.showToast({ title: '请输入WiFi密码', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    const db = wx.cloud.database()
    const newData = {
      ssid: editSsid.trim(),
      password: editPassword.trim(),
      shopName: (editShopName && editShopName.trim()) ? editShopName.trim() : editSsid.trim()
    }

    db.collection('wifi_list').doc(recordId).update({ data: newData })
      .then(() => {
        this.setData({
          ssid: newData.ssid,
          password: newData.password,
          shopName: newData.shopName,
          editing: false,
          saving: false
        })
        wx.setNavigationBarTitle({ title: newData.ssid + ' - WiFi管理' })
        wx.showToast({ title: '保存成功', icon: 'success' })
      })
      .catch(() => {
        this.setData({ saving: false })
        wx.showToast({ title: '保存失败', icon: 'none' })
      })
  },

  onChangeTheme() {
    const next = (this.data.themeIndex + 1) % this.data.themes.length
    this.setData({ themeIndex: next })
  },

  onSavePoster() {
    const url = this.data.qrcodeUrl
    if (!url) { wx.showToast({ title: '图片还未加载', icon: 'none' }); return }
    this._drawAndSave(url)
  },

  // 隐私弹窗相关
  showPrivacyModal() {
    this.setData({ showPrivacyModal: true })
  },

  onPrivacyAgree() {
    this.setData({ showPrivacyModal: false })
    const app = getApp()
    if (app.globalData._privacyResolve) {
      app.globalData._privacyResolve({ buttonId: 'agree', event: 'agree' })
      app.globalData._privacyResolve = null
    }
  },

  onPrivacyDisagree() {
    this.setData({ showPrivacyModal: false })
    const app = getApp()
    if (app.globalData._privacyResolve) {
      app.globalData._privacyResolve({ buttonId: 'disagree', event: 'disagree' })
      app.globalData._privacyResolve = null
    }
    wx.showToast({ title: '已拒绝，无法保存', icon: 'none' })
  },

  // 手动绘制圆角矩形（兼容微信canvas）
  _roundRect(ctx, x, y, w, h, r) {
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

  _drawAndSave(qrcodeUrl) {
    wx.showLoading({ title: '生成海报中...' })

    const theme = this.data.themes[this.data.themeIndex]
    const ssid = this.data.ssid
    const ratio = wx.getWindowInfo().pixelRatio

    const W = 375
    const H = 560

    const query = wx.createSelectorQuery()
    query.select('#posterCanvas').fields({ node: true, size: true }).exec((res) => {
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      canvas.width = W * ratio
      canvas.height = H * ratio
      ctx.scale(ratio, ratio)

      wx.downloadFile({
        url: qrcodeUrl,
        success: (dlRes) => {
          const img = canvas.createImage()
          img.src = dlRes.tempFilePath
          img.onload = () => {
            // 1. 背景
            ctx.fillStyle = theme.bg
            ctx.fillRect(0, 0, W, H)

            // 2. 白色主卡片
            ctx.fillStyle = '#ffffff'
            this._roundRect(ctx, 20, 20, W - 40, H - 100, 20)
            ctx.fill()

            // 3. 标题（绿色）
            ctx.fillStyle = theme.bg
            ctx.font = 'bold 24px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('微信扫码连WiFi', W / 2, 70)

            // 4. 副标题
            ctx.fillStyle = '#888'
            ctx.font = '13px sans-serif'
            ctx.fillText('一键快速连接 · 无需密码 · 安全防蹭网', W / 2, 96)

            // 5. 二维码
            const qrSize = 210
            const qrX = (W - qrSize) / 2
            const qrY = 115
            ctx.drawImage(img, qrX, qrY, qrSize, qrSize)

            // 6. WiFi名称
            ctx.fillStyle = '#1a1a1a'
            ctx.font = 'bold 26px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(ssid, W / 2, qrY + qrSize + 58)

            ctx.fillStyle = '#999'
            ctx.font = '13px sans-serif'
            ctx.fillText('无需密码，扫码就能连！', W / 2, qrY + qrSize + 82)

            // 8. 底部绿色区域文字
            ctx.fillStyle = 'rgba(255,255,255,0.9)'
            ctx.font = '12px sans-serif'
            ctx.fillText('长按识别小程序码连接WiFi', W / 2, H - 30)

            // 9. 导出并保存
            wx.canvasToTempFilePath({
              canvas: canvas,
              success: (r) => {
                wx.saveImageToPhotosAlbum({
                  filePath: r.tempFilePath,
                  success: () => {
                    wx.hideLoading()
                    wx.showToast({ title: '海报已保存到相册', icon: 'success' })
                  },
                  fail: (err) => {
                    wx.hideLoading()
                    if (err.errMsg && err.errMsg.indexOf('auth') > -1) {
                      // 安卓直接重试，系统会弹出权限申请
                      const sysInfo = wx.getDeviceInfo()
                      if (sysInfo.platform === 'android') {
                        wx.showToast({ title: '请在系统设置中允许相册权限', icon: 'none', duration: 2000 })
                      } else {
                        // iOS 引导去微信设置
                        wx.showModal({
                          title: '需要相册权限',
                          content: '请在微信设置中允许访问相册',
                          confirmText: '去设置',
                          cancelText: '取消',
                          success: (r) => { if (r.confirm) wx.openSetting() }
                        })
                      }
                    } else {
                      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
                    }
                  }
                })
              },
              fail: () => {
                wx.hideLoading()
                wx.showToast({ title: '生成失败，请重试', icon: 'none' })
              }
            })
          }
          img.onerror = () => {
            wx.hideLoading()
            wx.showToast({ title: '图片加载失败', icon: 'none' })
          }
        },
        fail: () => {
          wx.hideLoading()
          wx.showToast({ title: '下载失败，请重试', icon: 'none' })
        }
      })
    })
  },

  onPreviewQrcode() {
    const url = this.data.qrcodeUrl
    if (!url) { wx.showToast({ title: '图片还未加载', icon: 'none' }); return }
    wx.previewImage({ urls: [url], current: url })
  },

  onDelete() {
    wx.showModal({
      title: '确认删除',
      content: `确定删除 "${this.data.ssid}" 的WiFi码吗？`,
      confirmColor: '#FF4444',
      success: (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '删除中...' })
        const db = wx.cloud.database()
        const fileID = this.data.qrcodeFileID

        // 1. 删除数据库记录
        db.collection('wifi_list').doc(this.data.recordId).remove()
          .then(() => {
            // 2. 同步删除云存储里的图片文件
            if (fileID) {
              return wx.cloud.deleteFile({ fileList: [fileID] })
            }
          })
          .then(() => {
            wx.hideLoading()
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1500)
          })
          .catch(() => {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
      }
    })
  },

  onShareAppMessage() {
    return { title: '扫码连WiFi，一键生成WiFi码', path: '/pages/list/list' }
  }
})
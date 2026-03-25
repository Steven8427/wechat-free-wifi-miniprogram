// pages/list/list.js

Page({
  data: {
    wifiList: [],
    filteredList: [],
    searchKey: '',
    loading: true
  },

  onLoad() {
    this._loadWifiList()
  },

  onShow() {
    this._loadWifiList()
  },

  _loadWifiList() {
    this.setData({ loading: true })
    const db = wx.cloud.database()

    // 只查询当前登录用户自己创建的记录（云数据库会自动用 _openid 过滤）
    db.collection('wifi_list')
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        const fileIDs = res.data
          .filter(item => item.qrcodeFileID)
          .map(item => item.qrcodeFileID)

        if (fileIDs.length === 0) {
          this.setData({ wifiList: res.data, filteredList: res.data, loading: false })
          return
        }

        wx.cloud.getTempFileURL({
          fileList: fileIDs,
          success: (tempRes) => {
            const urlMap = {}
            tempRes.fileList.forEach(f => { urlMap[f.fileID] = f.tempFileURL })
            const list = res.data.map(item => ({
              ...item,
              tempQrcodeUrl: item.qrcodeFileID ? (urlMap[item.qrcodeFileID] || '') : ''
            }))
            this.setData({ wifiList: list, filteredList: list, loading: false })
          },
          fail: () => {
            this.setData({ wifiList: res.data, filteredList: res.data, loading: false })
          }
        })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败，请重试', icon: 'none' })
      })
  },

  onSearchInput(e) {
    const key = e.detail.value.trim().toLowerCase()
    this.setData({ searchKey: key })
    if (!key) {
      this.setData({ filteredList: this.data.wifiList })
      return
    }
    const filtered = this.data.wifiList.filter(item =>
      (item.shopName && item.shopName.toLowerCase().includes(key)) ||
      (item.ssid && item.ssid.toLowerCase().includes(key))
    )
    this.setData({ filteredList: filtered })
  },

  onSearchClear() {
    this.setData({ searchKey: '', filteredList: this.data.wifiList })
  },

  onDelete(e) {
    const { id, ssid, fileid } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: `确定要删除 "${ssid}" 的WiFi码吗？`,
      confirmColor: '#FF4444',
      success: (res) => {
        if (res.confirm) {
          const db = wx.cloud.database()
          db.collection('wifi_list').doc(id).remove()
            .then(() => {
              // 同步删除云存储里的二维码图片
              if (fileid) {
                wx.cloud.deleteFile({ fileList: [fileid] })
              }
              wx.showToast({ title: '已删除', icon: 'success' })
              this._loadWifiList()
            })
            .catch(() => { wx.showToast({ title: '删除失败', icon: 'none' }) })
        }
      }
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
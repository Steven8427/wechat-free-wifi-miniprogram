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
    this._fetchAllRecords()
      .then(records => this._attachQrcodeUrls(records))
      .then(list => {
        this.setData({ wifiList: list, filteredList: list, loading: false })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败，请重试', icon: 'none' })
      })
  },

  // 小程序端单次最多返回20条，循环分页拉取全部记录（云数据库会自动用 _openid 过滤）
  async _fetchAllRecords() {
    const db = wx.cloud.database()
    const PAGE = 20
    let all = []
    let skip = 0
    while (true) {
      const res = await db.collection('wifi_list')
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(PAGE)
        .get()
      all = all.concat(res.data)
      if (res.data.length < PAGE) break
      skip += PAGE
    }
    return all
  },

  // getTempFileURL 单次最多50个，分批换取临时链接
  async _attachQrcodeUrls(records) {
    const fileIDs = records.filter(r => r.qrcodeFileID).map(r => r.qrcodeFileID)
    if (fileIDs.length === 0) return records
    const urlMap = {}
    for (let i = 0; i < fileIDs.length; i += 50) {
      const batch = fileIDs.slice(i, i + 50)
      try {
        const res = await wx.cloud.getTempFileURL({ fileList: batch })
        res.fileList.forEach(f => { urlMap[f.fileID] = f.tempFileURL })
      } catch (e) {
        // 某一批失败就跳过，对应卡片用占位图
      }
    }
    return records.map(r => ({
      ...r,
      tempQrcodeUrl: r.qrcodeFileID ? (urlMap[r.qrcodeFileID] || '') : ''
    }))
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
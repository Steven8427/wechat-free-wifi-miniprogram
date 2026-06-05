// pages/feedback/feedback.js

Page({
  data: {
    content: '',
    contact: '',
    submitting: false
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value })
  },

  onSubmit() {
    const content = this.data.content.trim()
    if (!content) {
      wx.showToast({ title: '请输入反馈内容', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    const db = wx.cloud.database()
    db.collection('feedbacks').add({
      data: {
        content: content,
        contact: this.data.contact.trim(),
        createTime: db.serverDate()
      }
    })
    .then(() => {
      wx.showToast({ title: '提交成功，感谢反馈', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    })
    .catch((err) => {
      console.error('[FEEDBACK] 提交失败', err)
      this.setData({ submitting: false })
      wx.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
    })
  }
})

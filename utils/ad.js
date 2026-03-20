/**
 * utils/ad.js
 * 微信激励视频广告封装（备用）
 * 
 * 当前使用自定义广告页（pages/index/index.js 内置）
 * 等小程序UV >= 1000 开通流量主后，可切换为微信激励视频：
 * 
 * 切换步骤：
 * 1. 在微信后台开通流量主，创建激励视频广告位
 * 2. 把下面 AD_UNIT_ID 替换为你的广告位ID
 * 3. 在 pages/index/index.js 中：
 *    - 引入本文件: const adHelper = require('../../utils/ad')
 *    - onLoad 中调用: this._rewardedAd = adHelper.createAd()
 *    - onConnect 中改为: adHelper.showAd(this._rewardedAd, { onComplete, onSkip, onError })
 */

const AD_UNIT_ID = 'adunit-xxxxxxxxxxxxx'

function createAd() {
  if (!wx.createRewardedVideoAd) {
    console.warn('[AD] 当前基础库不支持激励视频广告')
    return null
  }

  const ad = wx.createRewardedVideoAd({ adUnitId: AD_UNIT_ID })

  ad.onError((err) => {
    console.error('[AD] 广告加载失败', err)
  })

  ad.load().catch(() => {
    console.log('[AD] 预加载失败，播放时会重试')
  })

  return ad
}

function showAd(adInstance, callbacks) {
  const { onComplete, onSkip, onError } = callbacks

  if (!adInstance) {
    if (onError) onError({ errMsg: '广告组件不可用' })
    return
  }

  const onCloseHandler = (res) => {
    adInstance.offClose(onCloseHandler)
    if (res && res.isEnded) {
      if (onComplete) onComplete()
    } else {
      if (onSkip) onSkip()
    }
  }

  adInstance.onClose(onCloseHandler)

  adInstance.show().catch(() => {
    adInstance.load()
      .then(() => adInstance.show())
      .catch((err) => {
        adInstance.offClose(onCloseHandler)
        if (onError) onError(err)
      })
  })
}

module.exports = { createAd, showAd }
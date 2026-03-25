// cloudfunctions/cleanOrphanFiles/index.js
// 清理云存储中没有数据库记录对应的孤立二维码文件
// 用法：从前端传入云存储中所有 fileID，云函数对比数据库后删除孤立的
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const db = cloud.database()
  const { fileIDs = [], dryRun = true } = event

  if (!fileIDs.length) {
    return { code: -1, errMsg: '请传入 fileIDs 参数' }
  }

  try {
    // 1. 获取数据库中所有在用的 qrcodeFileID
    const usedFileIDs = new Set()
    let offset = 0
    const limit = 100
    while (true) {
      const res = await db.collection('wifi_list')
        .skip(offset)
        .limit(limit)
        .field({ qrcodeFileID: true })
        .get()
      res.data.forEach(item => {
        if (item.qrcodeFileID) usedFileIDs.add(item.qrcodeFileID)
      })
      if (res.data.length < limit) break
      offset += limit
    }

    // 2. 找出孤立文件
    const orphanFiles = fileIDs.filter(id => !usedFileIDs.has(id))

    if (orphanFiles.length === 0) {
      return { code: 0, msg: '没有孤立文件需要清理', deleted: 0, usedCount: usedFileIDs.size }
    }

    if (dryRun) {
      return {
        code: 0,
        msg: '预览模式',
        orphanCount: orphanFiles.length,
        usedCount: usedFileIDs.size
      }
    }

    // 3. 删除孤立文件（每次最多50个）
    let deletedCount = 0
    for (let i = 0; i < orphanFiles.length; i += 50) {
      const batch = orphanFiles.slice(i, i + 50)
      await cloud.deleteFile({ fileList: batch })
      deletedCount += batch.length
    }

    return { code: 0, msg: '清理完成', deleted: deletedCount, usedCount: usedFileIDs.size }
  } catch (err) {
    return { code: -1, errMsg: err.message || '清理失败' }
  }
}

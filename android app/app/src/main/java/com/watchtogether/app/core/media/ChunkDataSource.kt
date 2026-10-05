package com.watchtogether.app.core.media

import android.content.Context
import java.io.File
import java.io.RandomAccessFile

class ChunkCacheManager(private val context: Context) {
    private var tempFile: File? = null
    private var randomAccessFile: RandomAccessFile? = null
    var totalBytesReceived: Long = 0L
        private set
    var expectedTotalSize: Long = 0L

    fun prepareCacheFile(fileId: String, totalSize: Long): File {
        clearCache()
        expectedTotalSize = totalSize
        totalBytesReceived = 0L
        val file = File(context.cacheDir, "watchtogether_${fileId}.tmp")
        if (file.exists()) {
            file.delete()
        }
        file.createNewFile()
        tempFile = file
        randomAccessFile = RandomAccessFile(file, "rw")
        return file
    }

    @Synchronized
    fun writeChunk(offset: Long, data: ByteArray) {
        randomAccessFile?.let { raf ->
            raf.seek(offset)
            raf.write(data)
            val endOffset = offset + data.size
            if (endOffset > totalBytesReceived) {
                totalBytesReceived = endOffset
            }
        }
    }

    fun getCacheFile(): File? = tempFile

    @Synchronized
    fun clearCache() {
        try {
            randomAccessFile?.close()
        } catch (e: Exception) {}
        randomAccessFile = null
        tempFile?.delete()
        tempFile = null
        totalBytesReceived = 0L
        expectedTotalSize = 0L
    }
}

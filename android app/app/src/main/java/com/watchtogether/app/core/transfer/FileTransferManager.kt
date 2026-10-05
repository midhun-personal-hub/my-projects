package com.watchtogether.app.core.transfer

import android.content.Context
import android.net.Uri
import com.google.gson.Gson
import com.watchtogether.app.core.media.ChunkCacheManager
import com.watchtogether.app.core.webrtc.WebRtcManager
import com.watchtogether.app.domain.model.FileChunkHeader
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.InputStream
import java.nio.ByteBuffer

data class TransferProgress(
    val isTransferring: Boolean = false,
    val bytesTransferred: Long = 0L,
    val totalBytes: Long = 0L,
    val percentage: Float = 0f,
    val isComplete: Boolean = false,
    val error: String? = null
)

class FileTransferManager(
    private val context: Context,
    private val webRtcManager: WebRtcManager,
    private val cacheManager: ChunkCacheManager = ChunkCacheManager(context),
    private val gson: Gson = Gson()
) {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private val _progress = MutableStateFlow(TransferProgress())
    val progress: StateFlow<TransferProgress> = _progress

    private var transferJob: Job? = null
    private val chunkSize = 256 * 1024 // 256 KB chunks

    fun startHostTransfer(fileUri: Uri, fileId: String) {
        transferJob?.cancel()
        transferJob = scope.launch {
            try {
                val contentResolver = context.contentResolver
                val pfd = contentResolver.openFileDescriptor(fileUri, "r") ?: throw IllegalStateException("Cannot open file descriptor")
                val totalSize = pfd.statSize
                pfd.close()

                val inputStream: InputStream = contentResolver.openInputStream(fileUri) ?: throw IllegalStateException("Cannot open input stream")

                _progress.value = TransferProgress(isTransferring = true, totalBytes = totalSize)

                var offset = 0L
                var sequence = 0L
                val buffer = ByteArray(chunkSize)
                var bytesRead = 0

                while (isActive && inputStream.read(buffer).also { bytesRead = it } != -1) {
                    val isLast = offset + bytesRead >= totalSize
                    val header = FileChunkHeader(
                        fileId = fileId,
                        sequence = sequence,
                        offset = offset,
                        length = bytesRead,
                        totalSize = totalSize,
                        isLast = isLast
                    )

                    val headerJson = gson.toJson(header).toByteArray(Charsets.UTF_8)
                    val headerLength = headerJson.size

                    // Package frame: [Header Length (4 bytes)][Header JSON][Raw Chunk Data]
                    val frameBuffer = ByteBuffer.allocate(4 + headerLength + bytesRead)
                    frameBuffer.putInt(headerLength)
                    frameBuffer.put(headerJson)
                    frameBuffer.put(buffer, 0, bytesRead)

                    // Backpressure check: throttle if WebRTC buffer > 1 MB
                    while (webRtcManager.getFileChannelBufferedAmount() > 1024 * 1024 && isActive) {
                        delay(20)
                    }

                    val success = webRtcManager.sendFileChunk(frameBuffer.array())
                    if (!success) {
                        delay(50)
                    }

                    offset += bytesRead
                    sequence++
                    val pct = (offset.toFloat() / totalSize.toFloat()) * 100f
                    _progress.value = _progress.value.copy(
                        bytesTransferred = offset,
                        percentage = pct,
                        isComplete = isLast
                    )
                }

                inputStream.close()
            } catch (e: Exception) {
                _progress.value = _progress.value.copy(isTransferring = false, error = e.localizedMessage)
            }
        }
    }

    fun handleIncomingChunk(frameBytes: ByteArray) {
        try {
            val byteBuffer = ByteBuffer.wrap(frameBytes)
            val headerLength = byteBuffer.int
            val headerJsonBytes = ByteArray(headerLength)
            byteBuffer.get(headerJsonBytes)

            val headerJson = String(headerJsonBytes, Charsets.UTF_8)
            val header = gson.fromJson(headerJson, FileChunkHeader::class.java)

            val chunkData = ByteArray(header.length)
            byteBuffer.get(chunkData)

            if (_progress.value.totalBytes != header.totalSize) {
                cacheManager.prepareCacheFile(header.fileId, header.totalSize)
                _progress.value = TransferProgress(isTransferring = true, totalBytes = header.totalSize)
            }

            cacheManager.writeChunk(header.offset, chunkData)

            val bytesReceived = cacheManager.totalBytesReceived
            val pct = (bytesReceived.toFloat() / header.totalSize.toFloat()) * 100f

            _progress.value = _progress.value.copy(
                bytesTransferred = bytesReceived,
                percentage = pct,
                isComplete = header.isLast || bytesReceived >= header.totalSize
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun getCacheManager() = cacheManager

    fun cancel() {
        transferJob?.cancel()
        _progress.value = TransferProgress()
    }
}

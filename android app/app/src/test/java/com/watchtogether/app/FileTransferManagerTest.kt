package com.watchtogether.app

import com.google.gson.Gson
import com.watchtogether.app.domain.model.FileChunkHeader
import org.junit.Assert.*
import org.junit.Test
import java.nio.ByteBuffer

class FileTransferManagerTest {

    private val gson = Gson()

    @Test
    fun `test file chunk framing and parsing`() {
        val originalHeader = FileChunkHeader(
            fileId = "mov_test_123",
            sequence = 5L,
            offset = 1048576L,
            length = 262144,
            totalSize = 104857600L,
            isLast = false
        )

        val headerJson = gson.toJson(originalHeader).toByteArray(Charsets.UTF_8)
        val chunkData = ByteArray(262144) { 0x42 }

        val frameBuffer = ByteBuffer.allocate(4 + headerJson.size + chunkData.size)
        frameBuffer.putInt(headerJson.size)
        frameBuffer.put(headerJson)
        frameBuffer.put(chunkData)

        val rawFrame = frameBuffer.array()

        // Read frame back
        val readBuffer = ByteBuffer.wrap(rawFrame)
        val headerLen = readBuffer.int
        val jsonBytes = ByteArray(headerLen)
        readBuffer.get(jsonBytes)
        val parsedHeader = gson.fromJson(String(jsonBytes, Charsets.UTF_8), FileChunkHeader::class.java)

        val readData = ByteArray(parsedHeader.length)
        readBuffer.get(readData)

        assertEquals("mov_test_123", parsedHeader.fileId)
        assertEquals(5L, parsedHeader.sequence)
        assertEquals(1048576L, parsedHeader.offset)
        assertEquals(262144, parsedHeader.length)
        assertArrayEquals(chunkData, readData)
    }

    @Test
    fun `test percentage calculation for chunk transfer`() {
        val totalBytes = 100000000L // 100 MB
        val bytesTransferred = 25000000L // 25 MB

        val percentage = (bytesTransferred.toFloat() / totalBytes.toFloat()) * 100f
        assertEquals(25.0f, percentage, 0.001f)
    }

    @Test
    fun `test last chunk detection`() {
        val offset = 99750000L
        val chunkSize = 250000
        val totalSize = 100000000L

        val isLast = (offset + chunkSize) >= totalSize
        assertTrue(isLast)
    }
}

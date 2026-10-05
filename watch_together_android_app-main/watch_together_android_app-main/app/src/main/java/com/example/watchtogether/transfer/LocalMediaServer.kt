package com.example.watchtogether.transfer

import android.content.Context
import android.net.Uri
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.Inet4Address
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Lightweight embedded HTTP streaming server running on the Host device.
 * Exposes the selected local video over standard HTTP with byte-range (206 Partial Content)
 * support, allowing the Viewer to stream directly over local Wi-Fi, hotspot, or LAN with
 * zero delay, native seeking, and zero cloud bandwidth costs.
 */
class LocalMediaServer(private val context: Context) {

    companion object {
        private const val TAG = "LocalMediaServer"
        private const val BUFFER_SIZE = 64 * 1024
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var serverSocket: ServerSocket? = null
    private val isRunning = AtomicBoolean(false)

    private var activeUri: Uri? = null
    private var activeMimeType: String = "video/mp4"
    private var activeFileSize: Long = 0L
    private var boundPort: Int = 0
    private var boundHost: String? = null

    /**
     * Start the local streaming server for the specified media URI.
     * Returns the streamable HTTP URL, e.g. "http://192.168.1.5:8998/video.mp4", or null if unavailable.
     */
    fun start(uri: Uri, mimeType: String, fileSize: Long): String? {
        stop()

        this.activeUri = uri
        this.activeMimeType = if (mimeType.isNotEmpty()) mimeType else "video/mp4"
        this.activeFileSize = if (fileSize > 0L) fileSize else resolveFileSize(uri)

        try {
            val server = ServerSocket(0) // Bind to any free ephemeral port
            this.serverSocket = server
            this.boundPort = server.localPort
            this.isRunning.set(true)

            val localIp = getLocalIpAddress()
            this.boundHost = localIp

            Log.d(TAG, "LocalMediaServer started on port $boundPort, host IP: $localIp")

            scope.launch {
                listenLoop(server)
            }

            return if (localIp != null) "http://$localIp:$boundPort/video.mp4" else null
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start LocalMediaServer: ${e.message}", e)
            return null
        }
    }

    fun getStreamUrl(): String? {
        val host = boundHost ?: getLocalIpAddress() ?: return null
        if (!isRunning.get() || boundPort <= 0) return null
        return "http://$host:$boundPort/video.mp4"
    }

    fun stop() {
        isRunning.set(false)
        try {
            serverSocket?.close()
        } catch (_: Exception) {}
        serverSocket = null
        boundPort = 0
        boundHost = null
    }

    private fun listenLoop(server: ServerSocket) {
        while (isRunning.get() && !server.isClosed && scope.isActive) {
            try {
                val clientSocket = server.accept()
                scope.launch {
                    handleClient(clientSocket)
                }
            } catch (e: Exception) {
                if (isRunning.get()) {
                    Log.d(TAG, "ServerSocket accept returned: ${e.message}")
                }
                break
            }
        }
    }

    private fun handleClient(socket: Socket) {
        val uri = activeUri ?: run {
            try { socket.close() } catch (_: Exception) {}
            return
        }

        try {
            socket.soTimeout = 15000
            socket.tcpNoDelay = true

            val reader = BufferedReader(InputStreamReader(socket.getInputStream()))
            val firstLine = reader.readLine() ?: return
            val parts = firstLine.split(" ")
            if (parts.size < 2) return

            val method = parts[0].uppercase()
            var rangeHeader: String? = null

            var line: String? = reader.readLine()
            while (!line.isNullOrEmpty()) {
                if (line.startsWith("Range:", ignoreCase = true)) {
                    rangeHeader = line.substring(6).trim()
                }
                line = reader.readLine()
            }

            val totalSize = if (activeFileSize > 0L) activeFileSize else resolveFileSize(uri)
            val output = BufferedOutputStream(socket.getOutputStream(), BUFFER_SIZE)

            if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                // HTTP 206 Partial Content
                val rangeVal = rangeHeader.substring(6).trim()
                val dashIdx = rangeVal.indexOf('-')
                var start = 0L
                var end = totalSize - 1

                if (dashIdx != -1) {
                    val startStr = rangeVal.substring(0, dashIdx).trim()
                    val endStr = rangeVal.substring(dashIdx + 1).trim()
                    if (startStr.isNotEmpty()) {
                        start = startStr.toLongOrNull() ?: 0L
                    }
                    if (endStr.isNotEmpty()) {
                        end = endStr.toLongOrNull() ?: (totalSize - 1)
                    }
                }

                if (totalSize > 0L) {
                    end = end.coerceAtMost(totalSize - 1)
                }
                val contentLength = if (totalSize > 0L) (end - start + 1).coerceAtLeast(0L) else 0L

                val headerBuilder = StringBuilder()
                headerBuilder.append("HTTP/1.1 206 Partial Content\r\n")
                headerBuilder.append("Content-Type: $activeMimeType\r\n")
                headerBuilder.append("Accept-Ranges: bytes\r\n")
                if (totalSize > 0L) {
                    headerBuilder.append("Content-Range: bytes $start-$end/$totalSize\r\n")
                    headerBuilder.append("Content-Length: $contentLength\r\n")
                }
                headerBuilder.append("Connection: close\r\n")
                headerBuilder.append("\r\n")

                output.write(headerBuilder.toString().toByteArray(Charsets.UTF_8))
                output.flush()

                if (method != "HEAD" && contentLength > 0L) {
                    streamBytes(uri, start, contentLength, output)
                }
            } else {
                // HTTP 200 OK
                val headerBuilder = StringBuilder()
                headerBuilder.append("HTTP/1.1 200 OK\r\n")
                headerBuilder.append("Content-Type: $activeMimeType\r\n")
                headerBuilder.append("Accept-Ranges: bytes\r\n")
                if (totalSize > 0L) {
                    headerBuilder.append("Content-Length: $totalSize\r\n")
                }
                headerBuilder.append("Connection: close\r\n")
                headerBuilder.append("\r\n")

                output.write(headerBuilder.toString().toByteArray(Charsets.UTF_8))
                output.flush()

                if (method != "HEAD") {
                    streamBytes(uri, 0L, totalSize, output)
                }
            }
        } catch (e: Exception) {
            Log.d(TAG, "Client socket completed/interrupted: ${e.message}")
        } finally {
            try { socket.close() } catch (_: Exception) {}
        }
    }

    private fun streamBytes(uri: Uri, offset: Long, length: Long, output: BufferedOutputStream) {
        try {
            val pfd = context.contentResolver.openFileDescriptor(uri, "r")
            if (pfd != null) {
                pfd.use { descriptor ->
                    val fis = java.io.FileInputStream(descriptor.fileDescriptor)
                    fis.channel.position(offset)
                    val buffer = ByteArray(BUFFER_SIZE)
                    var remaining = length
                    while (remaining > 0) {
                        val toRead = remaining.coerceAtMost(buffer.size.toLong()).toInt()
                        val read = fis.read(buffer, 0, toRead)
                        if (read == -1) break
                        output.write(buffer, 0, read)
                        remaining -= read
                    }
                    output.flush()
                }
            } else {
                // Fallback to openInputStream
                context.contentResolver.openInputStream(uri)?.use { rawInput ->
                    val bis = BufferedInputStream(rawInput, BUFFER_SIZE)
                    var skipped = 0L
                    while (skipped < offset) {
                        val s = bis.skip(offset - skipped)
                        if (s <= 0) break
                        skipped += s
                    }
                    val buffer = ByteArray(BUFFER_SIZE)
                    var remaining = length
                    while (remaining > 0) {
                        val toRead = remaining.coerceAtMost(buffer.size.toLong()).toInt()
                        val read = bis.read(buffer, 0, toRead)
                        if (read == -1) break
                        output.write(buffer, 0, read)
                        remaining -= read
                    }
                    output.flush()
                }
            }
        } catch (_: Exception) {}
    }

    private fun resolveFileSize(uri: Uri): Long {
        return try {
            val pfd = context.contentResolver.openFileDescriptor(uri, "r")
            pfd?.use { it.statSize } ?: 0L
        } catch (_: Exception) {
            0L
        }
    }

    /**
     * Retrieve the best non-loopback IPv4 address for local network streaming.
     */
    private fun getLocalIpAddress(): String? {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces() ?: return null
            var fallbackIp: String? = null
            while (interfaces.hasMoreElements()) {
                val networkInterface = interfaces.nextElement()
                if (networkInterface.isLoopback || !networkInterface.isUp) continue

                val addresses = networkInterface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val address = addresses.nextElement()
                    if (!address.isLoopbackAddress && address is Inet4Address) {
                        val hostAddress = address.hostAddress ?: continue
                        // Prioritize standard Wi-Fi / Hotspot / LAN subnets
                        if (hostAddress.startsWith("192.168.") ||
                            hostAddress.startsWith("10.") ||
                            hostAddress.startsWith("172.")
                        ) {
                            return hostAddress
                        }
                        if (fallbackIp == null) {
                            fallbackIp = hostAddress
                        }
                    }
                }
            }
            return fallbackIp
        } catch (_: Exception) {
            return null
        }
    }
}

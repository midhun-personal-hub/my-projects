package com.watchtogether.app.core.network

import com.google.gson.Gson
import com.google.gson.JsonObject
import com.watchtogether.app.domain.model.MessageType
import com.watchtogether.app.domain.model.Role
import com.watchtogether.app.domain.model.SignalingMessage
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import okhttp3.*
import java.util.concurrent.TimeUnit

enum class ConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    RECONNECTING,
    FAILED
}

class SignalingClient(
    private val client: OkHttpClient = OkHttpClient.Builder()
        .readTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .pingInterval(20, TimeUnit.SECONDS)
        .build(),
    private val gson: Gson = Gson()
) {
    private var webSocket: WebSocket? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState

    private val _messages = MutableSharedFlow<SignalingMessage>(extraBufferCapacity = 64)
    val messages: SharedFlow<SignalingMessage> = _messages

    private var currentUrl: String? = null
    private var isManualDisconnect = false

    fun connect(serverWsUrl: String, roomCode: String, peerId: String, role: Role) {
        currentUrl = "$serverWsUrl?roomCode=$roomCode&peerId=$peerId&role=${role.name}"
        isManualDisconnect = false
        _connectionState.value = ConnectionState.CONNECTING
        initWebSocket()
    }

    private fun initWebSocket() {
        val url = currentUrl ?: return
        val request = Request.Builder().url(url).build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                _connectionState.value = ConnectionState.CONNECTED
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val jsonObj = gson.fromJson(text, JsonObject::class.java)
                    val typeStr = jsonObj.get("type")?.asString ?: return
                    val type = MessageType.valueOf(typeStr)

                    val message = SignalingMessage(
                        type = type,
                        roomId = jsonObj.get("roomId")?.asString,
                        roomCode = jsonObj.get("roomCode")?.asString,
                        senderId = jsonObj.get("senderId")?.asString,
                        recipientId = jsonObj.get("recipientId")?.asString,
                        role = jsonObj.get("role")?.asString?.let { Role.valueOf(it) },
                        payload = jsonObj.get("payload"),
                        timestamp = jsonObj.get("timestamp")?.asLong ?: System.currentTimeMillis()
                    )

                    scope.launch {
                        _messages.emit(message)
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                webSocket.close(1000, null)
                _connectionState.value = ConnectionState.DISCONNECTED
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                if (!isManualDisconnect) {
                    _connectionState.value = ConnectionState.RECONNECTING
                    scheduleReconnect()
                } else {
                    _connectionState.value = ConnectionState.DISCONNECTED
                }
            }
        })
    }

    fun send(message: SignalingMessage) {
        if (_connectionState.value == ConnectionState.CONNECTED) {
            val json = gson.toJson(message)
            webSocket?.send(json)
        }
    }

    private fun scheduleReconnect() {
        scope.launch {
            delay(3000)
            if (!isManualDisconnect && _connectionState.value == ConnectionState.RECONNECTING) {
                initWebSocket()
            }
        }
    }

    fun disconnect() {
        isManualDisconnect = true
        _connectionState.value = ConnectionState.DISCONNECTED
        webSocket?.close(1000, "Client disconnect")
        webSocket = null
    }

    fun release() {
        disconnect()
        scope.cancel()
    }
}

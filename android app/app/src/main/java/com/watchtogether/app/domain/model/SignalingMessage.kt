package com.watchtogether.app.domain.model

enum class MessageType {
    HELLO,
    ROOM_STATE,
    PEER_JOINED,
    PEER_LEFT,
    WEBRTC_OFFER,
    WEBRTC_ANSWER,
    ICE_CANDIDATE,
    PLAYBACK_PLAY,
    PLAYBACK_PAUSE,
    PLAYBACK_SEEK,
    PLAYBACK_SYNC,
    FILE_INFO,
    BUFFER_STATUS,
    CHAT_MESSAGE,
    CALL_OFFER,
    CALL_ANSWER,
    CALL_ICE,
    PING,
    PONG,
    RECONNECT,
    ERROR
}

data class SignalingMessage(
    val type: MessageType,
    val roomId: String? = null,
    val roomCode: String? = null,
    val senderId: String? = null,
    val recipientId: String? = null,
    val role: Role? = null,
    val payload: Any? = null,
    val timestamp: Long = System.currentTimeMillis()
)

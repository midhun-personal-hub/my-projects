package com.watchtogether.app.domain.model

enum class Role {
    HOST,
    VIEWER
}

enum class RoomStatus {
    WAITING,
    CONNECTING,
    CONNECTED,
    RECONNECTING,
    CLOSED
}

data class PlaybackState(
    val isPlaying: Boolean = false,
    val positionMs: Long = 0L,
    val durationMs: Long = 0L,
    val sequence: Long = 0L,
    val updatedAt: Long = System.currentTimeMillis()
)

data class MediaMetadata(
    val available: Boolean = false,
    val fileName: String? = null,
    val mimeType: String? = null,
    val size: Long = 0L
)

data class IceServer(
    val urls: List<String>,
    val username: String? = null,
    val credential: String? = null
)

data class RoomState(
    val roomId: String = "",
    val roomCode: String = "",
    val hostId: String = "",
    val viewerId: String? = null,
    val status: RoomStatus = RoomStatus.WAITING,
    val createdAt: Long = System.currentTimeMillis(),
    val expiresAt: Long = System.currentTimeMillis() + 30 * 60 * 1000L,
    val playback: PlaybackState = PlaybackState(),
    val media: MediaMetadata = MediaMetadata()
)

data class CreateRoomResponse(
    val roomCode: String,
    val roomId: String,
    val role: String,
    val hostId: String,
    val expiresAt: Long,
    val iceServers: List<IceServer>
)

data class JoinRoomResponse(
    val roomCode: String,
    val roomId: String,
    val role: String,
    val viewerId: String,
    val roomState: RoomState,
    val iceServers: List<IceServer>
)

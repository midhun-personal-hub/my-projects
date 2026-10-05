package com.watchtogether.app.data.repository

import android.content.Context
import android.net.Uri
import com.google.gson.Gson
import com.watchtogether.app.core.media.MoviePlayerManager
import com.watchtogether.app.core.network.ConnectionState
import com.watchtogether.app.core.network.SignalingClient
import com.watchtogether.app.core.sync.SyncManager
import com.watchtogether.app.core.transfer.FileTransferManager
import com.watchtogether.app.core.webrtc.WebRtcManager
import com.watchtogether.app.domain.model.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

class WatchTogetherRepository(
    private val context: Context,
    private val baseUrl: String = "http://10.0.2.2:8080",
    private val wsUrl: String = "ws://10.0.2.2:8080/ws"
) {
    private val scope = CoroutineScope(Dispatchers.IO)
    private val gson = Gson()
    private val httpClient = OkHttpClient()

    val signalingClient = SignalingClient()
    val webRtcManager = WebRtcManager(context)
    val playerManager = MoviePlayerManager(context)
    val syncManager = SyncManager(playerManager)
    val transferManager = FileTransferManager(context, webRtcManager)

    private val _roomState = MutableStateFlow(RoomState())
    val roomState: StateFlow<RoomState> = _roomState

    private val _chatMessages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val chatMessages: StateFlow<List<ChatMessage>> = _chatMessages

    private var currentPeerId: String = ""
    private var currentRole: Role = Role.VIEWER

    init {
        observeSignalingMessages()
        observeWebRtcEvents()
    }

    suspend fun createRoom(): CreateRoomResponse {
        currentPeerId = "host_${System.currentTimeMillis()}"
        currentRole = Role.HOST

        val json = gson.toJson(mapOf("hostId" to currentPeerId))
        val body = json.toRequestBody("application/json".toMediaType())
        val request = Request.Builder().url("$baseUrl/api/rooms").post(body).build()

        return kotlinx.coroutines.withContext(Dispatchers.IO) {
            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: throw IllegalStateException("Empty response")
            val result = gson.fromJson(responseBody, CreateRoomResponse::class.java)

            _roomState.value = RoomState(
                roomId = result.roomId,
                roomCode = result.roomCode,
                hostId = result.hostId,
                status = RoomStatus.WAITING,
                expiresAt = result.expiresAt
            )

            signalingClient.connect(wsUrl, result.roomCode, result.hostId, Role.HOST)
            webRtcManager.createPeerConnection(result.iceServers)
            webRtcManager.initDataChannels()

            result
        }
    }

    suspend fun joinRoom(roomCode: String): JoinRoomResponse {
        currentPeerId = "viewer_${System.currentTimeMillis()}"
        currentRole = Role.VIEWER

        val json = gson.toJson(mapOf("viewerId" to currentPeerId))
        val body = json.toRequestBody("application/json".toMediaType())
        val request = Request.Builder().url("$baseUrl/api/rooms/${roomCode.uppercase()}/join").post(body).build()

        return kotlinx.coroutines.withContext(Dispatchers.IO) {
            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: throw IllegalStateException("Room full or invalid")
            val result = gson.fromJson(responseBody, JoinRoomResponse::class.java)

            _roomState.value = result.roomState.copy(status = RoomStatus.CONNECTING)

            signalingClient.connect(wsUrl, result.roomCode, result.viewerId, Role.VIEWER)
            webRtcManager.createPeerConnection(result.iceServers)

            result
        }
    }

    fun selectHostMovie(fileUri: Uri, fileName: String, mimeType: String?, size: Long) {
        playerManager.prepareMedia(fileUri)
        val fileId = "file_${System.currentTimeMillis()}"

        val media = MediaMetadata(available = true, fileName = fileName, mimeType = mimeType, size = size)
        _roomState.value = _roomState.value.copy(media = media)

        signalingClient.send(
            SignalingMessage(
                type = MessageType.FILE_INFO,
                roomCode = _roomState.value.roomCode,
                senderId = currentPeerId,
                payload = mapOf("fileId" to fileId, "fileName" to fileName, "size" to size, "mimeType" to mimeType)
            )
        )

        transferManager.startHostTransfer(fileUri, fileId)
    }

    fun play() {
        val nextSeq = syncManager.nextSequence()
        playerManager.play()
        broadcastPlayback(isPlaying = true, sequence = nextSeq)
    }

    fun pause() {
        val nextSeq = syncManager.nextSequence()
        playerManager.pause()
        broadcastPlayback(isPlaying = false, sequence = nextSeq)
    }

    fun seekTo(positionMs: Long) {
        val nextSeq = syncManager.nextSequence()
        playerManager.seekTo(positionMs)
        broadcastPlayback(isPlaying = playerManager.exoPlayer.isPlaying, positionMs = positionMs, sequence = nextSeq)
    }

    fun sendChatMessage(text: String) {
        val msg = ChatMessage(senderId = currentPeerId, senderName = currentRole.name, text = text)
        _chatMessages.value = _chatMessages.value + msg

        val json = gson.toJson(msg)
        if (!webRtcManager.sendChatMessage(json)) {
            signalingClient.send(
                SignalingMessage(
                    type = MessageType.CHAT_MESSAGE,
                    roomCode = _roomState.value.roomCode,
                    senderId = currentPeerId,
                    payload = msg
                )
            )
        }
    }

    private fun broadcastPlayback(isPlaying: Boolean, positionMs: Long = playerManager.getCurrentPosition(), sequence: Long) {
        val state = PlaybackState(
            isPlaying = isPlaying,
            positionMs = positionMs,
            durationMs = playerManager.getDuration(),
            sequence = sequence,
            updatedAt = System.currentTimeMillis()
        )
        _roomState.value = _roomState.value.copy(playback = state)

        val message = SignalingMessage(
            type = if (isPlaying) MessageType.PLAYBACK_PLAY else MessageType.PLAYBACK_PAUSE,
            roomCode = _roomState.value.roomCode,
            senderId = currentPeerId,
            payload = state
        )

        if (!webRtcManager.sendControlMessage(gson.toJson(message))) {
            signalingClient.send(message)
        }
    }

    private fun observeSignalingMessages() {
        scope.launch {
            signalingClient.messages.collect { msg ->
                when (msg.type) {
                    MessageType.PEER_JOINED -> {
                        _roomState.value = _roomState.value.copy(status = RoomStatus.CONNECTING)
                        if (currentRole == Role.HOST) {
                            webRtcManager.createOffer { sdp ->
                                signalingClient.send(
                                    SignalingMessage(
                                        type = MessageType.WEBRTC_OFFER,
                                        roomCode = _roomState.value.roomCode,
                                        senderId = currentPeerId,
                                        payload = mapOf("type" to sdp.type.canonicalForm(), "sdp" to sdp.description)
                                    )
                                )
                            }
                        }
                    }

                    MessageType.WEBRTC_OFFER -> {
                        val payload = gson.fromJson(gson.toJson(msg.payload), Map::class.java)
                        val sdp = org.webrtc.SessionDescription(
                            org.webrtc.SessionDescription.Type.OFFER,
                            payload["sdp"] as String
                        )
                        webRtcManager.setRemoteDescription(sdp)
                        webRtcManager.createAnswer { answerSdp ->
                            signalingClient.send(
                                SignalingMessage(
                                    type = MessageType.WEBRTC_ANSWER,
                                    roomCode = _roomState.value.roomCode,
                                    senderId = currentPeerId,
                                    payload = mapOf("type" to answerSdp.type.canonicalForm(), "sdp" to answerSdp.description)
                                )
                            )
                        }
                    }

                    MessageType.WEBRTC_ANSWER -> {
                        val payload = gson.fromJson(gson.toJson(msg.payload), Map::class.java)
                        val sdp = org.webrtc.SessionDescription(
                            org.webrtc.SessionDescription.Type.ANSWER,
                            payload["sdp"] as String
                        )
                        webRtcManager.setRemoteDescription(sdp)
                    }

                    MessageType.ICE_CANDIDATE -> {
                        val payload = gson.fromJson(gson.toJson(msg.payload), Map::class.java)
                        val candidate = org.webrtc.IceCandidate(
                            payload["sdpMid"] as String,
                            (payload["sdpMLineIndex"] as Double).toInt(),
                            payload["candidate"] as String
                        )
                        webRtcManager.addIceCandidate(candidate)
                    }

                    MessageType.FILE_INFO -> {
                        val media = gson.fromJson(gson.toJson(msg.payload), MediaMetadata::class.java)
                        _roomState.value = _roomState.value.copy(media = media)
                    }

                    MessageType.PLAYBACK_PLAY, MessageType.PLAYBACK_PAUSE, MessageType.PLAYBACK_SEEK -> {
                        val playback = gson.fromJson(gson.toJson(msg.payload), PlaybackState::class.java)
                        syncManager.handleRemotePlaybackState(playback)
                        _roomState.value = _roomState.value.copy(playback = playback)
                    }

                    MessageType.CHAT_MESSAGE -> {
                        val chat = gson.fromJson(gson.toJson(msg.payload), ChatMessage::class.java)
                        _chatMessages.value = _chatMessages.value + chat
                    }

                    else -> {}
                }
            }
        }
    }

    private fun observeWebRtcEvents() {
        scope.launch {
            webRtcManager.localIceCandidates.collect { candidate ->
                signalingClient.send(
                    SignalingMessage(
                        type = MessageType.ICE_CANDIDATE,
                        roomCode = _roomState.value.roomCode,
                        senderId = currentPeerId,
                        payload = mapOf(
                            "sdpMid" to candidate.sdpMid,
                            "sdpMLineIndex" to candidate.sdpMLineIndex,
                            "candidate" to candidate.sdp
                        )
                    )
                )
            }
        }

        scope.launch {
            webRtcManager.fileChunks.collect { chunkData ->
                transferManager.handleIncomingChunk(chunkData)
                val cacheFile = transferManager.getCacheManager().getCacheFile()
                if (cacheFile != null && cacheFile.exists() && cacheFile.length() > 0 && !playerManager.playerState.value.isReady) {
                    playerManager.prepareMedia(Uri.fromFile(cacheFile))
                }
            }
        }
    }

    fun release() {
        signalingClient.release()
        webRtcManager.close()
        playerManager.release()
    }
}

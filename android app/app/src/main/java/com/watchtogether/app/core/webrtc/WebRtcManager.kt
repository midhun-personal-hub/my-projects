package com.watchtogether.app.core.webrtc

import android.content.Context
import com.watchtogether.app.domain.model.IceServer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import org.webrtc.*
import java.nio.ByteBuffer

enum class WebRtcState {
    IDLE,
    CONNECTING,
    CONNECTED,
    DISCONNECTED,
    FAILED,
    CLOSED
}

class WebRtcManager(
    private val context: Context,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.IO)
) {
    private var peerConnectionFactory: PeerConnectionFactory? = null
    private var peerConnection: PeerConnection? = null

    // DataChannels
    private var controlChannel: DataChannel? = null
    private var fileChannel: DataChannel? = null
    private var chatChannel: DataChannel? = null

    // Video call media
    private var localVideoTrack: VideoTrack? = null
    private var localAudioTrack: AudioTrack? = null
    private var videoCapturer: VideoCapturer? = null

    private val _connectionState = MutableStateFlow(WebRtcState.IDLE)
    val connectionState: StateFlow<WebRtcState> = _connectionState

    private val _localIceCandidates = MutableSharedFlow<IceCandidate>(extraBufferCapacity = 64)
    val localIceCandidates: SharedFlow<IceCandidate> = _localIceCandidates

    private val _controlMessages = MutableSharedFlow<String>(extraBufferCapacity = 64)
    val controlMessages: SharedFlow<String> = _controlMessages

    private val _fileChunks = MutableSharedFlow<ByteArray>(extraBufferCapacity = 128)
    val fileChunks: SharedFlow<ByteArray> = _fileChunks

    private val _chatMessages = MutableSharedFlow<String>(extraBufferCapacity = 64)
    val chatMessages: SharedFlow<String> = _chatMessages

    private val _remoteVideoTrack = MutableStateFlow<VideoTrack?>(null)
    val remoteVideoTrack: StateFlow<VideoTrack?> = _remoteVideoTrack

    init {
        initializePeerConnectionFactory()
    }

    private fun initializePeerConnectionFactory() {
        PeerConnectionFactory.initialize(
            PeerConnectionFactory.InitializationOptions.builder(context)
                .setEnableInternalTracer(true)
                .createInitializationOptions()
        )

        val encoderFactory = DefaultVideoEncoderFactory(EglBase.create().eglBaseContext, true, true)
        val decoderFactory = DefaultVideoDecoderFactory(EglBase.create().eglBaseContext)

        peerConnectionFactory = PeerConnectionFactory.builder()
            .setVideoEncoderFactory(encoderFactory)
            .setVideoDecoderFactory(decoderFactory)
            .setOptions(PeerConnectionFactory.Options())
            .createPeerConnectionFactory()
    }

    fun createPeerConnection(iceServers: List<IceServer>) {
        val rtcIceServers = iceServers.map { server ->
            PeerConnection.IceServer.builder(server.urls)
                .setUsername(server.username ?: "")
                .setPassword(server.credential ?: "")
                .createIceServer()
        }

        val rtcConfig = PeerConnection.RTCConfiguration(rtcIceServers).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
        }

        peerConnection = peerConnectionFactory?.createPeerConnection(rtcConfig, object : PeerConnection.Observer {
            override fun onSignalingChange(state: PeerConnection.SignalingState?) {}

            override fun onIceConnectionChange(state: PeerConnection.IceConnectionState?) {
                when (state) {
                    PeerConnection.IceConnectionState.CONNECTED,
                    PeerConnection.IceConnectionState.COMPLETED -> _connectionState.value = WebRtcState.CONNECTED
                    PeerConnection.IceConnectionState.DISCONNECTED -> _connectionState.value = WebRtcState.DISCONNECTED
                    PeerConnection.IceConnectionState.FAILED -> _connectionState.value = WebRtcState.FAILED
                    PeerConnection.IceConnectionState.CLOSED -> _connectionState.value = WebRtcState.CLOSED
                    else -> {}
                }
            }

            override fun onIceConnectionReceivingChange(receiving: Boolean) {}
            override fun onIceGatheringChange(state: PeerConnection.IceGatheringState?) {}

            override fun onIceCandidate(candidate: IceCandidate?) {
                candidate?.let {
                    scope.launch { _localIceCandidates.emit(it) }
                }
            }

            override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) {}
            override fun onAddStream(stream: MediaStream?) {}
            override fun onRemoveStream(stream: MediaStream?) {}

            override fun onDataChannel(dataChannel: DataChannel?) {
                dataChannel?.let { setupDataChannel(it) }
            }

            override fun onRenegotiationNeeded() {}

            override fun onAddTrack(receiver: RtpReceiver?, mediaStreams: Array<out MediaStream>?) {
                receiver?.track()?.let { track ->
                    if (track is VideoTrack) {
                        _remoteVideoTrack.value = track
                    }
                }
            }
        })
    }

    fun initDataChannels() {
        val controlInit = DataChannel.Init().apply {
            ordered = true
            id = 1
        }
        controlChannel = peerConnection?.createDataChannel("control", controlInit)
        controlChannel?.let { setupDataChannel(it) }

        val fileInit = DataChannel.Init().apply {
            ordered = true
            id = 2
        }
        fileChannel = peerConnection?.createDataChannel("file", fileInit)
        fileChannel?.let { setupDataChannel(it) }

        val chatInit = DataChannel.Init().apply {
            ordered = true
            id = 3
        }
        chatChannel = peerConnection?.createDataChannel("chat", chatInit)
        chatChannel?.let { setupDataChannel(it) }
    }

    private fun setupDataChannel(channel: DataChannel) {
        channel.registerObserver(object : DataChannel.Observer {
            override fun onBufferedAmountChange(previousAmount: Long) {}
            override fun onStateChange() {}

            override fun onMessage(buffer: DataChannel.Buffer) {
                val data = ByteArray(buffer.data.remaining())
                buffer.data.get(data)

                scope.launch {
                    when (channel.label()) {
                        "control" -> _controlMessages.emit(String(data, Charsets.UTF_8))
                        "file" -> _fileChunks.emit(data)
                        "chat" -> _chatMessages.emit(String(data, Charsets.UTF_8))
                    }
                }
            }
        })
    }

    fun createOffer(onSdpCreated: (SessionDescription) -> Unit) {
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
        }

        peerConnection?.createOffer(object : SimpleSdpObserver() {
            override fun onCreateSuccess(sdp: SessionDescription?) {
                sdp?.let {
                    peerConnection?.setLocalDescription(SimpleSdpObserver(), it)
                    onSdpCreated(it)
                }
            }
        }, constraints)
    }

    fun createAnswer(onSdpCreated: (SessionDescription) -> Unit) {
        val constraints = MediaConstraints()
        peerConnection?.createAnswer(object : SimpleSdpObserver() {
            override fun onCreateSuccess(sdp: SessionDescription?) {
                sdp?.let {
                    peerConnection?.setLocalDescription(SimpleSdpObserver(), it)
                    onSdpCreated(it)
                }
            }
        }, constraints)
    }

    fun setRemoteDescription(sdp: SessionDescription) {
        peerConnection?.setRemoteDescription(SimpleSdpObserver(), sdp)
    }

    fun addIceCandidate(candidate: IceCandidate) {
        peerConnection?.addIceCandidate(candidate)
    }

    fun sendControlMessage(text: String): Boolean {
        return sendData(controlChannel, text.toByteArray(Charsets.UTF_8))
    }

    fun sendFileChunk(bytes: ByteArray): Boolean {
        return sendData(fileChannel, bytes)
    }

    fun sendChatMessage(text: String): Boolean {
        return sendData(chatChannel, text.toByteArray(Charsets.UTF_8))
    }

    fun getFileChannelBufferedAmount(): Long {
        return fileChannel?.bufferedAmount() ?: 0L
    }

    private fun sendData(channel: DataChannel?, data: ByteArray): Boolean {
        if (channel == null || channel.state() != DataChannel.State.OPEN) return false
        val buffer = DataChannel.Buffer(ByteBuffer.wrap(data), false)
        return channel.send(buffer)
    }

    fun close() {
        controlChannel?.close()
        fileChannel?.close()
        chatChannel?.close()
        peerConnection?.close()
        peerConnection = null
        _connectionState.value = WebRtcState.CLOSED
    }
}

open class SimpleSdpObserver : SdpObserver {
    override fun onCreateSuccess(sdp: SessionDescription?) {}
    override fun onSetSuccess() {}
    override fun onCreateFailure(reason: String?) {}
    override fun onSetFailure(reason: String?) {}
}

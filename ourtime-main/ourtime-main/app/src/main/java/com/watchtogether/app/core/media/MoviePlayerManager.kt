package com.watchtogether.app.core.media

import android.content.Context
import android.net.Uri
import androidx.annotation.OptIn
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

data class PlayerUiState(
    val isPlaying: Boolean = false,
    val isBuffering: Boolean = false,
    val currentPositionMs: Long = 0L,
    val durationMs: Long = 0L,
    val isReady: Boolean = false,
    val error: String? = null
)

class MoviePlayerManager(private val context: Context) {
    val exoPlayer: ExoPlayer = ExoPlayer.Builder(context).build()

    private val _playerState = MutableStateFlow(PlayerUiState())
    val playerState: StateFlow<PlayerUiState> = _playerState

    private var isLocalAction = false

    init {
        exoPlayer.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                _playerState.value = _playerState.value.copy(isPlaying = isPlaying)
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                when (playbackState) {
                    Player.STATE_BUFFERING -> {
                        _playerState.value = _playerState.value.copy(isBuffering = true)
                    }
                    Player.STATE_READY -> {
                        _playerState.value = _playerState.value.copy(
                            isBuffering = false,
                            isReady = true,
                            durationMs = exoPlayer.duration.coerceAtLeast(0L)
                        )
                    }
                    Player.STATE_ENDED -> {
                        _playerState.value = _playerState.value.copy(isPlaying = false, isBuffering = false)
                    }
                    Player.STATE_IDLE -> {
                        _playerState.value = _playerState.value.copy(isReady = false)
                    }
                }
            }

            override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                _playerState.value = _playerState.value.copy(
                    error = error.localizedMessage ?: "Playback error",
                    isBuffering = false
                )
            }
        })
    }

    fun prepareMedia(uri: Uri) {
        val mediaItem = MediaItem.fromUri(uri)
        exoPlayer.setMediaItem(mediaItem)
        exoPlayer.prepare()
    }

    fun play() {
        exoPlayer.playWhenReady = true
    }

    fun pause() {
        exoPlayer.playWhenReady = false
    }

    fun seekTo(positionMs: Long) {
        exoPlayer.seekTo(positionMs)
    }

    fun setPlaybackSpeed(speed: Float) {
        exoPlayer.setPlaybackSpeed(speed)
    }

    fun getCurrentPosition(): Long {
        return exoPlayer.currentPosition
    }

    fun getDuration(): Long {
        return exoPlayer.duration.coerceAtLeast(0L)
    }

    fun release() {
        exoPlayer.release()
    }
}

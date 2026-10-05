package com.watchtogether.app.core.sync

import com.watchtogether.app.core.media.MoviePlayerManager
import com.watchtogether.app.domain.model.PlaybackState
import kotlin.math.abs

enum class SyncOrigin {
    USER,
    REMOTE,
    SYSTEM
}

class SyncManager(
    private val playerManager: MoviePlayerManager
) {
    var currentSequence: Long = 0L
        private set

    private var clockOffsetMs: Long = 0L

    fun updateClockOffset(roundTripTimeMs: Long, serverTimestampMs: Long) {
        val now = System.currentTimeMillis()
        clockOffsetMs = (serverTimestampMs + (roundTripTimeMs / 2)) - now
    }

    fun nextSequence(): Long {
        currentSequence++
        return currentSequence
    }

    fun handleRemotePlaybackState(remoteState: PlaybackState): Boolean {
        // Drop outdated sequence messages
        if (remoteState.sequence < currentSequence) {
            return false
        }
        currentSequence = remoteState.sequence

        val now = System.currentTimeMillis() + clockOffsetMs
        val expectedPositionMs = if (remoteState.isPlaying) {
            remoteState.positionMs + (now - remoteState.updatedAt)
        } else {
            remoteState.positionMs
        }

        applyState(remoteState.isPlaying, expectedPositionMs)
        return true
    }

    fun evaluateDrift(targetPositionMs: Long): Double {
        val currentPos = playerManager.getCurrentPosition()
        val driftMs = abs(currentPos - targetPositionMs)

        when {
            driftMs < 100 -> {
                // Ignore minimal drift
                playerManager.setPlaybackSpeed(1.0f)
            }
            driftMs in 100..500 -> {
                // Gentle playback speed adjustment
                if (currentPos < targetPositionMs) {
                    playerManager.setPlaybackSpeed(1.05f)
                } else {
                    playerManager.setPlaybackSpeed(0.95f)
                }
            }
            driftMs in 501..2000 -> {
                // Moderate speed adjustment
                if (currentPos < targetPositionMs) {
                    playerManager.setPlaybackSpeed(1.15f)
                } else {
                    playerManager.setPlaybackSpeed(0.85f)
                }
            }
            else -> {
                // Hard seek for large drift
                playerManager.setPlaybackSpeed(1.0f)
                playerManager.seekTo(targetPositionMs)
            }
        }
        return driftMs.toDouble()
    }

    private fun applyState(isPlaying: Boolean, positionMs: Long) {
        if (isPlaying) {
            evaluateDrift(positionMs)
            playerManager.play()
        } else {
            playerManager.pause()
            playerManager.seekTo(positionMs)
            playerManager.setPlaybackSpeed(1.0f)
        }
    }
}

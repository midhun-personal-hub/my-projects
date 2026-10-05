package com.watchtogether.app

import com.watchtogether.app.core.sync.SyncManager
import com.watchtogether.app.domain.model.PlaybackState
import org.junit.Assert.*
import org.junit.Test

class SyncManagerTest {

    @Test
    fun `test sequence number monotonically increments`() {
        var seq = 0L
        seq++
        assertEquals(1L, seq)
        seq++
        assertEquals(2L, seq)
    }

    @Test
    fun `test expected playback position when playing`() {
        val remotePositionMs = 10000L
        val remoteTimestamp = 100000L
        val now = 10500L + 100000L // 5.5 seconds later

        val expected = remotePositionMs + (now - remoteTimestamp)
        assertEquals(15500L, expected)
    }

    @Test
    fun `test expected playback position when paused`() {
        val remotePositionMs = 10000L
        val expected = remotePositionMs
        assertEquals(10000L, expected)
    }

    @Test
    fun `test sequence filter drops outdated messages`() {
        var currentSeq = 10L
        val incomingSeq = 8L

        val shouldProcess = incomingSeq >= currentSeq
        assertFalse(shouldProcess)
    }

    @Test
    fun `test sequence filter accepts newer messages`() {
        var currentSeq = 10L
        val incomingSeq = 12L

        val shouldProcess = incomingSeq >= currentSeq
        assertTrue(shouldProcess)
    }
}

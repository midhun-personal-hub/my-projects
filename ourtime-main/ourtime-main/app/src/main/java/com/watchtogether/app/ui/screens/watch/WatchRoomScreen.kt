package com.watchtogether.app.ui.screens.watch

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.watchtogether.app.core.transfer.TransferProgress
import com.watchtogether.app.data.repository.WatchTogetherRepository
import com.watchtogether.app.domain.model.Role
import com.watchtogether.app.ui.screens.watch.components.ChatPanel
import com.watchtogether.app.ui.screens.watch.components.VideoCallOverlay
import com.watchtogether.app.ui.screens.watch.components.VideoPlayerView
import com.watchtogether.app.ui.theme.*

@Composable
fun WatchRoomScreen(
    repository: WatchTogetherRepository,
    role: Role,
    onLeaveClick: () -> Unit
) {
    val roomState by repository.roomState.collectAsState()
    val chatMessages by repository.chatMessages.collectAsState()
    val playerState by repository.playerManager.playerState.collectAsState()
    val transferProgress by repository.transferManager.progress.collectAsState()
    val remoteVideoTrack by repository.webRtcManager.remoteVideoTrack.collectAsState()

    var isChatOpen by remember { mutableStateOf(false) }
    var isCallActive by remember { mutableStateOf(false) }
    var showLeaveDialog by remember { mutableStateOf(false) }

    val moviePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        uri?.let {
            val fileName = uri.lastPathSegment ?: "movie.mp4"
            repository.selectHostMovie(it, fileName, "video/*", 0L)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // Video Player
        if (roomState.media.available || playerState.isReady) {
            VideoPlayerView(exoPlayer = repository.playerManager.exoPlayer)
        } else {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.Movie,
                        contentDescription = null,
                        tint = TextMuted,
                        modifier = Modifier.size(64.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    if (role == Role.HOST) {
                        Text(text = "Select a local movie file to begin watching", color = TextWhite, style = Typography.bodyLarge)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { moviePickerLauncher.launch(arrayOf("video/*")) },
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryPurple)
                        ) {
                            Icon(imageVector = Icons.Default.FolderOpen, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(text = "SELECT MOVIE FILE")
                        }
                    } else {
                        Text(text = "Waiting for host to select a movie...", color = TextMuted, style = Typography.bodyLarge)
                    }
                }
            }
        }

        // Transfer Progress Bar Overlay
        if (transferProgress.isTransferring) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopCenter)
                    .padding(16.dp),
                color = SurfaceDark.copy(alpha = 0.9f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(
                        progress = { transferProgress.percentage / 100f },
                        modifier = Modifier.size(24.dp),
                        color = AccentCyan
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "Transferring Movie: ${transferProgress.percentage.toInt()}%",
                        color = TextWhite,
                        style = Typography.bodyMedium
                    )
                }
            }
        }

        // Top Control Bar (Room info & Connection Status)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.TopCenter)
                .background(Color.Black.copy(alpha = 0.4f))
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .background(OnlineGreen, shape = RoundedCornerShape(5.dp))
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(text = "ROOM ${roomState.roomCode}", fontWeight = FontWeight.Bold, color = TextWhite)
            }

            Row {
                IconButton(onClick = { isCallActive = !isCallActive }) {
                    Icon(imageVector = Icons.Default.Videocam, contentDescription = "Call", tint = if (isCallActive) AccentCyan else TextWhite)
                }
                IconButton(onClick = { isChatOpen = !isChatOpen }) {
                    Icon(imageVector = Icons.Default.Chat, contentDescription = "Chat", tint = if (isChatOpen) PrimaryPurple else TextWhite)
                }
                IconButton(onClick = { showLeaveDialog = true }) {
                    Icon(imageVector = Icons.Default.ExitToApp, contentDescription = "Leave", tint = OfflineRed)
                }
            }
        }

        // Bottom Playback Controls
        if (playerState.isReady) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .background(Color.Black.copy(alpha = 0.6f))
                    .padding(16.dp)
            ) {
                Slider(
                    value = playerState.currentPositionMs.toFloat(),
                    onValueChange = { repository.seekTo(it.toLong()) },
                    valueRange = 0f..playerState.durationMs.toFloat().coerceAtLeast(1f),
                    colors = SliderDefaults.colors(thumbColor = PrimaryPurple, activeTrackColor = PrimaryPurple)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = formatTime(playerState.currentPositionMs) + " / " + formatTime(playerState.durationMs),
                        color = TextWhite,
                        style = Typography.bodyMedium
                    )

                    Row {
                        IconButton(onClick = {
                            if (playerState.isPlaying) repository.pause() else repository.play()
                        }) {
                            Icon(
                                imageVector = if (playerState.isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                contentDescription = "Play/Pause",
                                tint = TextWhite,
                                modifier = Modifier.size(36.dp)
                            )
                        }
                    }
                }
            }
        }

        // Video Call Picture-in-Picture Overlay
        if (isCallActive) {
            VideoCallOverlay(
                remoteVideoTrack = remoteVideoTrack,
                onEndCallClick = { isCallActive = false },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 70.dp, end = 16.dp)
            )
        }

        // Chat Panel Drawer Overlay
        if (isChatOpen) {
            ChatPanel(
                messages = chatMessages,
                onSendMessage = { repository.sendChatMessage(it) },
                onCloseClick = { isChatOpen = false },
                modifier = Modifier.align(Alignment.CenterEnd)
            )
        }

        // Leave Confirmation Dialog
        if (showLeaveDialog) {
            AlertDialog(
                onDismissRequest = { showLeaveDialog = false },
                title = { Text("Leave Watch Room?") },
                text = { Text("Are you sure you want to disconnect from this watch session?") },
                confirmButton = {
                    TextButton(onClick = {
                        showLeaveDialog = false
                        onLeaveClick()
                    }) {
                        Text("Leave", color = OfflineRed)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showLeaveDialog = false }) {
                        Text("Cancel", color = TextWhite)
                    }
                },
                containerColor = SurfaceDark,
                titleContentColor = TextWhite,
                textContentColor = TextMuted
            )
        }
    }
}

private fun formatTime(ms: Long): String {
    val totalSeconds = (ms / 1000).toInt()
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return String.format("%02d:%02d", minutes, seconds)
}

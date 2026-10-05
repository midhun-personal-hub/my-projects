package com.watchtogether.app.ui.screens.waiting

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.watchtogether.app.domain.model.Role
import com.watchtogether.app.domain.model.RoomState
import com.watchtogether.app.domain.model.RoomStatus
import com.watchtogether.app.ui.theme.*

@Composable
fun WaitingRoomScreen(
    roomState: RoomState,
    role: Role,
    onLeaveClick: () -> Unit
) {
    val context = LocalContext.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceDark),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = if (role == Role.HOST) "ROOM CREATED" else "ROOM JOINED",
                    style = Typography.bodyMedium,
                    color = AccentCyan
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = roomState.roomCode,
                    fontSize = 40.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextWhite,
                    letterSpacing = 4.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = {
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        val clip = ClipData.newPlainText("Room Code", roomState.roomCode)
                        clipboard.setPrimaryClip(clip)
                        Toast.makeText(context, "Room code copied!", Toast.LENGTH_SHORT).show()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SurfaceDark),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(imageVector = Icons.Default.ContentCopy, contentDescription = "Copy", tint = PrimaryPurple)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = "COPY CODE", color = TextWhite)
                }

                Spacer(modifier = Modifier.height(32.dp))

                Divider(color = TextMuted.copy(alpha = 0.2f))

                Spacer(modifier = Modifier.height(24.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    PeerPresenceItem(name = "Host", isConnected = true, isHost = true)
                    PeerPresenceItem(name = "Viewer", isConnected = roomState.viewerId != null, isHost = false)
                }

                Spacer(modifier = Modifier.height(32.dp))

                if (roomState.status == RoomStatus.CONNECTING) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = AccentCyan)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(text = "Establishing WebRTC Connection...", color = TextMuted, style = Typography.bodyMedium)
                    }
                } else {
                    Text(
                        text = "Waiting for your friend to connect...",
                        color = TextMuted,
                        style = Typography.bodyMedium
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))

                OutlinedButton(
                    onClick = onLeaveClick,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = OfflineRed),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(text = "Leave Room")
                }
            }
        }
    }
}

@Composable
private fun PeerPresenceItem(name: String, isConnected: Boolean, isHost: Boolean) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box {
            Surface(
                modifier = Modifier.size(56.dp),
                shape = RoundedCornerShape(28.dp),
                color = if (isConnected) PrimaryPurple.copy(alpha = 0.2f) else SurfaceDark
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = name,
                        tint = if (isConnected) PrimaryPurple else TextMuted
                    )
                }
            }
            Box(
                modifier = Modifier
                    .size(16.dp)
                    .background(if (isConnected) OnlineGreen else OfflineRed, shape = RoundedCornerShape(8.dp))
                    .align(Alignment.BottomEnd)
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = name, style = Typography.bodyMedium, color = TextWhite)
    }
}

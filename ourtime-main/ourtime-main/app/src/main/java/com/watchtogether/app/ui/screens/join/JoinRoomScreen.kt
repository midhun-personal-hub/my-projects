package com.watchtogether.app.ui.screens.join

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.watchtogether.app.ui.theme.*

@Composable
fun JoinRoomScreen(
    isLoading: Boolean,
    error: String?,
    onJoinConfirm: (String) -> Unit,
    onBackClick: () -> Unit
) {
    var roomCodeInput by remember { mutableStateOf("") }

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
                    text = "Join Watch Room",
                    style = Typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "Enter the 6-character room code shared by the host.",
                    style = Typography.bodyMedium,
                    color = TextMuted,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(24.dp))

                OutlinedTextField(
                    value = roomCodeInput,
                    onValueChange = { if (it.length <= 6) roomCodeInput = it.uppercase() },
                    label = { Text("Room Code") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = PrimaryPurple,
                        unfocusedBorderColor = TextMuted,
                        focusedLabelColor = PrimaryPurple,
                        unfocusedLabelColor = TextMuted,
                        focusedTextColor = TextWhite,
                        unfocusedTextColor = TextWhite
                    )
                )

                Spacer(modifier = Modifier.height(24.dp))

                if (error != null) {
                    Text(
                        text = error,
                        color = OfflineRed,
                        style = Typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                }

                if (isLoading) {
                    CircularProgressIndicator(color = PrimaryPurple)
                } else {
                    Button(
                        onClick = { onJoinConfirm(roomCodeInput.trim()) },
                        enabled = roomCodeInput.length == 6,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AccentCyan),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(text = "JOIN ROOM", style = Typography.bodyLarge, fontWeight = FontWeight.Bold, color = DarkBackground)
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    TextButton(onClick = onBackClick) {
                        Text(text = "Cancel", color = TextMuted)
                    }
                }
            }
        }
    }
}

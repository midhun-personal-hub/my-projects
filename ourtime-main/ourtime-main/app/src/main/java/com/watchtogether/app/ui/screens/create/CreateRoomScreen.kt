package com.watchtogether.app.ui.screens.create

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.watchtogether.app.ui.theme.*

@Composable
fun CreateRoomScreen(
    isLoading: Boolean,
    error: String?,
    onCreateConfirm: () -> Unit,
    onBackClick: () -> Unit
) {
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
                    text = "Create Watch Room",
                    style = Typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "You will be assigned as HOST. A unique 6-character room code will be generated for your viewer to join.",
                    style = Typography.bodyMedium,
                    color = TextMuted
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
                        onClick = onCreateConfirm,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryPurple),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(text = "GENERATE ROOM", style = Typography.bodyLarge, fontWeight = FontWeight.Bold)
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

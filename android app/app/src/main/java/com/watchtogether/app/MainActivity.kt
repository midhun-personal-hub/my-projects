package com.watchtogether.app

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import com.watchtogether.app.data.repository.WatchTogetherRepository
import com.watchtogether.app.domain.model.Role
import com.watchtogether.app.domain.model.RoomStatus
import com.watchtogether.app.ui.screens.create.CreateRoomScreen
import com.watchtogether.app.ui.screens.home.HomeScreen
import com.watchtogether.app.ui.screens.join.JoinRoomScreen
import com.watchtogether.app.ui.screens.waiting.WaitingRoomScreen
import com.watchtogether.app.ui.screens.watch.WatchRoomScreen
import com.watchtogether.app.ui.theme.WatchTogetherTheme
import kotlinx.coroutines.launch

enum class Screen {
    HOME,
    CREATE,
    JOIN,
    WAITING,
    WATCH
}

class MainActivity : ComponentActivity() {
    private lateinit var repository: WatchTogetherRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        repository = WatchTogetherRepository(applicationContext)

        setContent {
            WatchTogetherTheme {
                var currentScreen by remember { mutableStateOf(Screen.HOME) }
                var isLoading by remember { mutableStateOf(false) }
                var error by remember { mutableStateOf<String?>(null) }
                var role by remember { mutableStateOf(Role.VIEWER) }

                val scope = rememberCoroutineScope()
                val roomState by repository.roomState.collectAsState()

                // Auto navigate to WatchRoom when connected and media available or starting
                LaunchedEffect(roomState.status) {
                    if (roomState.status == RoomStatus.CONNECTED && currentScreen == Screen.WAITING) {
                        currentScreen = Screen.WATCH
                    }
                }

                when (currentScreen) {
                    Screen.HOME -> HomeScreen(
                        onCreateRoomClick = { currentScreen = Screen.CREATE },
                        onJoinRoomClick = { currentScreen = Screen.JOIN }
                    )

                    Screen.CREATE -> CreateRoomScreen(
                        isLoading = isLoading,
                        error = error,
                        onCreateConfirm = {
                            scope.launch {
                                isLoading = true
                                error = null
                                try {
                                    repository.createRoom()
                                    role = Role.HOST
                                    currentScreen = Screen.WAITING
                                } catch (e: Exception) {
                                    error = e.localizedMessage ?: "Failed to create room"
                                } finally {
                                    isLoading = false
                                }
                            }
                        },
                        onBackClick = { currentScreen = Screen.HOME }
                    )

                    Screen.JOIN -> JoinRoomScreen(
                        isLoading = isLoading,
                        error = error,
                        onJoinConfirm = { roomCode ->
                            scope.launch {
                                isLoading = true
                                error = null
                                try {
                                    repository.joinRoom(roomCode)
                                    role = Role.VIEWER
                                    currentScreen = Screen.WAITING
                                } catch (e: Exception) {
                                    error = e.localizedMessage ?: "Invalid or expired room code"
                                } finally {
                                    isLoading = false
                                }
                            }
                        },
                        onBackClick = { currentScreen = Screen.HOME }
                    )

                    Screen.WAITING -> WaitingRoomScreen(
                        roomState = roomState,
                        role = role,
                        onLeaveClick = {
                            repository.release()
                            currentScreen = Screen.HOME
                        }
                    )

                    Screen.WATCH -> WatchRoomScreen(
                        repository = repository,
                        role = role,
                        onLeaveClick = {
                            repository.release()
                            currentScreen = Screen.HOME
                        }
                    )
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        repository.release()
    }
}

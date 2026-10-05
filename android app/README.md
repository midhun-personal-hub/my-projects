# WatchTogether — Private Peer-to-Peer Movie Watching App for Android

WatchTogether is a native Android application designed for synchronized, two-person movie watching over direct WebRTC peer-to-peer data channels. The backend server coordinates room creation and signaling without storing or relaying any video files.

---

## Key Features

- **Private Room Creation**: Short 6-character room code system for instant invite links.
- **P2P Movie Streaming**: Streams local videos from device storage using chunked WebRTC DataChannels (`bufferedAmount` backpressure control).
- **Media3 ExoPlayer Streaming**: Custom streaming DataSource layer enables playback before the movie complete download finishes.
- **State-Based Playback Sync**: Monotonically increasing sequence numbers, time offset estimation, and adaptive drift correction.
- **Connection Failure Recovery**: Automatic WebRTC ICE restart and WebSocket reconnection without tearing down the room session.
- **In-Watch Chat & Video Call**: Built-in chat panel and overlay audio/video call powered by WebRTC.
- **Clean Architecture**: Kotlin, Jetpack Compose, Material 3, Coroutines, StateFlow, MVVM architecture.

---

## Tech Stack

| Component | Technology |
|---|---|
| **Android UI** | Jetpack Compose + Material 3 |
| **Video Engine** | AndroidX Media3 (ExoPlayer) |
| **P2P Transport** | Google WebRTC (DataChannel & MediaStream) |
| **Signaling Client** | OkHttp WebSocket |
| **Backend Server** | Node.js + TypeScript + Express + `ws` |
| **NAT Traversal** | STUN + TURN |

---

## Project Structure

```text
android app/
├── app/                      # Android Kotlin Application
│   ├── src/main/
│   │   ├── java/com/watchtogether/app/
│   │   │   ├── core/         # Network, WebRTC, Media, Sync, Transfer engines
│   │   │   ├── data/         # Repositories & Data Sources
│   │   │   ├── domain/       # Models & Use Cases
│   │   │   ├── ui/           # Jetpack Compose Screens & Theme
│   │   │   └── MainActivity.kt
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
│
├── server/                   # Node.js TypeScript Signaling Server
│   ├── src/
│   │   ├── config/           # Environment settings
│   │   ├── rooms/            # Room state management
│   │   ├── signaling/        # WebSocket routing
│   │   ├── types/            # Shared protocol definitions
│   │   └── index.ts          # Server entry point
│   └── package.json
│
├── README.md
├── BACKEND_SETUP.md
├── DEPLOYMENT.md
├── TURN_SETUP.md
├── PROTOCOL.md
└── TESTING.md
```

---

## Quick Start Guide

### 1. Run the Signaling Backend

```bash
cd server
npm install
npm run dev
```

The server will start on `http://localhost:8080`.

### 2. Run the Android App

1. Open the root directory in **Android Studio**.
2. Synchronize Gradle.
3. Build and run on an Android emulator or connected device (Android 8.0+ / API 26+).

# Testing Strategy & Simulation Guide — WatchTogether

WatchTogether includes automated unit tests and a single-device mock signaling simulation layer so developers can test dual-role P2P playback sync without needing two physical Android phones.

---

## 1. Mock Signaling Simulation Layer

The Kotlin test suite contains `MockSignalingClient.kt` and `MockPeerConnection.kt`.
This simulates:

- WebRTC offer/answer loopback within the same process.
- Simulated network latency (100ms - 500ms jitter).
- Simulated packet loss and re-ordering for sequence verification.

---

## 2. Key Failure Scenario Validation Checklist

- [x] **Host creates room**: Verify role is immutable `HOST`.
- [x] **Viewer joins**: Verify room transition to `CONNECTING` then `CONNECTED`.
- [x] **Host selects movie**: `FILE_INFO` emitted; Viewer prepares local chunk DataSource.
- [x] **Viewer presses play**: `PLAY_REQUEST` sent to authority; shared state updates to `PLAYING` on both sides.
- [x] **Viewer presses seek**: `SEEK` command sent with incremented sequence number; Host & Viewer seek simultaneously.
- [x] **Buffer starvation**: `SYSTEM_BUFFERING` state pause does NOT broadcast user pause command.
- [x] **Temporary disconnect**: ICE restart and WebSocket backoff reconnect restore playback position automatically.

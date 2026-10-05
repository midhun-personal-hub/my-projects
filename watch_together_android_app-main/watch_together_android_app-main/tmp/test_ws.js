const https = require("https");

function api(method, path, body) {
  return new Promise((res, rej) => {
    const data = body ? JSON.stringify(body) : "";
    const req = https.request("https://watch-together-android-app-1.onrender.com" + path, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
      }
    }, (r) => {
      let b = "";
      r.on("data", c => b += c);
      r.on("end", () => res(JSON.parse(b)));
    });
    req.on("error", rej);
    if (data) req.write(data);
    req.end();
  });
}

function connect(roomCode, role, onMsg) {
  return new Promise((resolve, reject) => {
    const key = Buffer.from("testkey" + Math.random()).toString("base64");
    const req = https.request("https://watch-together-android-app-1.onrender.com/ws?roomCode=" + roomCode + "&role=" + role, {
      headers: {
        "Connection": "Upgrade",
        "Upgrade": "websocket",
        "Sec-WebSocket-Key": key,
        "Sec-WebSocket-Version": "13"
      }
    });
    req.on("upgrade", (res, socket) => {
      let buf = Buffer.alloc(0);
      socket.on("data", (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        while (buf.length >= 2) {
          let len = buf[1] & 0x7f;
          let offset = 2;
          if (len === 126) {
            if (buf.length < 4) return;
            len = buf.readUInt16BE(2);
            offset = 4;
          } else if (len === 127) {
            if (buf.length < 10) return;
            len = Number(buf.readBigUInt64BE(2));
            offset = 10;
          }
          if (buf.length < offset + len) return;
          const payload = buf.slice(offset, offset + len);
          buf = buf.slice(offset + len);
          try {
            const msg = JSON.parse(payload.toString("utf8"));
            onMsg(msg);
          } catch (e) {
            console.log("Parse err:", e.message);
          }
        }
      });
      function send(obj) {
        const p = Buffer.from(JSON.stringify(obj), "utf8");
        const mask = Buffer.from([1, 2, 3, 4]);
        const masked = Buffer.alloc(p.length);
        for (let i = 0; i < p.length; i++) masked[i] = p[i] ^ mask[i % 4];
        let h;
        if (p.length <= 125) {
          h = Buffer.alloc(6);
          h[0] = 0x81;
          h[1] = 0x80 | p.length;
          mask.copy(h, 2);
        } else if (p.length <= 65535) {
          h = Buffer.alloc(8);
          h[0] = 0x81;
          h[1] = 0x80 | 126;
          h.writeUInt16BE(p.length, 2);
          mask.copy(h, 4);
        } else {
          h = Buffer.alloc(14);
          h[0] = 0x81;
          h[1] = 0x80 | 127;
          h.writeBigUInt64BE(BigInt(p.length), 2);
          mask.copy(h, 10);
        }
        socket.write(Buffer.concat([h, masked]));
      }
      resolve({ socket, send });
    });
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  const roomRes = await api("POST", "/api/rooms");
  const code = roomRes.roomCode;
  console.log("Room created:", code);

  const host = await connect(code, "HOST", (m) => console.log("[HOST RECV]", m.type));
  const viewer = await connect(code, "VIEWER", (m) => console.log("[VIEWER RECV]", m.type, m.payload ? Object.keys(m.payload) : ""));

  await new Promise(r => setTimeout(r, 1000));
  console.log("Sending MEDIA_STARTED...");
  host.send({
    type: "MEDIA_STARTED",
    roomCode: code,
    payload: { name: "1000479846", durationMs: 120000, uri: "content://picker/1000479846" }
  });

  await new Promise(r => setTimeout(r, 1000));
  console.log("Sending FILE_TRANSFER_START...");
  host.send({
    type: "FILE_TRANSFER_START",
    roomCode: code,
    payload: { fileName: "1000479846", fileSize: 5000000, totalChunks: 100, chunkSize: 32768 }
  });

  await new Promise(r => setTimeout(r, 1000));
  console.log("Sending 44KB FILE_TRANSFER_CHUNK...");
  const dummyChunk = Buffer.alloc(32768, 65).toString("base64");
  host.send({
    type: "FILE_TRANSFER_CHUNK",
    roomCode: code,
    payload: { chunkIndex: 0, totalChunks: 100, data: dummyChunk }
  });

  await new Promise(r => setTimeout(r, 2000));
  console.log("Done testing!");
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});

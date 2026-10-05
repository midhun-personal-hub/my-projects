# STUN / TURN Server Configuration — WatchTogether

When two Android devices are on different Wi-Fi/Cellular networks behind symmetric NATs or firewalls, direct P2P connections via STUN might fail. A TURN (Traversal Using Relays around NAT) server is required to relay P2P data.

---

## 1. Setting up Coturn

Install coturn on Ubuntu/Debian server:

```bash
sudo apt-get update
sudo apt-get install coturn
```

Edit `/etc/turnserver.conf`:

```ini
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=YOUR_SECURE_SECRET
realm=turn.example.com
total-quota=100
bps-capacity=0
stale-nonce
no-loopback-peers
no-multicast-peers
```

Start the service:

```bash
sudo systemctl restart coturn
```

---

## 2. Dynamic Secret Credentials in Node.js Backend

To generate temporary credentials valid for 24 hours:

```typescript
import crypto from 'crypto';

export function getTurnCredentials(secret: string, username: string, ttlSeconds = 86400) {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const tempUser = `${expiry}:${username}`;
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(tempUser);
  const credential = hmac.digest('base64');

  return { username: tempUser, credential };
}
```

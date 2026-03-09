# Nzalang-Sync — WebSocket Protocol Specification

> Real-time traffic reporting and alerting for INTELIJGPS

---

## Connection

| Property | Value |
|----------|-------|
| **Endpoint** | `wss://api.intelijgps.gq/ws/nzalang-sync` |
| **Protocol** | WebSocket (RFC 6455) over TLS 1.3 |
| **Auth** | JWT token in `Authorization` header or `?token=` query param |
| **Heartbeat** | Client sends `PING` every 30s; server responds `PONG` |
| **Reconnect** | Exponential backoff: 1s, 2s, 4s, 8s, max 30s |

---

## Message Format

All messages are JSON with this envelope:

```json
{
  "type": "MESSAGE_TYPE",
  "payload": { ... },
  "timestamp": "ISO-8601",
  "sender_id": "optional-anon-hash"
}
```

---

## Message Types

### Client → Server

#### `SUBSCRIBE`
Subscribe to a traffic channel.

```json
{
  "type": "SUBSCRIBE",
  "payload": {
    "region": "INSULAR",
    "city": "Malabo"
  }
}
```

#### `UNSUBSCRIBE`
```json
{
  "type": "UNSUBSCRIBE",
  "payload": {
    "region": "INSULAR",
    "city": "Malabo"
  }
}
```

#### `TRAFFIC_REPORT`
Submit a new traffic report.

```json
{
  "type": "TRAFFIC_REPORT",
  "payload": {
    "report_type": "ROAD_CUT",
    "severity": 4,
    "title": "Carretera cortada por lluvia en Rebola",
    "description": "La carretera entre Malabo y Rebola está cortada a la altura del km 12",
    "geom": {
      "type": "Point",
      "coordinates": [8.75, 3.72]
    },
    "road_name": "Carretera de Rebola",
    "city": "Malabo",
    "region": "INSULAR",
    "expires_at": "2026-03-09T18:00:00Z"
  },
  "timestamp": "2026-03-09T12:05:00Z",
  "sender_id": "anon-sha256-hash"
}
```

#### `VOTE`
Upvote or downvote a traffic report for community validation.

```json
{
  "type": "VOTE",
  "payload": {
    "report_id": 42,
    "vote": "UP"
  }
}
```

#### `PING`
```json
{ "type": "PING" }
```

---

### Server → Client

#### `CONNECT_ACK`
Sent immediately after successful connection.

```json
{
  "type": "CONNECT_ACK",
  "payload": {
    "session_id": "uuid-v4",
    "server_time": "2026-03-09T12:00:00Z"
  }
}
```

#### `SUBSCRIBE_ACK`
```json
{
  "type": "SUBSCRIBE_ACK",
  "payload": {
    "channel": "traffic:INSULAR:Malabo",
    "active_reports": 3
  }
}
```

#### `TRAFFIC_ALERT`
Broadcast to all subscribers when a new report is submitted.

```json
{
  "type": "TRAFFIC_ALERT",
  "payload": {
    "report_id": 42,
    "report_type": "ROAD_CUT",
    "severity": 4,
    "title": "Carretera cortada por lluvia en Rebola",
    "geom": {
      "type": "Point",
      "coordinates": [8.75, 3.72]
    },
    "road_name": "Carretera de Rebola",
    "city": "Malabo",
    "region": "INSULAR",
    "confidence": 0.50,
    "expires_at": "2026-03-09T18:00:00Z"
  },
  "timestamp": "2026-03-09T12:05:01Z"
}
```

#### `REPORT_EXPIRED`
Sent when a report auto-expires or is manually deactivated.

```json
{
  "type": "REPORT_EXPIRED",
  "payload": {
    "report_id": 42,
    "reason": "auto_expired"
  }
}
```

#### `PONG`
```json
{ "type": "PONG" }
```

#### `ERROR`
```json
{
  "type": "ERROR",
  "payload": {
    "code": 4001,
    "message": "Invalid report_type value"
  }
}
```

---

## Report Types

| Code | Description | Icon |
|------|-------------|------|
| `ROAD_CUT` | Carretera cortada (road blocked) | 🚧 |
| `HEAVY_TRAFFIC` | Tráfico denso | 🚗 |
| `TOLL_STATUS` | Estado del peaje | 💰 |
| `FLOOD` | Inundación por lluvia | 🌊 |
| `ACCIDENT` | Accidente de tráfico | ⚠️ |
| `POLICE_CHECKPOINT` | Control policial | 👮 |
| `ROAD_WORK` | Obras en la vía | 🔨 |

## Severity Scale

| Level | Meaning | Color |
|-------|---------|-------|
| 1 | Informational — minor delay | 🟢 Green |
| 2 | Low — slight slowdown | 🟡 Yellow |
| 3 | Medium — significant delay | 🟠 Orange |
| 4 | High — road partially blocked | 🔴 Red |
| 5 | Critical — road impassable | ⚫ Black |

---

## Channel Structure

Channels follow the pattern: `traffic:{REGION}:{CITY}`

| Channel | Coverage |
|---------|----------|
| `traffic:INSULAR:Malabo` | Malabo and Bioko Island |
| `traffic:CONTINENTAL:Bata` | Bata metro area |
| `traffic:CONTINENTAL:Ebebiyin` | Ebebiyín area |
| `traffic:INSULAR:*` | All of Bioko Island |
| `traffic:CONTINENTAL:*` | All Continental region |
| `traffic:*:*` | Entire country |

---

## Error Codes

| Code | Meaning |
|------|---------|
| 4000 | Bad request — malformed JSON |
| 4001 | Invalid field value |
| 4002 | Missing required field |
| 4003 | Authentication required |
| 4004 | Rate limit exceeded (max 10 reports/min) |
| 4005 | Channel not found |
| 5000 | Internal server error |

---

## Spring Boot Server Implementation Notes

```java
// WebSocketConfig.java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Use Redis-backed broker for horizontal scaling
        config.enableStompBrokerRelay("/topic")
              .setRelayHost("redis-host")
              .setRelayPort(6379);
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/nzalang-sync")
                .setAllowedOrigins("*")
                .withSockJS();
    }
}
```

```java
// TrafficReportController.java
@Controller
public class TrafficReportController {

    @MessageMapping("/traffic.report")
    @SendTo("/topic/traffic.{region}.{city}")
    public TrafficAlert handleReport(
            @Payload TrafficReportMessage message,
            SimpMessageHeaderAccessor headerAccessor) {

        // Validate and persist
        TrafficReport saved = trafficService.create(message);

        // Broadcast as alert
        return TrafficAlert.from(saved);
    }
}
```

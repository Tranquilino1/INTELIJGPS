# INTELIJGPS — System Architecture

> **INTELIJGPS** — *Navegación Inteligente para Guinea Ecuatorial*
> Landmark-based, offline-first navigation tailored to the geographic and cultural context of Equatorial Guinea.

---

## 1. High-Level Architecture

```mermaid
graph TB
    subgraph "📱 Mobile Client — Flutter"
        UI["UI Layer<br/>Flutter + Mapbox SDK"]
        OFFLINE["Offline Engine<br/>Vector Tiles + SQLite"]
        VOICE["Voice Assistant<br/>Español Ecuatoguineano TTS"]
        GPS["GPS Module<br/>Native Location Services"]
        WS_CLIENT["WebSocket Client<br/>Nzalang-Sync"]
        CACHE["Local Cache<br/>Hive / SQLite"]
    end

    subgraph "🌐 API Gateway — Spring Cloud Gateway"
        GW["API Gateway<br/>Rate Limiting, Auth, Routing"]
    end

    subgraph "☁️ Backend Microservices — Spring Boot (Java 17+)"
        NAV["🧭 Navigation Service<br/>Landmark Routing Engine"]
        LANDMARK["📍 Landmark Service<br/>Cultural Reference CRUD"]
        TRAFFIC["🚦 Traffic Service<br/>Real-Time Reports"]
        TILE["🗺️ Tile Server<br/>Vector Tile Generation"]
        VOICE_SVC["🗣️ Voice Service<br/>TTS + Local Modisms"]
        AUTH["🔐 Auth Service<br/>JWT + OAuth2"]
        SYNC["⚡ Sync Service<br/>WebSocket Broker"]
    end

    subgraph "🗄️ Data Layer"
        PG["PostgreSQL 16<br/>+ PostGIS 3.4"]
        REDIS["Redis<br/>Session Cache + Pub/Sub"]
        S3["Object Storage<br/>Tile Cache (MinIO/S3)"]
        MQ["Message Broker<br/>RabbitMQ / Kafka"]
    end

    subgraph "🗺️ Map Data Sources"
        OSM["OpenStreetMap<br/>Base Cartography"]
        FIELD["Field Data Collection<br/>KoBoToolbox + OSMAnd"]
    end

    UI --> GW
    GPS --> UI
    WS_CLIENT -->|"WebSocket"| SYNC
    OFFLINE -->|"Local Nav"| GPS

    GW --> NAV
    GW --> LANDMARK
    GW --> TRAFFIC
    GW --> TILE
    GW --> VOICE_SVC
    GW --> AUTH

    SYNC --> MQ
    MQ --> TRAFFIC

    NAV --> PG
    LANDMARK --> PG
    TRAFFIC --> PG
    TRAFFIC --> REDIS
    TILE --> S3
    TILE --> PG

    OSM --> TILE
    FIELD --> LANDMARK

    style UI fill:#2E7D32,color:#fff
    style GW fill:#1565C0,color:#fff
    style PG fill:#0D47A1,color:#fff
    style REDIS fill:#C62828,color:#fff
```

---

## 2. Communication Protocols

| Flow | Protocol | Description |
|------|----------|-------------|
| **Mobile ↔ API Gateway** | HTTPS / REST | All CRUD ops, route requests, tile downloads |
| **Mobile ↔ Sync Service** | WSS (WebSocket Secure) | Real-time traffic alerts (Nzalang-Sync) |
| **Traffic Service ↔ Redis** | Pub/Sub | Fan-out traffic events to all connected clients |
| **Tile Server ↔ Object Storage** | S3 API | Pre-rendered vector tile retrieval |
| **Navigation Service ↔ PostGIS** | SQL + Spatial Queries | `ST_DWithin`, `ST_Distance`, pgRouting |
| **Field Collection → Landmark Service** | REST Batch Import | Bulk POI ingestion from KoBoToolbox exports |

---

## 3. Microservice Responsibilities

### 🧭 Navigation Service
- Receives user GPS coordinates + heading
- Queries PostGIS for nearest landmarks using `ST_DWithin`
- Computes relative spatial relationship (ahead, behind, left, right)
- Returns culturally-aware navigation instruction
- Supports pgRouting for turn-by-turn directions

### 📍 Landmark Service
- Full CRUD for cultural landmarks (Hitos Culturales)
- Fuzzy name search via `pg_trgm` trigram index
- Alias resolution (multiple names per landmark)
- Community submission queue with admin moderation
- Batch import from KoBoToolbox field surveys

### 🚦 Traffic Service
- Stores and queries real-time traffic reports
- Confidence scoring based on community upvotes/downvotes
- Automatic report expiration (`expires_at`)
- Spatial query for reports along a route corridor

### 🗺️ Tile Server
- Generates and serves Mapbox Vector Tiles (MVT)
- Pre-packages regional tile bundles (`.mbtiles`) for offline download
- Incremental tile updates triggered by landmark database changes

### ⚡ Sync Service (Nzalang-Sync)
- WebSocket server for real-time bidirectional communication
- Channel-based subscriptions (region + city)
- Redis Pub/Sub backend for horizontal scaling
- Heartbeat and automatic reconnection handling

### 🗣️ Voice Service
- Text-to-Speech with Español Ecuatoguineano locale
- Curated modism dictionary for natural-sounding instructions
- Fallback to standard Spanish TTS

### 🔐 Auth Service
- JWT-based stateless authentication
- OAuth2 social login (Google, Facebook)
- Anonymous mode for basic navigation (no account required)

---

## 4. Offline-First Architecture

```mermaid
sequenceDiagram
    participant User as 📱 User
    participant App as Flutter App
    participant Cache as Local SQLite
    participant Server as Spring Boot API

    User->>App: Open App
    App->>Cache: Load cached tiles + landmarks
    Cache-->>App: Return local data
    App-->>User: Render map (offline OK)

    alt Network Available
        App->>Server: GET /api/tiles/package/{region}
        Server-->>App: Vector tile .mbtiles bundle
        App->>Cache: Store tiles locally
        App->>Server: GET /api/landmarks/sync?since={timestamp}
        Server-->>App: Delta landmark updates
        App->>Cache: Merge landmark updates
    end

    User->>App: Navigate to destination
    App->>Cache: Query nearest landmarks (local PostGIS-lite)
    Cache-->>App: Landmark results
    App-->>User: Voice: "Gira a la derecha frente al surtidor de Total"
```

### Tile Package Sizes (Estimated)

| Package | Zoom Levels | Size |
|---------|------------|------|
| Malabo Centro | Z10–Z16 | ~45 MB |
| Bata Centro | Z10–Z16 | ~35 MB |
| Carretera Nacional N1 | Z10–Z14 | ~80 MB |
| Full Country Pack | Z10–Z16 | ~250 MB |

### Sync Strategy
- **Delta sync**: Client sends `last_sync_timestamp`, server returns only changes since then
- **Conflict resolution**: Server-wins strategy for landmarks; client-wins for user preferences
- **Background sync**: Android WorkManager / iOS BGTaskScheduler for periodic updates

---

## 5. Nzalang-Sync — WebSocket Protocol

```mermaid
sequenceDiagram
    participant Driver as 🚗 Driver App
    participant WS as WebSocket Server
    participant Redis as Redis Pub/Sub
    participant Others as 📱 Other Users

    Driver->>WS: CONNECT /ws/nzalang-sync
    WS-->>Driver: ACK + session_id

    Driver->>WS: SUBSCRIBE {region: "INSULAR", city: "Malabo"}
    WS->>Redis: SUBSCRIBE channel:traffic:INSULAR:Malabo

    Driver->>WS: REPORT {type: "ROAD_CUT", geom: {...}, title: "Carretera cortada por lluvia"}
    WS->>Redis: PUBLISH channel:traffic:INSULAR:Malabo
    Redis-->>WS: Fan-out to subscribers
    WS-->>Others: ALERT {type: "ROAD_CUT", ...}
```

### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `CONNECT_ACK` | Server → Client | Connection confirmed with session ID |
| `SUBSCRIBE` | Client → Server | Subscribe to traffic channel (region + city) |
| `UNSUBSCRIBE` | Client → Server | Unsubscribe from channel |
| `TRAFFIC_REPORT` | Client → Server | Submit new traffic report |
| `TRAFFIC_ALERT` | Server → Client | Broadcast traffic event to subscribers |
| `HEARTBEAT` | Bidirectional | Keep-alive ping/pong every 30s |

### Message Schema

```json
{
  "type": "TRAFFIC_REPORT",
  "payload": {
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
    "expires_at": "2026-03-09T18:00:00Z"
  },
  "timestamp": "2026-03-09T12:05:00Z",
  "sender_id": "anon-sha256-hash"
}
```

---

## 6. Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Mobile | Flutter | 3.x | Cross-platform (Android + iOS) |
| Maps SDK | Mapbox GL | Latest | Vector map rendering + offline |
| Backend | Java | 17+ | Microservice logic |
| Framework | Spring Boot | 3.x | REST APIs, WebSocket, Security |
| Gateway | Spring Cloud Gateway | 4.x | API routing, rate limiting |
| Database | PostgreSQL | 16 | Primary data store |
| Geo Extension | PostGIS | 3.4 | Spatial queries, geometry |
| Routing | pgRouting | 3.x | Graph-based path finding |
| Cache | Redis | 7.x | Session cache, Pub/Sub |
| Message Broker | RabbitMQ | 3.x | Async event processing |
| Object Storage | MinIO / AWS S3 | — | Tile bundles, media |
| Field Survey | KoBoToolbox | — | Data collection forms |
| Map Data | OpenStreetMap | — | Base cartography |

---

## 7. Security Architecture

- **Transport**: TLS 1.3 for all HTTP and WebSocket connections
- **Authentication**: JWT tokens with 15-min access + 7-day refresh rotation
- **Authorization**: Role-based (ANONYMOUS, USER, CONTRIBUTOR, MODERATOR, ADMIN)
- **Data Privacy**: GPS coordinates are never stored with user identity; anonymous hashing for traffic reports
- **API Rate Limiting**: 100 req/min for authenticated, 20 req/min for anonymous
- **Input Validation**: All GeoJSON validated against RFC 7946 before PostGIS insertion

-- ============================================================
--  INTELIJGPS — V1: Init PostGIS Schema
--  Guinea Ecuatorial Navigation Platform
-- ============================================================

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ─── Cultural Landmarks (Hitos Culturales) ────────────────────────────────
CREATE TABLE cultural_landmarks (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(255)           NOT NULL,
    alias         TEXT[]                 DEFAULT '{}',
    category      VARCHAR(100)           NOT NULL,
    -- Categories: gasolinera, mercado, hospital, gobierno, educacion,
    --             iglesia, mezquita, hotel, restaurante, estadio, puerto,
    --             aeropuerto, banco, policia, otro
    city          VARCHAR(100)           NOT NULL,
    region        VARCHAR(100)           NOT NULL,
    geom          GEOMETRY(POINT, 4326)  NOT NULL,
    address_hint  TEXT,
    importance    SMALLINT               DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
    is_verified   BOOLEAN                DEFAULT FALSE,
    source        VARCHAR(50)            DEFAULT 'crowdsource',
    -- source values: osm, crowdsource, official, mapathon
    phone         VARCHAR(30),
    opening_hours VARCHAR(100),
    created_at    TIMESTAMPTZ            DEFAULT NOW(),
    updated_at    TIMESTAMPTZ            DEFAULT NOW()
);

CREATE INDEX idx_landmarks_geom     ON cultural_landmarks USING GIST (geom);
CREATE INDEX idx_landmarks_city     ON cultural_landmarks (city);
CREATE INDEX idx_landmarks_category ON cultural_landmarks (category);
CREATE INDEX idx_landmarks_name_fts ON cultural_landmarks
    USING GIN (to_tsvector('spanish', name));

-- ─── Traffic Reports (Reportes de Tráfico) ───────────────────────────────
CREATE TABLE traffic_reports (
    id            BIGSERIAL PRIMARY KEY,
    report_type   VARCHAR(50)            NOT NULL,
    -- Types: corte_lluvia, peaje_bloqueado, accidente, trafico_pesado,
    --        obra_vial, inundacion, alud
    severity      SMALLINT               NOT NULL CHECK (severity BETWEEN 1 AND 3),
    -- 1=leve, 2=moderado, 3=grave
    geom          GEOMETRY(POINT, 4326)  NOT NULL,
    affected_road VARCHAR(255),
    description   TEXT,
    reporter_id   BIGINT,
    confirmed_by  INT                    DEFAULT 0,
    is_active     BOOLEAN                DEFAULT TRUE,
    expires_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ            DEFAULT NOW()
);

CREATE INDEX idx_traffic_geom   ON traffic_reports USING GIST (geom);
CREATE INDEX idx_traffic_active ON traffic_reports (is_active, expires_at);
CREATE INDEX idx_traffic_type   ON traffic_reports (report_type);

-- ─── Route Segments (Red Vial para pgRouting) ───────────────────────────
CREATE TABLE route_segments (
    id            BIGSERIAL PRIMARY KEY,
    osm_id        BIGINT,
    source        BIGINT,
    target        BIGINT,
    cost          FLOAT,                  -- Seconds (travel time)
    reverse_cost  FLOAT,
    road_name     VARCHAR(255),
    road_type     VARCHAR(50),
    -- Types: principal, secundaria, local, trocha, pista_tierra
    is_paved      BOOLEAN                DEFAULT FALSE,
    max_speed_kmh INT                    DEFAULT 50,
    geom          GEOMETRY(LINESTRING, 4326) NOT NULL
);

CREATE INDEX idx_segments_geom   ON route_segments USING GIST (geom);
CREATE INDEX idx_segments_source ON route_segments (source);
CREATE INDEX idx_segments_target ON route_segments (target);

-- ─── Users ────────────────────────────────────────────────────────────────
CREATE TABLE app_users (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(100)  NOT NULL UNIQUE,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          VARCHAR(20)   DEFAULT 'USER',
    is_active     BOOLEAN       DEFAULT TRUE,
    created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── Auto-update timestamp function ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_landmarks_updated_at
    BEFORE UPDATE ON cultural_landmarks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

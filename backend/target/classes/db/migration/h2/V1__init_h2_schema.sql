-- ============================================================
-- INTELIJGPS - V1: Init H2GIS Schema
-- ============================================================

-- Enable H2GIS extension
CREATE ALIAS IF NOT EXISTS H2GIS_SPATIAL FOR "org.h2gis.functions.factory.H2GISFunctions.load";
CALL H2GIS_SPATIAL();

-- Cultural Landmarks
CREATE TABLE cultural_landmarks (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(255)           NOT NULL,
    alias         VARCHAR ARRAY,         -- Using VARCHAR ARRAY for H2
    category      VARCHAR(100)           NOT NULL,
    city          VARCHAR(100)           NOT NULL,
    region        VARCHAR(100)           NOT NULL,
    geom          GEOMETRY               NOT NULL,
    address_hint  VARCHAR(1000),
    importance    SMALLINT               DEFAULT 5,
    is_verified   BOOLEAN                DEFAULT FALSE,
    source        VARCHAR(50)            DEFAULT 'crowdsource',
    phone         VARCHAR(30),
    opening_hours VARCHAR(100),
    created_at    TIMESTAMP              DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP              DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_landmarks_geom     ON cultural_landmarks(geom);
CREATE INDEX idx_landmarks_city     ON cultural_landmarks(city);
CREATE INDEX idx_landmarks_category ON cultural_landmarks(category);

-- Traffic Reports
CREATE TABLE traffic_reports (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    report_type   VARCHAR(50)            NOT NULL,
    severity      SMALLINT               NOT NULL,
    geom          GEOMETRY               NOT NULL,
    affected_road VARCHAR(255),
    description   VARCHAR(1000),
    reporter_id   BIGINT,
    confirmed_by  INT                    DEFAULT 0,
    is_active     BOOLEAN                DEFAULT TRUE,
    expires_at    TIMESTAMP,
    created_at    TIMESTAMP              DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_traffic_geom   ON traffic_reports(geom);
CREATE INDEX idx_traffic_active ON traffic_reports(is_active, expires_at);

-- Route Segments
CREATE TABLE route_segments (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    osm_id        BIGINT,
    source        BIGINT,
    target        BIGINT,
    cost          DOUBLE,
    reverse_cost  DOUBLE,
    road_name     VARCHAR(255),
    road_type     VARCHAR(50),
    is_paved      BOOLEAN                DEFAULT FALSE,
    max_speed_kmh INT                    DEFAULT 50,
    geom          GEOMETRY               NOT NULL
);

CREATE INDEX idx_segments_geom   ON route_segments(geom);

-- Users
CREATE TABLE app_users (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(100)  NOT NULL UNIQUE,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          VARCHAR(20)   DEFAULT 'USER',
    is_active     BOOLEAN       DEFAULT TRUE,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

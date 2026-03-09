-- ============================================================
-- INTELIJGPS — PostGIS Database Schema
-- Guinea Ecuatorial Navigation System
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgrouting;

-- ============================================================
-- 1. LANDMARKS (Hitos Culturales)
-- ============================================================
-- Core table for cultural reference points used in
-- landmark-based navigation (e.g., "Detrás del Estadio de Malabo")

CREATE TABLE landmarks (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,               -- "Estadio de Malabo"
    alias           VARCHAR(255)[],                      -- {"Estadio Nuevo", "New Stadium"}
    description     TEXT,

    -- Classification
    category        VARCHAR(50) NOT NULL,                -- 'edificio', 'surtidor', 'mercado', 'iglesia', 'hospital'
    sub_category    VARCHAR(50),                         -- 'gasolinera_total', 'supermercado'

    -- Location context
    city            VARCHAR(100) NOT NULL,               -- 'Malabo', 'Bata', 'Ebebiyín'
    district        VARCHAR(100),                        -- 'Ela Nguema', 'Caracolas'
    region          VARCHAR(20) NOT NULL                 -- 'INSULAR' or 'CONTINENTAL'
        CHECK (region IN ('INSULAR', 'CONTINENTAL')),

    -- Geospatial (WGS84)
    geom            GEOMETRY(Point, 4326) NOT NULL,
    altitude_m      DECIMAL(7,2),

    -- Cultural navigation metadata
    nav_phrase_es   VARCHAR(500),                        -- "Detrás del Estadio de Malabo"
    nav_phrase_fr   VARCHAR(500),                        -- French alternative
    relative_position VARCHAR(50),                       -- 'detrás', 'frente', 'cerca', 'al lado'
    reference_to    BIGINT REFERENCES landmarks(id)      -- parent landmark for relative nav
        ON DELETE SET NULL,

    -- Administrative
    verified        BOOLEAN DEFAULT FALSE,
    source          VARCHAR(100),                        -- 'field_survey', 'osm_import', 'community'
    photo_url       VARCHAR(500),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for proximity queries (ST_DWithin, ST_Distance)
CREATE INDEX idx_landmarks_geom ON landmarks USING GIST (geom);

-- Trigram index for fuzzy name search ("estadio malabo" matches "Estadio de Malabo")
CREATE INDEX idx_landmarks_name_trgm ON landmarks USING GIN (name gin_trgm_ops);

-- Composite index for filtered searches
CREATE INDEX idx_landmarks_city_cat ON landmarks (city, category);
CREATE INDEX idx_landmarks_region ON landmarks (region);
CREATE INDEX idx_landmarks_verified ON landmarks (verified) WHERE verified = TRUE;


-- ============================================================
-- 2. TRAFFIC REPORTS (Reportes de Tráfico — Nzalang-Sync)
-- ============================================================
-- Real-time community-reported traffic events:
-- road cuts, floods, checkpoints, heavy traffic, toll status

CREATE TABLE traffic_reports (
    id              BIGSERIAL PRIMARY KEY,

    -- Event classification
    report_type     VARCHAR(50) NOT NULL
        CHECK (report_type IN (
            'ROAD_CUT',            -- Carretera cortada
            'HEAVY_TRAFFIC',       -- Tráfico denso
            'TOLL_STATUS',         -- Estado del peaje
            'FLOOD',               -- Inundación
            'ACCIDENT',            -- Accidente
            'POLICE_CHECKPOINT',   -- Control policial
            'ROAD_WORK'            -- Obras en la vía
        )),
    severity        SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,

    -- Geospatial: can be a Point (incident) or LineString (road segment)
    geom            GEOMETRY(Geometry, 4326) NOT NULL,
    road_name       VARCHAR(200),
    city            VARCHAR(100),
    region          VARCHAR(20)
        CHECK (region IN ('INSULAR', 'CONTINENTAL')),

    -- Temporal validity
    reported_at     TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,                         -- auto-expire stale reports
    is_active       BOOLEAN DEFAULT TRUE,

    -- Community validation
    reported_by     BIGINT,                              -- FK to users table
    upvotes         INTEGER DEFAULT 0,
    downvotes       INTEGER DEFAULT 0,
    confidence      DECIMAL(3,2) GENERATED ALWAYS AS (
        CASE WHEN (upvotes + downvotes) = 0 THEN 0.50
             ELSE upvotes::DECIMAL / (upvotes + downvotes)
        END
    ) STORED,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for nearby report queries
CREATE INDEX idx_traffic_geom ON traffic_reports USING GIST (geom);

-- Active reports ordered by recency
CREATE INDEX idx_traffic_active ON traffic_reports (is_active, reported_at DESC);

-- Type filter on active reports only
CREATE INDEX idx_traffic_type ON traffic_reports (report_type) WHERE is_active = TRUE;

-- Auto-expire job helper index
CREATE INDEX idx_traffic_expires ON traffic_reports (expires_at) WHERE is_active = TRUE AND expires_at IS NOT NULL;


-- ============================================================
-- 3. OFFLINE TILE PACKAGES
-- ============================================================
-- Pre-packaged vector tile bundles (.mbtiles) for offline nav

CREATE TABLE offline_tile_packages (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,               -- "Malabo Centro Z10-Z16"
    description     TEXT,
    region          VARCHAR(20) NOT NULL
        CHECK (region IN ('INSULAR', 'CONTINENTAL', 'FULL')),
    bbox            GEOMETRY(Polygon, 4326),             -- bounding box coverage
    zoom_min        SMALLINT NOT NULL,
    zoom_max        SMALLINT NOT NULL,
    file_size_mb    DECIMAL(8,2),
    file_url        VARCHAR(500) NOT NULL,               -- S3/MinIO download URL
    version         INTEGER DEFAULT 1,
    checksum_sha256 VARCHAR(64),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 4. USERS
-- ============================================================
-- Minimal user table for auth and contribution tracking

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(100) UNIQUE,
    email           VARCHAR(255) UNIQUE,
    password_hash   VARCHAR(255),                        -- bcrypt
    role            VARCHAR(30) DEFAULT 'USER'
        CHECK (role IN ('ANONYMOUS', 'USER', 'CONTRIBUTOR', 'MODERATOR', 'ADMIN')),
    nzalang_points  INTEGER DEFAULT 0,                   -- gamification score
    preferred_lang  VARCHAR(10) DEFAULT 'es-GQ',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

-- Add FK constraint to traffic_reports
ALTER TABLE traffic_reports
    ADD CONSTRAINT fk_traffic_reported_by
    FOREIGN KEY (reported_by) REFERENCES users(id)
    ON DELETE SET NULL;


-- ============================================================
-- 5. LANDMARK SUBMISSIONS (Community Queue)
-- ============================================================
-- User-submitted landmarks awaiting moderator approval

CREATE TABLE landmark_submissions (
    id              BIGSERIAL PRIMARY KEY,
    submitted_by    BIGINT NOT NULL REFERENCES users(id),
    name            VARCHAR(255) NOT NULL,
    alias           VARCHAR(255)[],
    category        VARCHAR(50) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    district        VARCHAR(100),
    region          VARCHAR(20) NOT NULL
        CHECK (region IN ('INSULAR', 'CONTINENTAL')),
    geom            GEOMETRY(Point, 4326) NOT NULL,
    nav_phrase_es   VARCHAR(500),
    photo_url       VARCHAR(500),
    status          VARCHAR(20) DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by     BIGINT REFERENCES users(id),
    review_notes    TEXT,
    submitted_at    TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at     TIMESTAMPTZ
);

CREATE INDEX idx_submissions_status ON landmark_submissions (status);
CREATE INDEX idx_submissions_geom ON landmark_submissions USING GIST (geom);


-- ============================================================
-- 6. HELPFUL VIEWS
-- ============================================================

-- Active traffic reports with location info
CREATE OR REPLACE VIEW v_active_traffic AS
SELECT
    tr.id,
    tr.report_type,
    tr.severity,
    tr.title,
    tr.description,
    tr.road_name,
    tr.city,
    tr.region,
    tr.confidence,
    tr.reported_at,
    tr.expires_at,
    ST_AsGeoJSON(tr.geom)::jsonb AS geojson
FROM traffic_reports tr
WHERE tr.is_active = TRUE
  AND (tr.expires_at IS NULL OR tr.expires_at > NOW())
ORDER BY tr.severity DESC, tr.reported_at DESC;

-- Verified landmarks with coordinates
CREATE OR REPLACE VIEW v_verified_landmarks AS
SELECT
    l.id,
    l.name,
    l.alias,
    l.category,
    l.city,
    l.district,
    l.region,
    l.nav_phrase_es,
    ST_Y(l.geom) AS latitude,
    ST_X(l.geom) AS longitude,
    ST_AsGeoJSON(l.geom)::jsonb AS geojson
FROM landmarks l
WHERE l.verified = TRUE
ORDER BY l.city, l.name;


-- ============================================================
-- 7. USEFUL FUNCTIONS
-- ============================================================

-- Find N nearest landmarks to a GPS position within radius (meters)
CREATE OR REPLACE FUNCTION fn_nearby_landmarks(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION,
    p_radius_m INTEGER DEFAULT 500,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    landmark_id BIGINT,
    name VARCHAR,
    category VARCHAR,
    nav_phrase_es VARCHAR,
    distance_m DOUBLE PRECISION,
    bearing_deg DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION
)
LANGUAGE SQL STABLE AS $$
    SELECT
        l.id,
        l.name,
        l.category,
        l.nav_phrase_es,
        ST_Distance(
            l.geom::geography,
            ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
        ) AS distance_m,
        degrees(ST_Azimuth(
            ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
            l.geom::geography
        )) AS bearing_deg,
        ST_Y(l.geom) AS latitude,
        ST_X(l.geom) AS longitude
    FROM landmarks l
    WHERE l.verified = TRUE
      AND ST_DWithin(
            l.geom::geography,
            ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
            p_radius_m
          )
    ORDER BY distance_m ASC
    LIMIT p_limit;
$$;

-- Find active traffic reports near a position
CREATE OR REPLACE FUNCTION fn_nearby_traffic(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION,
    p_radius_m INTEGER DEFAULT 1000
)
RETURNS TABLE (
    report_id BIGINT,
    report_type VARCHAR,
    severity SMALLINT,
    title VARCHAR,
    confidence DECIMAL,
    distance_m DOUBLE PRECISION
)
LANGUAGE SQL STABLE AS $$
    SELECT
        tr.id,
        tr.report_type,
        tr.severity,
        tr.title,
        tr.confidence,
        ST_Distance(
            tr.geom::geography,
            ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
        ) AS distance_m
    FROM traffic_reports tr
    WHERE tr.is_active = TRUE
      AND (tr.expires_at IS NULL OR tr.expires_at > NOW())
      AND ST_DWithin(
            tr.geom::geography,
            ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
            p_radius_m
          )
    ORDER BY tr.severity DESC, distance_m ASC;
$$;


-- ============================================================
-- 8. SEED DATA — Sample Landmarks (Malabo & Bata)
-- ============================================================

INSERT INTO landmarks (name, alias, category, city, district, region, geom, nav_phrase_es, verified, source) VALUES
-- Malabo (Bioko Island)
('Estadio de Malabo', '{"Estadio Nuevo de Malabo", "New Malabo Stadium"}', 'edificio', 'Malabo', 'Malabo II', 'INSULAR',
    ST_SetSRID(ST_MakePoint(8.7741, 3.7523), 4326),
    'Cerca del Estadio de Malabo', TRUE, 'field_survey'),

('Catedral de Santa Isabel', '{"Catedral de Malabo"}', 'iglesia', 'Malabo', 'Centro', 'INSULAR',
    ST_SetSRID(ST_MakePoint(8.7832, 3.7504), 4326),
    'Frente a la Catedral de Santa Isabel', TRUE, 'osm_import'),

('Mercado Central de Malabo', '{"Mercado de Malabo"}', 'mercado', 'Malabo', 'Centro', 'INSULAR',
    ST_SetSRID(ST_MakePoint(8.7845, 3.7510), 4326),
    'Al lado del Mercado Central', TRUE, 'field_survey'),

('Hotel Sofitel Sipopo', '{"Sipopo"}', 'hotel', 'Malabo', 'Sipopo', 'INSULAR',
    ST_SetSRID(ST_MakePoint(8.7290, 3.7870), 4326),
    'Cerca del Hotel Sofitel en Sipopo', TRUE, 'osm_import'),

('Aeropuerto de Malabo', '{"Aeropuerto SSG", "Santa Isabel Airport"}', 'aeropuerto', 'Malabo', 'Centro', 'INSULAR',
    ST_SetSRID(ST_MakePoint(8.7087, 3.7553), 4326),
    'Dirección al Aeropuerto de Malabo', TRUE, 'osm_import'),

('Edificio Abayak', '{"Abayak"}', 'edificio', 'Malabo', 'Centro', 'INSULAR',
    ST_SetSRID(ST_MakePoint(8.7821, 3.7501), 4326),
    'Detrás del edificio Abayak', TRUE, 'field_survey'),

-- Bata (Continental Region)
('Puerto de Bata', '{"Puerto Marítimo de Bata"}', 'puerto', 'Bata', 'Centro', 'CONTINENTAL',
    ST_SetSRID(ST_MakePoint(9.7653, 1.8634), 4326),
    'Cerca del Puerto de Bata', TRUE, 'osm_import'),

('Surtidor Total Ela Nguema', '{"Total Bata", "Gasolinera Total"}', 'surtidor', 'Bata', 'Ela Nguema', 'CONTINENTAL',
    ST_SetSRID(ST_MakePoint(9.7660, 1.8640), 4326),
    'Frente al surtidor de Total de Ela Nguema', TRUE, 'field_survey'),

('Hospital Regional de Bata', '{"Hospital de Bata"}', 'hospital', 'Bata', 'Centro', 'CONTINENTAL',
    ST_SetSRID(ST_MakePoint(9.7645, 1.8600), 4326),
    'Al lado del Hospital Regional de Bata', TRUE, 'osm_import'),

('Mercado Central de Bata', '{"Mercado de Bata", "Mondoasi"}', 'mercado', 'Bata', 'Centro', 'CONTINENTAL',
    ST_SetSRID(ST_MakePoint(9.7670, 1.8620), 4326),
    'Cerca del Mercado Central de Bata', TRUE, 'field_survey'),

('Universidad Nacional de Guinea Ecuatorial', '{"UNGE Bata"}', 'educacion', 'Bata', 'Centro', 'CONTINENTAL',
    ST_SetSRID(ST_MakePoint(9.7700, 1.8580), 4326),
    'Frente a la UNGE de Bata', TRUE, 'osm_import');

-- Done! Run: SELECT * FROM fn_nearby_landmarks(3.7504, 8.7832, 500, 5);

-- ============================================================
--  INTELIJGPS — V2: Seed H2 Data
--  Hitos Reales de Malabo y Bata, Guinea Ecuatorial
-- ============================================================

-- ─── MALABO (Isla de Bioko Norte) ────────────────────────────────────────
INSERT INTO cultural_landmarks (name, alias, category, city, region, geom, address_hint, importance, is_verified, source) VALUES
('Gasolinera Total Ela Nguema',        ARRAY['surtidor total', 'total ela nguema'],          'gasolinera',  'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7720, 3.7490), 4326), 'Barrio Ela Nguema, Carretera Principal', 9, TRUE, 'official'),
('Gasolinera Gepetrol Centro',         ARRAY['gepetrol', 'surtidor gepetrol centro'],        'gasolinera',  'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7833, 3.7500), 4326), 'Avenida de la Independencia', 9, TRUE, 'official'),
('Gasolinera Total Aeropuerto',        ARRAY['total aeropuerto', 'surtidor aeropuerto'],     'gasolinera',  'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7087, 3.7553), 4326), 'Carretera del Aeropuerto', 8, TRUE, 'official'),
('Estadio de Malabo',                  ARRAY['el estadio', 'estadio principal', 'malabo stadium'], 'estadio', 'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7900, 3.7550), 4326), 'Carretera de Luba', 10, TRUE, 'osm'),
('Complejo Deportivo Malabo 2011',     ARRAY['malabo 2011', 'estadio malabo 2011'],         'estadio',     'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7950, 3.7600), 4326), 'Zona Turística Nueva Malabo', 9, TRUE, 'osm'),
('Hospital Regional de Malabo',        ARRAY['el hospital', 'hospital general', 'hospital malabo'], 'hospital', 'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7860, 3.7520), 4326), 'Barrio Ela Nguema', 10, TRUE, 'official'),
('Clínica Santa Isabel',               ARRAY['clinica santa isabel', 'clinica catedral'],   'hospital',    'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7845, 3.7510), 4326), 'Calle de la Catedral', 8, TRUE, 'official'),
('Palacio Presidencial de Malabo',     ARRAY['el palacio', 'presidencia'],                  'gobierno',    'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7833, 3.7500), 4326), 'Paseo de los Cocoteros', 10, TRUE, 'official'),
('Ministerio de Obras Públicas',       ARRAY['obras publicas', 'mop'],                      'gobierno',    'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7810, 3.7490), 4326), 'Avenida Hassan II', 8, TRUE, 'official'),
('Edificio Abayak',                    ARRAY['abayak', 'torre abayak'],                     'gobierno',    'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7855, 3.7505), 4326), 'Centro de Malabo', 9, TRUE, 'official'),
('Asamblea Nacional de Guinea Ecuatorial', ARRAY['asamblea', 'parlamento'],                 'gobierno',    'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7830, 3.7495), 4326), 'Paseo de los Cocoteros', 10, TRUE, 'official'),
('BGFI Bank Malabo',                   ARRAY['bgfi', 'banco bgfi'],                         'banco',       'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7840, 3.7502), 4326), 'Avenida de la Independencia', 8, TRUE, 'official'),
('CCEI Bank GE',                       ARRAY['ccei', 'banco ccei'],                         'banco',       'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7825, 3.7498), 4326), 'Centro de Malabo', 7, TRUE, 'official'),
('Hotel Bahía',                        ARRAY['hotel bahia', 'el bahia'],                    'hotel',       'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7870, 3.7488), 4326), 'Paseo Marítimo', 9, TRUE, 'official'),
('Hotel Impala',                       ARRAY['hotel impala', 'impala'],                     'hotel',       'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7858, 3.7495), 4326), 'Calle del Rey Boncoro', 8, TRUE, 'official'),
('Universidad Nacional de Guinea Ecuatorial', ARRAY['unge', 'la universidad', 'universidad'],    'educacion', 'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7750, 3.7470), 4326), 'Carretera Luba Km 5', 10, TRUE, 'official'),
('Instituto Nacional de Enseñanza Media', ARRAY['inem', 'el instituto'],                    'educacion',   'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7810, 3.7505), 4326), 'Barrio Ela Nguema', 8, TRUE, 'official'),
('Catedral de Santa Isabel',           ARRAY['la catedral', 'catedral malabo'],             'iglesia',     'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7838, 3.7502), 4326), 'Plaza de la Independencia', 10, TRUE, 'osm'),
('Mercado Central de Malabo',          ARRAY['el mercado', 'mercado central'],              'mercado',     'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7843, 3.7508), 4326), 'Barrio Centro', 9, TRUE, 'osm'),
('Aeropuerto Internacional de Malabo', ARRAY['el aeropuerto', 'aeropuerto malabo', 'santa isabel airport'], 'aeropuerto', 'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7087, 3.7553), 4326), 'Carretera del Aeropuerto', 10, TRUE, 'osm'),
('Puerto de Malabo',                   ARRAY['el puerto', 'puerto'],                        'puerto',      'Malabo', 'Bioko Norte', ST_SetSRID(ST_MakePoint(8.7880, 3.7475), 4326), 'Zona Portuaria', 10, TRUE, 'osm');

-- ─── BATA (Región Continental) ─────────────────────────────────
INSERT INTO cultural_landmarks (name, alias, category, city, region, geom, address_hint, importance, is_verified, source) VALUES
('Gasolinera Total Bata Centro',       ARRAY['total bata', 'surtidor bata'],                'gasolinera',  'Bata', 'Litoral', ST_SetSRID(ST_MakePoint(9.7678, 1.8635), 4326), 'Avenida de la Independencia, Bata', 9, TRUE, 'official'),
('Gasolinera Gepetrol Bata',           ARRAY['gepetrol bata'],                              'gasolinera',  'Bata', 'Litoral', ST_SetSRID(ST_MakePoint(9.7710, 1.8620), 4326), 'Carretera Nacional, Bata', 8, TRUE, 'official'),
('Estadio de Bata',                    ARRAY['estadio bata', 'el estadio de bata'],         'estadio',     'Bata', 'Litoral', ST_SetSRID(ST_MakePoint(9.7750, 1.8600), 4326), 'Zona Estadio, Bata', 10, TRUE, 'osm'),
('Hospital Regional de Bata',          ARRAY['hospital bata', 'el hospital bata'],          'hospital',    'Bata', 'Litoral', ST_SetSRID(ST_MakePoint(9.7680, 1.8650), 4326), 'Barrio Comandachina, Bata', 10, TRUE, 'official'),
('Gobernación del Litoral',            ARRAY['gobernacion', 'gobernacion bata'],            'gobierno',    'Bata', 'Litoral', ST_SetSRID(ST_MakePoint(9.7665, 1.8640), 4326), 'Centro de Bata', 9, TRUE, 'official'),
('Mercado Central de Bata',            ARRAY['mercado bata', 'mercado central bata'],       'mercado',     'Bata', 'Litoral', ST_SetSRID(ST_MakePoint(9.7670, 1.8630), 4326), 'Barrio Centro, Bata', 9, TRUE, 'osm'),
('Puerto de Bata',                     ARRAY['puerto bata', 'muelle bata'],                 'puerto',      'Bata', 'Litoral', ST_SetSRID(ST_MakePoint(9.7640, 1.8610), 4326), 'Zona Portuaria, Bata', 10, TRUE, 'osm'),
('Aeropuerto de Bata',                 ARRAY['aeropuerto bata'],                            'aeropuerto',  'Bata', 'Litoral', ST_SetSRID(ST_MakePoint(9.7756, 1.9048), 4326), 'Carretera del Aeropuerto, Bata', 10, TRUE, 'osm'),
('Universidad de Bata (UNIGE)',        ARRAY['unige', 'universidad bata'],                  'educacion',   'Bata', 'Litoral', ST_SetSRID(ST_MakePoint(9.7700, 1.8660), 4326), 'Campus Universitario, Bata', 9, TRUE, 'official'),
('Hotel Sofía',                        ARRAY['hotel sofia', 'sofia bata'],                  'hotel',       'Bata', 'Litoral', ST_SetSRID(ST_MakePoint(9.7672, 1.8625), 4326), 'Paseo Marítimo, Bata', 8, TRUE, 'official'),
('Plaza del Reloj',                    ARRAY['el reloj', 'plaza reloj'],                    'gobierno',    'Bata', 'Litoral', ST_SetSRID(ST_MakePoint(9.7658, 1.8632), 4326), 'Centro de Bata', 10, TRUE, 'field_survey'),
('Palacio de Congresos de Bata',        ARRAY['palacio congresos', 'congresos bata'],        'edificio',    'Bata', 'Litoral', ST_SetSRID(ST_MakePoint(9.7780, 1.8550), 4326), 'Zona Ngolo, Bata', 9, TRUE, 'osm'),
('Mercado Central de Bata 2',          ARRAY['mercado central', 'mundoasi'],                 'mercado',     'Bata', 'Litoral', ST_SetSRID(ST_MakePoint(9.7670, 1.8630), 4326), 'Barrio Centro, Bata', 10, TRUE, 'field_survey');

-- ─── Sample Traffic Reports ───────────────────────────────────────────────
INSERT INTO traffic_reports (report_type, severity, geom, affected_road, description, confirmed_by, is_active, expires_at) VALUES
('trafico_pesado', 2, ST_SetSRID(ST_MakePoint(8.7880, 3.7475), 4326), 'Zona Puerto Malabo', 'Tráfico pesado por carga de contenedores', 5, TRUE, CURRENT_TIMESTAMP + INTERVAL '4' HOUR),
('corte_lluvia',   3, ST_SetSRID(ST_MakePoint(9.7640, 1.8610), 4326), 'Carretera Bata-Mbini', 'Corte total por lluvias fuertes. Use ruta alternativa.', 12, TRUE, CURRENT_TIMESTAMP + INTERVAL '2' HOUR);

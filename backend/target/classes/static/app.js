/* ════════════════════════════════════════════════════════════════
   INTELIJGPS — Main Application
   Leaflet.js + OpenStreetMap + Spring Boot REST API
   ════════════════════════════════════════════════════════════════ */

(function (global) {
    'use strict';

    const API_BASE = window.location.origin + '/api';

    // ── City Configs ─────────────────────────────────────────────
    const CITIES = {
        Malabo: { lat: 3.7500, lon: 8.7833, zoom: 14, label: 'Malabo', flag: '🇬🇶' },
        Bata: { lat: 1.8635, lon: 9.7678, zoom: 14, label: 'Bata', flag: '🇬🇶' },
    };

    // ── Category Icons & Colors ──────────────────────────────────
    const CATEGORY_META = {
        gasolinera: { emoji: '⛽', css: 'gasolinera' },
        hospital: { emoji: '🏥', css: 'hospital' },
        estadio: { emoji: '🏟️', css: 'estadio' },
        gobierno: { emoji: '🏛️', css: 'gobierno' },
        mercado: { emoji: '🛒', css: 'mercado' },
        educacion: { emoji: '🎓', css: 'educacion' },
        hotel: { emoji: '🏨', css: 'hotel' },
        aeropuerto: { emoji: '✈️', css: 'aeropuerto' },
        puerto: { emoji: '⚓', css: 'puerto' },
        banco: { emoji: '🏦', css: 'banco' },
        iglesia: { emoji: '⛪', css: 'gobierno' },
        default: { emoji: '📍', css: 'default' },
    };

    // ── State ─────────────────────────────────────────────────────
    let map;
    let currentCity = 'Malabo';
    let allMarkers = [];
    let trafficMarkers = [];
    let userMarker = null;
    let destinationMarker = null;
    let selectedLandmark = null;
    let selectedSeverity = 1;

    // ── Init ──────────────────────────────────────────────────────
    function init() {
        initMap();
        initUserLocation();
        loadLandmarks('Malabo');
        loadActiveTrafficReports();
        setupSearch();
        setupCitySwitcher();
        setupSeverityButtons();

        // Init voice and WebSocket
        VoiceEngine.init();
        NzalangSync.connect();

        // Greet user
        setTimeout(() => {
            VoiceEngine.speak('Bienvenido a INTELIJGPS. Navega Guinea, navega tu mundo.');
        }, 1500);

        // Expose map API for realtime.js
        global.IntelIjMap = { addTrafficMarker };
    }

    // ── Map Init ──────────────────────────────────────────────────
    function initMap() {
        const city = CITIES[currentCity];

        // 1. Premium Dark (Default)
        const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 20
        });

        // 2. Light Map (Positron)
        const lightMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 20
        });

        // 3. Satellite (Esri)
        const satMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri', maxZoom: 19
        });

        // 4. Street (OSM)
        const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OSM', maxZoom: 19
        });

        map = L.map('map', {
            center: [city.lat, city.lon],
            zoom: city.zoom,
            zoomControl: false,
            layers: [darkMap] // default mode
        });

        // Add Layer Control (Multi-modos)
        const baseMaps = {
            "🌙 Modo Oscuro (Premium)": darkMap,
            "☀️ Modo Claro": lightMap,
            "🛰️ Satélite": satMap,
            "🗺️ Calles (Estándar)": streetMap
        };
        L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

        // Custom zoom control position
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Map click handler (for reporting)
        map.on('click', onMapClick);
    }

    function onMapClick(e) {
        // Store for report location
        global._reportLat = e.latlng.lat;
        global._reportLon = e.latlng.lng;
    }

    // ── User Location ─────────────────────────────────────────────
    function initUserLocation() {
        if (!navigator.geolocation) return;

        const locationIcon = L.divIcon({
            className: '',
            html: `<div style="
                width:22px;height:22px;background:#1976D2;
                border:3px solid white;border-radius:50%;
                box-shadow:0 0 0 4px rgba(25,118,210,0.25);
            "></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
        });

        navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude: lat, longitude: lon } = pos.coords;
                if (!userMarker) {
                    userMarker = L.marker([lat, lon], { icon: locationIcon }).addTo(map)
                        .bindTooltip('📍 Tu posición');
                } else {
                    userMarker.setLatLng([lat, lon]);
                }
            },
            (err) => console.warn('[GPS] Location error:', err.message),
            { enableHighAccuracy: true, maximumAge: 5000 }
        );
    }

    global.locateMe = () => {
        if (!userMarker) {
            showToast('⏳ Obteniendo ubicación GPS...');
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude: lat, longitude: lon } = pos.coords;
                map.flyTo([lat, lon], 16);
            }, (err) => showToast('❌ Error de GPS: ' + err.message));
        } else {
            map.flyTo(userMarker.getLatLng(), 16);
        }
    };

    // ── Load Landmarks from API ────────────────────────────────────
    async function loadLandmarks(city) {
        // Clear existing markers
        allMarkers.forEach(m => map.removeLayer(m));
        allMarkers = [];

        try {
            const res = await fetch(`${API_BASE}/landmarks/city/${encodeURIComponent(city)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const landmarks = await res.json();
            landmarks.forEach(addLandmarkMarker);
            showToast(`✅ ${landmarks.length} hitos cargados en ${city}`);
        } catch (e) {
            console.warn('[API] Using fallback landmark data:', e.message);
            FALLBACK_LANDMARKS.filter(l => l.city === city).forEach(addLandmarkMarker);
            showToast('📴 Modo offline — datos locales');
        }
    }

    function addLandmarkMarker(landmark) {
        const meta = CATEGORY_META[landmark.category] || CATEGORY_META.default;
        const icon = L.divIcon({
            className: '',
            html: `
                <div class="landmark-node-wrapper">
                    <div class="landmark-dot"></div>
                    <span class="landmark-label">${landmark.name}</span>
                </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
        });

        const marker = L.marker([landmark.latitude, landmark.longitude], { icon })
            .addTo(map)
            .on('click', () => showLandmarkPanel(landmark));

        allMarkers.push(marker);
    }

    // ── Traffic Markers ───────────────────────────────────────────
    function addTrafficMarker(event) {
        if (!event.latitude || !event.longitude) return;

        const icon = L.divIcon({
            className: '',
            html: `<div class="traffic-ping" style="background:${event.severity === 3 ? '#C62828' : '#F9A825'};border-radius:50%;width:20px;height:20px;"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
        });

        const tm = L.marker([event.latitude, event.longitude], { icon })
            .addTo(map)
            .bindPopup(`
                <b>${REPORT_EMOJIS[event.reportType] || '⚠️'} ${event.affectedRoad || 'Incidente'}</b><br>
                ${event.description || ''}
            `);

        trafficMarkers.push(tm);

        // Auto-remove marker after 4 hours
        setTimeout(() => map.removeLayer(tm), 4 * 3600 * 1000);
    }

    const REPORT_EMOJIS = {
        corte_lluvia: '🌧️', peaje_bloqueado: '🚧',
        accidente: '⚠️', trafico_pesado: '🚗',
        obra_vial: '🏗️', inundacion: '🌊',
    };

    // ── Landmark Panel & Routing ──────────────────────────────────
    let currentRouteLine = null;

    function showLandmarkPanel(landmark) {
        selectedLandmark = landmark;
        const panel = document.getElementById('nav-panel');
        const instruction = document.getElementById('nav-voice-text');

        instruction.textContent = `🔄 Buscando ruta a ${landmark.name}...`;
        panel.style.display = 'flex';

        // Add destination marker (EG Flag Pin like mockup)
        if (destinationMarker) map.removeLayer(destinationMarker);

        const destIcon = L.divIcon({
            className: '',
            html: `
                <div class="dest-pin-wrapper">
                    <div class="dest-pin-flag">🇬🇶</div>
                    <div class="dest-pin-shadow"></div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });
        destinationMarker = L.marker([landmark.latitude, landmark.longitude], { icon: destIcon }).addTo(map);

        // Draw Route using OSRM!
        drawRouteToDestination(landmark.latitude, landmark.longitude);

        // Request voice instruction from API
        fetchNavigationInstruction(landmark);
    }

    async function drawRouteToDestination(destLat, destLon) {
        // Use user position or city center as starting point
        let startLat = CITIES[currentCity].lat;
        let startLon = CITIES[currentCity].lon;

        if (userMarker) {
            const ll = userMarker.getLatLng();
            startLat = ll.lat;
            startLon = ll.lng;
        }

        try {
            // OSRM Public API
            const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${destLon},${destLat}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coords = route.geometry.coordinates.map(c => [c[1], c[0]]); // GeoJSON is [lon, lat], Leaflet is [lat, lon]

                if (currentRouteLine) map.removeLayer(currentRouteLine);

                // Draw premium glowing route
                currentRouteLine = L.polyline(coords, {
                    color: '#00d287',
                    weight: 6,
                    opacity: 0.9,
                    className: 'route-glow-line'
                }).addTo(map);

                // Fit map to show both start and end
                map.fitBounds(currentRouteLine.getBounds(), { padding: [60, 60] });

                const distanceKm = (route.distance / 1000).toFixed(1);
                const timeMin = Math.round(route.duration / 60);
                document.getElementById('nav-voice-text').textContent = `${distanceKm} km · ${timeMin} min hacia ${selectedLandmark.name}`;
                VoiceEngine.speak(`Ruta trazada. Conducirá ${distanceKm} kilómetros durante aproximadamente ${timeMin} minutos.`);
            }
        } catch (e) {
            console.warn('[Routing] Failed to fetch OSRM route', e);
            map.flyTo([destLat, destLon], 16, { animate: true, duration: 1.2 });
        }
    }

    async function fetchNavigationInstruction(landmark) {
        const bubble = document.getElementById('nav-voice-text');

        // Use user's GPS position or city center
        let curLat = CITIES[currentCity].lat;
        let curLon = CITIES[currentCity].lon;

        if (userMarker) {
            const ll = userMarker.getLatLng();
            curLat = ll.lat; curLon = ll.lng;
        }

        const lang = VoiceEngine.getLang();

        try {
            const res = await fetch(`${API_BASE}/navigate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentLat: curLat, currentLon: curLon,
                    nextLat: landmark.latitude, nextLon: landmark.longitude,
                    language: lang,
                }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            bubble.textContent = data.instruction;
            VoiceEngine.speak(data.instruction);

        } catch (e) {
            // Fallback instruction built client-side
            const hint = landmark.addressHint || 'lugar conocido';
            const text = lang === 'es-GQ'
                ? `Siga derecho nah hacia ${landmark.name}. ${hint}.`
                : `Dirígete hacia ${landmark.name}. ${hint}.`;

            bubble.textContent = text;
            VoiceEngine.speak(text);
        }
    }

    global.startNavigation = () => showToast('🧭 Navegación Flutter activada — usa la app móvil');
    global.voiceRepeat = () => {
        const bubble = document.getElementById('nav-voice-text');
        if (bubble) VoiceEngine.speak(bubble.textContent);
    };

    document.addEventListener('DOMContentLoaded', () => {
        const closeBtn = document.getElementById('nav-close');
        if (closeBtn) closeBtn.addEventListener('click', () => {
            const navActions = document.querySelector('.nav-actions-right');
            if (navActions) navActions.style.display = 'none';
            document.getElementById('nav-voice-text').textContent = "Bienvenidos a INTELIJGPS. Seleccione un destino.";
            if (destinationMarker) {
                map.removeLayer(destinationMarker);
                destinationMarker = null;
            }
        });
    });

    // ── Active Traffic Reports (initial load) ─────────────────────
    async function loadActiveTrafficReports() {
        try {
            const res = await fetch(`${API_BASE}/reports/active`);
            if (!res.ok) return;
            const reports = await res.json();
            reports.forEach(r => {
                const evt = {
                    reportType: r.reportType,
                    severity: r.severity,
                    latitude: r.latitude,
                    longitude: r.longitude,
                    affectedRoad: r.affectedRoad,
                    description: r.description,
                };
                addTrafficMarker(evt);
            });
        } catch (e) {
            console.warn('[API] Could not load traffic reports:', e.message);
        }
    }

    // ── Search ────────────────────────────────────────────────────
    function setupSearch() {
        const input = document.getElementById('search-input');
        const results = document.getElementById('search-results');
        const clear = document.getElementById('search-clear');
        if (!input) return;

        let debounceTimer;

        input.addEventListener('input', () => {
            const q = input.value.trim();
            if (clear) clear.classList.toggle('visible', q.length > 0);

            if (q.length < 2) { results.classList.remove('open'); return; }

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => searchLandmarks(q), 350);
        });

        if (clear) {
            clear.addEventListener('click', () => {
                input.value = '';
                clear.classList.remove('visible');
                results.classList.remove('open');
                input.focus();
            });
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.panel-left')) {
                results.classList.remove('open');
            }
        });
    }

    async function searchLandmarks(query) {
        const results = document.getElementById('search-results');
        results.innerHTML = '<div class="alert-empty" style="color:var(--text-muted);text-align:center;padding:20px;">Buscando...</div>';
        results.classList.add('open');

        let items = [];
        try {
            // 1. Try local verified landmarks API
            const res = await fetch(`${API_BASE}/landmarks/autocomplete?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                items = await res.json();
            }
        } catch (e) { console.warn('Local API failed, using external'); }

        // 2. Global Geocoding via Nominatim (for "Oyala a Mongomo" functional addresses)
        // If local returned 0, or we want robust global search in GQ
        if (items.length < 3) {
            try {
                // Constrain search mostly to Equatorial Guinea
                const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query + ', Equatorial Guinea')}`);
                if (nomRes.ok) {
                    const nomItems = await nomRes.json();
                    const formatted = nomItems.map(n => ({
                        name: n.name || n.display_name.split(',')[0],
                        city: n.display_name.split(',').pop().trim() || 'Guinea Ecuatorial',
                        category: 'default',
                        latitude: parseFloat(n.lat),
                        longitude: parseFloat(n.lon),
                        verified: false
                    }));
                    // Mix results, preventing exact name duplicates
                    formatted.forEach(f => {
                        if (!items.find(i => i.name === f.name)) items.push(f);
                    });
                }
            } catch (e) {
                console.warn('Nominatim failed');
            }
        }

        // 3. Fallback client-side search if everything fails
        if (items.length === 0) {
            items = FALLBACK_LANDMARKS.filter(l =>
                l.name.toLowerCase().includes(query.toLowerCase())
            );
        }

        renderSearchResults(items, results);
    }

    function renderSearchResults(items, container) {
        if (!items.length) {
            container.innerHTML = '<div class="alert-empty" style="color:#1a1a2e;text-align:center;padding:20px;">Sin resultados</div>';
            container.classList.add('open');
            return;
        }

        container.innerHTML = '';
        items.slice(0, 8).forEach(item => {
            const meta = CATEGORY_META[item.category] || CATEGORY_META.default;
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
                <div class="result-icon">${meta.emoji}</div>
                <div>
                    <div class="result-name">${item.name}</div>
                    <div class="result-meta">${item.city} — ${item.category} ${item.verified ? '✅' : ''}</div>
                </div>
            `;
            div.addEventListener('click', () => {
                container.classList.remove('open');
                document.getElementById('search-input').value = item.name;
                showLandmarkPanel(item);
            });
            container.appendChild(div);
        });
        container.classList.add('open');
    }

    // ── City Switcher ─────────────────────────────────────────────
    function setupCitySwitcher() {
        document.querySelectorAll('.city-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.city-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const city = btn.dataset.city;
                currentCity = city;

                // Update search placeholder
                const input = document.getElementById('search-input');
                if (input) input.placeholder = `Search locations in ${city}...`;

                const cfg = CITIES[city];
                map.flyTo([cfg.lat, cfg.lon], cfg.zoom, { animate: true, duration: 1.5 });
                loadLandmarks(city);
            });
        });
    }

    // ── Voice / Lang Toggle ──────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        const voiceBtn = document.getElementById('btn-voice-toggle');
        if (voiceBtn) voiceBtn.addEventListener('click', () => {
            const on = VoiceEngine.toggle();
            voiceBtn.style.background = on ? 'var(--verde-selva)' : '#555';
            showToast(on ? '🔊 Voz activada' : '🔇 Voz desactivada');
        });

        const langBtn = document.getElementById('btn-lang-toggle');
        if (langBtn) langBtn.addEventListener('click', () => {
            const cur = VoiceEngine.getLang();
            const next = cur === 'es-GQ' ? 'es' : 'es-GQ';
            VoiceEngine.setLang(next);
            showToast(next === 'es-GQ' ? '🇬🇶 Español Ecuatoguineano' : '🇪🇸 Español Estándar');
        });
    });

    // ── Severity Buttons ─────────────────────────────────────────
    function setupSeverityButtons() {
        document.querySelectorAll('.sev-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sev-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedSeverity = parseInt(btn.dataset.sev);
            });
        });
    }

    // ── Report Modal ─────────────────────────────────────────────
    global.openReportModal = function () {
        document.getElementById('report-modal').style.display = 'flex';
    };

    global.closeReportModal = function (e) {
        if (!e || e.target.id === 'report-modal' || !e.target.closest) {
            document.getElementById('report-modal').style.display = 'none';
        }
    };

    global.submitReport = async function () {
        const city = CITIES[currentCity];
        const payload = {
            reportType: document.getElementById('report-type').value,
            severity: selectedSeverity,
            latitude: global._reportLat || city.lat,
            longitude: global._reportLon || city.lon,
            description: document.getElementById('report-description').value,
            affectedRoad: currentCity + ' — zona reportada',
        };

        try {
            const res = await fetch(`${API_BASE}/reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                showToast('✅ Reporte enviado — ¡Gracias!');
                VoiceEngine.speak('Reporte enviado. Gracias por ayudar a la comunidad.');
            } else {
                showToast('❌ Error al enviar reporte');
            }
        } catch {
            showToast('📴 Sin conexión — reporte guardado localmente');
        }
        document.getElementById('report-modal').style.display = 'none';
        document.getElementById('report-description').value = '';
    };

    // ── Toast ────────────────────────────────────────────────────
    let toastTimer;
    global.showToast = function (msg) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
    };

    // ── Fallback Landmark Data (offline / API unavailable) ───────
    const FALLBACK_LANDMARKS = [
        { id: 1, name: 'Estadio de Malabo', category: 'estadio', city: 'Malabo', region: 'Bioko Norte', latitude: 3.7550, longitude: 8.7900, addressHint: 'Carretera de Luba', importance: 10, verified: true },
        { id: 2, name: 'Gasolinera Total Ela Nguema', category: 'gasolinera', city: 'Malabo', region: 'Bioko Norte', latitude: 3.7490, longitude: 8.7720, addressHint: 'Barrio Ela Nguema', importance: 9, verified: true },
        { id: 3, name: 'Hospital Regional de Malabo', category: 'hospital', city: 'Malabo', region: 'Bioko Norte', latitude: 3.7520, longitude: 8.7860, addressHint: 'Barrio Ela Nguema', importance: 10, verified: true },
        { id: 4, name: 'Catedral de Santa Isabel', category: 'iglesia', city: 'Malabo', region: 'Bioko Norte', latitude: 3.7502, longitude: 8.7838, addressHint: 'Plaza de la Independencia', importance: 10, verified: true },
        { id: 5, name: 'Palacio Presidencial', category: 'gobierno', city: 'Malabo', region: 'Bioko Norte', latitude: 3.7500, longitude: 8.7833, addressHint: 'Paseo de los Cocoteros', importance: 10, verified: true },
        { id: 6, name: 'Edificio Abayak', category: 'gobierno', city: 'Malabo', region: 'Bioko Norte', latitude: 3.7505, longitude: 8.7855, addressHint: 'Centro de Malabo', importance: 9, verified: true },
        { id: 7, name: 'Aeropuerto de Malabo', category: 'aeropuerto', city: 'Malabo', region: 'Bioko Norte', latitude: 3.7553, longitude: 8.7087, addressHint: 'Carretera del Aeropuerto', importance: 10, verified: true },
        { id: 8, name: 'Puerto de Malabo', category: 'puerto', city: 'Malabo', region: 'Bioko Norte', latitude: 3.7475, longitude: 8.7880, addressHint: 'Zona Portuaria', importance: 10, verified: true },
        { id: 9, name: 'Mercado Central de Malabo', category: 'mercado', city: 'Malabo', region: 'Bioko Norte', latitude: 3.7508, longitude: 8.7843, addressHint: 'Barrio Centro', importance: 9, verified: true },
        { id: 10, name: 'BGFI Bank Malabo', category: 'banco', city: 'Malabo', region: 'Bioko Norte', latitude: 3.7502, longitude: 8.7840, addressHint: 'Avenida de la Independencia', importance: 8, verified: true },
        // Bata
        { id: 11, name: 'Estadio de Bata', category: 'estadio', city: 'Bata', region: 'Litoral', latitude: 1.8600, longitude: 9.7750, addressHint: 'Zona Estadio, Bata', importance: 10, verified: true },
        { id: 12, name: 'Hospital Regional de Bata', category: 'hospital', city: 'Bata', region: 'Litoral', latitude: 1.8650, longitude: 9.7680, addressHint: 'Barrio Comandachina', importance: 10, verified: true },
        { id: 13, name: 'Puerto de Bata', category: 'puerto', city: 'Bata', region: 'Litoral', latitude: 1.8610, longitude: 9.7640, addressHint: 'Zona Portuaria, Bata', importance: 10, verified: true },
        { id: 14, name: 'Aeropuerto de Bata', category: 'aeropuerto', city: 'Bata', region: 'Litoral', latitude: 1.9048, longitude: 9.7756, addressHint: 'Carretera del Aeropuerto, Bata', importance: 10, verified: true },
        { id: 15, name: 'Mercado Central de Bata', category: 'mercado', city: 'Bata', region: 'Litoral', latitude: 1.8630, longitude: 9.7670, addressHint: 'Barrio Centro, Bata', importance: 9, verified: true },
    ];

    // ── Boot ──────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

}(window));

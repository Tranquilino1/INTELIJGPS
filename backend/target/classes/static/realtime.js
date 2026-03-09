/* ════════════════════════════════════════════════════════════════
   INTELIJGPS — Nzalang-Sync WebSocket Client
   STOMP over SockJS — subscribes to real-time traffic events
   ════════════════════════════════════════════════════════════════ */

(function (global) {
    'use strict';

    let stompClient = null;
    let reconnectMs = 3000;
    let maxRetries = 10;
    let retryCount = 0;

    /**
     * Connect to Nzalang-Sync WebSocket server.
     * Falls back gracefully if server is unavailable (dev/offline mode).
     */
    function connect() {
        const wsStatusEl = document.getElementById('ws-status');

        try {
            const socket = new SockJS('/ws');
            stompClient = Stomp.over(socket);
            stompClient.debug = null; // Silence STOMP debug logs

            stompClient.connect({}, onConnected, onError);

        } catch (e) {
            console.warn('[Nzalang-Sync] WebSocket unavailable:', e.message);
            setStatus('error');
            scheduleReconnect();
        }

        function onConnected() {
            retryCount = 0;
            setStatus('connected');
            showToast('⚡ Nzalang-Sync conectado');

            // Subscribe to global traffic channel
            stompClient.subscribe('/topic/traffic', function (message) {
                const event = JSON.parse(message.body);
                console.log("[STOMP] Nuevo incidente recibido:", event);

                // Mostrar en mapa si la fución global existe (definida en app.js)
                if (typeof addTrafficMarker === 'function') {
                    addTrafficMarker(event);
                }
            });
        }

        function onError(error) {
            console.warn('[Nzalang-Sync] Connection error:', error);
            setStatus('error');
            scheduleReconnect();
        }
    }

    function scheduleReconnect() {
        if (retryCount >= maxRetries) return;
        retryCount++;
        setTimeout(connect, Math.min(reconnectMs * retryCount, 30000));
    }

    function setStatus(state) {
        const dot = document.getElementById('ws-status');
        if (!dot) return;
        dot.className = 'status-dot ' + state;
        dot.title = {
            connected: '⚡ Nzalang-Sync: Conectado',
            error: '❌ Nzalang-Sync: Desconectado',
            '': '⏳ Nzalang-Sync: Conectando...'
        }[state] || '';
    }

    /**
     * Handle an incoming real-time traffic event.
     * Adds an alert card to the panel and drops a marker on the map.
     */
    function handleTrafficEvent(event) {
        console.info('[Nzalang-Sync] Traffic event:', event);

        // 1. Update alert panel
        addAlertCard(event);

        // 2. Place marker on Leaflet map
        if (window.IntelIjMap && event.latitude && event.longitude) {
            window.IntelIjMap.addTrafficMarker(event);
        }

        // 3. Announce by voice
        if (event.severity >= 2 && window.VoiceEngine) {
            const road = event.affectedRoad || 'zona afectada';
            const type = REPORT_LABELS[event.reportType] || event.reportType;
            VoiceEngine.speak(`Alerta de tráfico: ${type} en ${road}.`);
        }
    }

    const REPORT_LABELS = {
        corte_lluvia: 'corte por lluvia',
        peaje_bloqueado: 'peaje bloqueado',
        trafico_pesado: 'tráfico pesado',
        accidente: 'accidente',
        obra_vial: 'obra vial',
        inundacion: 'inundación',
    };

    const SEVERITY_EMOJI = { 1: '🟡', 2: '🟠', 3: '🔴' };

    function addAlertCard(event) {
        const list = document.getElementById('alert-list');
        if (!list) return;

        // Remove "no incidents" placeholder
        const empty = list.querySelector('.alert-empty');
        if (empty) empty.remove();

        const card = document.createElement('div');
        card.className = `alert-item severity-${event.severity}`;
        card.innerHTML = `
            <div class="alert-emoji">${SEVERITY_EMOJI[event.severity] || '⚠️'}</div>
            <div>
                <div class="alert-road">${REPORT_LABELS[event.reportType] || event.reportType}</div>
                <div class="alert-desc">${event.affectedRoad || ''} — ${event.description || ''}</div>
            </div>
        `;

        // Prepend newest first
        list.insertBefore(card, list.firstChild);

        // Update count badge
        const count = document.getElementById('alert-count');
        if (count) count.textContent = parseInt(count.textContent || 0) + 1;

        // Auto-remove after 10 minutes
        setTimeout(() => {
            card.style.transition = 'all 0.5s';
            card.style.opacity = '0';
            card.style.height = '0';
            setTimeout(() => card.remove(), 500);
        }, 600_000);
    }

    function disconnect() {
        if (stompClient) stompClient.disconnect();
    }

    global.NzalangSync = { connect, disconnect };

}(window));

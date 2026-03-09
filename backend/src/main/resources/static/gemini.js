/* ════════════════════════════════════════════════════════════════
   INTELIJGPS — Grok AI Assistant Module (INTELI)
   Integrates xAI Grok API for conversational navigation assistance
   ════════════════════════════════════════════════════════════════ */

(function (global) {
    'use strict';

    const GROK_API_BASE = 'https://api.x.ai/v1/chat/completions';
    const STORAGE_KEY = 'intelijgps_grok_key';

    let apiKey = null;
    let chatHistory = [];
    let isListening = false;
    let recognition = null;

    const SYSTEM_PROMPT = `Eres INTELI, el asistente de navegación inteligente de INTELIJGPS para Guinea Ecuatorial.
Eres experto en:
- Rutas y calles de Malabo, Bata, Mongomo, Ebebiyín, Evinayong, Oyala, Djibloho, Lubá, Annobon
- Hitos culturales de Guinea Ecuatorial (Grand Hotel Djibloho, AAUCA, Hotel Basilica, Palacio Presidencial, Colegio La Salle, Puerto de Malabo, etc.)
- Hablas con modismos ecuatoguineanos cuando el contexto lo permite
- Siempre das respuestas concisas y útiles para navegación
- Cuando el usuario pide ir de un lugar a otro, respondes con instrucciones claras

Ejemplos de lugares que conoces:
- Grand Hotel Djibloho (Oyala/Djibloho, coords: 1.617, 11.322)
- AAUCA - Universidad de los Africanos (Bata, coords: 1.865, 9.755)
- Hotel Basilica Mongomo (Mongomo, coords: 1.627, 10.993)
- Palacio Presidencial Malabo (coords: 3.755, 8.784)
- Aeropuerto de Malabo Santa Isabel (coords: 3.753, 8.708)
- Aeropuerto de Bata (coords: 1.905, 9.805)
- Playa de Sipopo (Malabo, coords: 3.785, 8.755)

Responde SIEMPRE en español. Máximo 3 frases por respuesta.`;

    // ── Init ────────────────────────────────────────────────────────
    function init() {
        apiKey = localStorage.getItem(STORAGE_KEY);
        if (apiKey) {
            showChatUI();
        }
        initSpeechRecognition();
    }

    function showChatUI() {
        const setup = document.getElementById('ai-setup');
        if (setup) setup.style.display = 'none';
    }

    async function saveGrokKey() {
        const input = document.getElementById('ai-api-key');
        const key = input ? input.value.trim() : '';
        if (!key || !key.startsWith('xai-')) {
            showAIToast('❌ Clave no válida. Debe comenzar con "xai-"');
            return;
        }
        apiKey = key;
        localStorage.setItem(STORAGE_KEY, key);

        // Test connection immediately
        appendAIMessage('assistant', '⏳ Verificando clave con xAI (Grok)...');
        showChatUI();

        try {
            const testPayload = {
                model: "grok-2",
                messages: [
                    { role: "system", content: "You are a test assistant." },
                    { role: "user", content: "Hola" }
                ],
                max_tokens: 10
            };
            const res = await fetch(GROK_API_BASE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify(testPayload)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const msg = err.error?.message || `HTTP ${res.status}`;
                const container = document.getElementById('ai-messages');
                if (container) container.lastChild?.remove(); // remove waiting msg
                appendAIMessage('assistant', `❌ Error de xAI: ${msg}\n\nSolución: Genera una nueva clave en console.x.ai`);
                return;
            }
            // success
            const container = document.getElementById('ai-messages');
            if (container) container.lastChild?.remove();
            appendAIMessage('assistant', '✅ ¡Activado! Soy INTELI (Grok), tu asistente de navegación para Guinea Ecuatorial. ¿A dónde vamos hoy?');
            showAIToast('🤖 Asistente INTELI activado!');
        } catch (e) {
            const container = document.getElementById('ai-messages');
            if (container) container.lastChild?.remove();
            appendAIMessage('assistant', `❌ Sin conexión a Internet: ${e.message}`);
        }
    }

    // ── Chat ────────────────────────────────────────────────────────
    async function sendMessage(userText) {
        if (!userText.trim()) return;

        appendAIMessage('user', userText);
        clearAIInput();

        if (!apiKey) {
            appendAIMessage('assistant', '⚠️ Por favor activa el asistente ingresando tu API Key de Grok arriba.');
            return;
        }

        setAILoading(true);

        try {
            handleNavigationIntent(userText);
            const response = await callGrokAPI(userText);
            appendAIMessage('assistant', response);

            if (global.VoiceEngine && global.VoiceEngine.isEnabled()) {
                global.VoiceEngine.speak(response);
            }
        } catch (err) {
            console.error('[INTELI] API Error:', err);
            appendAIMessage('assistant', `⚠️ ${err.message || 'Error de conexión'}\n\n💡 Genera una nueva clave en console.x.ai y pulsa ⚙️ para actualizarla.`);
        } finally {
            setAILoading(false);
        }
    }

    async function callGrokAPI(userMessage) {
        chatHistory.push({ role: 'user', content: userMessage });

        const payload = {
            model: "grok-2",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...chatHistory
            ],
            temperature: 0.7,
            max_tokens: 256
        };

        const res = await fetch(GROK_API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const msg = err.error?.message || `HTTP ${res.status}`;
            throw new Error(msg);
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || 'No pude generar una respuesta.';
        chatHistory.push({ role: 'assistant', content: text });
        if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
        return text;
    }

    // ── Navigation Intent Detection ─────────────────────────────────
    function handleNavigationIntent(text) {
        const lower = text.toLowerCase();
        const fromMatch = lower.match(/(?:de|desde)\s+([^a]+?)\s+(?:a|hasta|hacia)\s+(.+)/);
        if (fromMatch && global.doSearch) {
            const origin = fromMatch[1].trim();
            const destination = fromMatch[2].trim();
            // Trigger a route search automatically
            setTimeout(() => {
                if (global.routeFromTo) {
                    global.routeFromTo(origin, destination);
                }
            }, 1000);
        }
    }

    // ── DOM Helpers ─────────────────────────────────────────────────
    function appendAIMessage(role, text) {
        const container = document.getElementById('ai-messages');
        if (!container) return;

        const div = document.createElement('div');
        div.className = `ai-msg ${role}`;

        const bubble = document.createElement('div');
        bubble.className = 'ai-msg-bubble';
        bubble.innerHTML = text.replace(/\n/g, '<br>');
        div.appendChild(bubble);
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function clearAIInput() {
        const input = document.getElementById('ai-input');
        if (input) input.value = '';
    }

    function setAILoading(loading) {
        const btn = document.querySelector('.ai-send-btn');
        if (btn) btn.disabled = loading;

        if (loading) {
            const container = document.getElementById('ai-messages');
            if (container) {
                const typing = document.createElement('div');
                typing.className = 'ai-msg assistant ai-typing';
                typing.id = 'ai-typing-indicator';
                typing.innerHTML = '<div class="ai-msg-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>';
                container.appendChild(typing);
                container.scrollTop = container.scrollHeight;
            }
        } else {
            const existing = document.getElementById('ai-typing-indicator');
            if (existing) existing.remove();
        }
    }

    function showAIToast(msg) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    }

    // ── Voice Recognition ───────────────────────────────────────────
    function initSpeechRecognition() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        recognition = new SpeechRec();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            const input = document.getElementById('ai-input');
            if (input) input.value = transcript;
            sendMessage(transcript);
        };

        recognition.onend = () => {
            isListening = false;
            updateVoiceBtnState(false);
        };

        recognition.onerror = (e) => {
            console.warn('[INTELI Voice] Error:', e.error);
            isListening = false;
            updateVoiceBtnState(false);
        };
    }

    function toggleAIVoice() {
        if (!recognition) {
            showAIToast('⚠️ Tu navegador no soporta reconocimiento de voz.');
            return;
        }
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
            isListening = true;
            updateVoiceBtnState(true);
        }
    }

    function updateVoiceBtnState(active) {
        const btn = document.getElementById('ai-voice-btn');
        if (btn) btn.classList.toggle('listening', active);
    }

    // ── Panel Toggle ────────────────────────────────────────────────
    function toggleAIPanel() {
        const panel = document.getElementById('ai-panel');
        if (!panel) return;
        const isOpen = panel.classList.contains('open');
        panel.classList.toggle('open', !isOpen);
        const btn = document.getElementById('btn-ai-toggle');
        if (btn) btn.classList.toggle('active', !isOpen);

        // If opening and no API key saved → show setup by default
        if (!isOpen && !apiKey) {
            const setup = document.getElementById('ai-setup');
            if (setup) setup.style.display = 'block';
        }
    }

    // Toggle API key setup section (gear button)
    global.toggleAISetup = function () {
        const setup = document.getElementById('ai-setup');
        if (!setup) return;
        const visible = setup.style.display !== 'none';
        setup.style.display = visible ? 'none' : 'block';
        if (!visible) {
            // Pre-fill with existing key if any
            const input = document.getElementById('ai-api-key');
            if (input && apiKey) input.value = apiKey;
            input && input.focus();
        }
    };

    // ── Public API ──────────────────────────────────────────────────
    global.saveGrokKey = saveGrokKey;
    global.sendAIMessage = () => {
        const input = document.getElementById('ai-input');
        if (input) sendMessage(input.value);
    };
    global.toggleAI = toggleAIPanel;
    global.toggleAIVoice = toggleAIVoice;
    global.GeminiAssistant = { init, sendMessage, toggleAIPanel, toggleAIVoice };

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

}(window));

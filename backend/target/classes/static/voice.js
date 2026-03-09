/* ════════════════════════════════════════════════════════════════
   INTELIJGPS — Voice Engine
   Web Speech API with Español Ecuatoguineano modismos support
   ════════════════════════════════════════════════════════════════ */

(function(global) {
    'use strict';

    // GQ Modismos replacement map
    const GQ_MODISMOS = {
        'continúe recto':             'siga derecho nah',
        'gire a la derecha':          'torce a la derecha',
        'gire a la izquierda':        'torce a la izquierda',
        'doble ligeramente a la derecha':  'doble a la derecha suavito',
        'doble ligeramente a la izquierda':'doble a la izquierda suavito',
        'dé la vuelta':               'da la vuelta completa hermano',
        'ha llegado a su destino':    'ya llegaste al punto, compañero',
        'preparando ruta':            'aguanta, estoy buscando tu camino',
        'recalculando':               'espera nah, buscando otra ruta',
    };

    let voiceEnabled  = true;
    let currentLang   = 'es-GQ'; // Default: ecuatoguineano
    let synthesis     = window.speechSynthesis;
    let preferredVoice = null;

    /**
     * Initialize voice engine — tries to find a Spanish voice
     */
    function init() {
        if (!synthesis) {
            console.warn('[VoiceEngine] Web Speech API not supported');
            return;
        }
        // Load voices (may be async in some browsers)
        const loadVoices = () => {
            const voices = synthesis.getVoices();
            preferredVoice = voices.find(v => v.lang.startsWith('es') && v.localService)
                          || voices.find(v => v.lang.startsWith('es'))
                          || null;
            if (preferredVoice) {
                console.debug('[VoiceEngine] Using voice:', preferredVoice.name);
            }
        };
        loadVoices();
        synthesis.addEventListener('voiceschanged', loadVoices);
    }

    /**
     * Speak a text string. Applies GQ modismos if currentLang === 'es-GQ'.
     */
    function speak(text) {
        if (!voiceEnabled || !synthesis) return;

        // Cancel any ongoing utterance
        synthesis.cancel();

        let processed = text;
        if (currentLang === 'es-GQ') {
            processed = applyModismos(text);
        }

        const utterance = new SpeechSynthesisUtterance(processed);
        utterance.lang  = 'es-ES';
        utterance.rate  = 0.9;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.onerror = (e) => console.warn('[VoiceEngine] Speech error:', e.error);
        synthesis.speak(utterance);
    }

    /**
     * Apply Español Ecuatoguineano modismos to a text string.
     */
    function applyModismos(text) {
        let result = text;
        for (const [standard, local] of Object.entries(GQ_MODISMOS)) {
            result = result.replace(new RegExp(standard, 'gi'), local);
        }
        return result;
    }

    function toggle()      { voiceEnabled = !voiceEnabled; return voiceEnabled; }
    function setLang(lang) { currentLang = lang; }
    function isEnabled()   { return voiceEnabled; }
    function getLang()     { return currentLang; }

    // Public API
    global.VoiceEngine = { init, speak, toggle, setLang, isEnabled, getLang, applyModismos };

}(window));

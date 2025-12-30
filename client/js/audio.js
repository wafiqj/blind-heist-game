/**
 * Blind Heist - Audio System
 * Web Audio API based sound effects and music
 */

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.musicGain = null;
        this.sfxGain = null;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.enabled = true;
        this.initialized = false;
    }

    /**
     * Initialize the audio context (must be called after user interaction)
     */
    async init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create gain nodes for volume control
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.audioContext.destination);

            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.audioContext.destination);

            // Generate procedural sounds
            this.generateSounds();

            this.initialized = true;
            console.log('Audio system initialized');
        } catch (err) {
            console.warn('Audio initialization failed:', err);
        }
    }

    /**
     * Generate procedural sounds using Web Audio API
     */
    generateSounds() {
        // Footstep sound
        this.sounds.footstep = () => this.playTone(200, 0.05, 'square', 0.1);

        // Bump sound (hitting wall)
        this.sounds.bump = () => this.playTone(100, 0.1, 'sawtooth', 0.2);

        // Loot pickup
        this.sounds.loot_pickup = () => {
            this.playTone(523, 0.1, 'sine', 0.3);
            setTimeout(() => this.playTone(659, 0.1, 'sine', 0.3), 100);
            setTimeout(() => this.playTone(784, 0.15, 'sine', 0.3), 200);
        };

        // Detection alarm
        this.sounds.detected = () => {
            this.playTone(440, 0.15, 'square', 0.4);
            setTimeout(() => this.playTone(880, 0.15, 'square', 0.4), 150);
        };

        // Close call
        this.sounds.close_call = () => {
            this.playTone(300, 0.2, 'triangle', 0.2);
        };

        // Warning beep
        this.sounds.warning = () => this.playTone(600, 0.2, 'sine', 0.3);

        // Urgent warning
        this.sounds.warning_urgent = () => {
            this.playTone(800, 0.15, 'square', 0.4);
            setTimeout(() => this.playTone(800, 0.15, 'square', 0.4), 200);
        };

        // Alarm critical
        this.sounds.alarm_critical = () => {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => this.playTone(1000, 0.1, 'square', 0.5), i * 150);
            }
        };

        // Alarm spike
        this.sounds.alarm_spike = () => this.playTone(500, 0.15, 'sawtooth', 0.25);

        // Alarm silence (ability)
        this.sounds.alarm_silence = () => {
            this.playTone(400, 0.3, 'sine', 0.3);
            setTimeout(() => this.playTone(300, 0.3, 'sine', 0.2), 150);
        };

        // Camera disable
        this.sounds.camera_disable = () => {
            this.playTone(800, 0.1, 'sine', 0.2);
            setTimeout(() => this.playTone(600, 0.2, 'sine', 0.2), 100);
        };

        // Ping sound
        this.sounds.ping = () => {
            this.playTone(1200, 0.1, 'sine', 0.3);
            setTimeout(() => this.playTone(1200, 0.1, 'sine', 0.2), 150);
        };

        // Ability activate
        this.sounds.ability_activate = () => {
            this.playTone(500, 0.1, 'sine', 0.3);
            setTimeout(() => this.playTone(700, 0.15, 'sine', 0.3), 100);
        };

        // Alert escalate
        this.sounds.alert_escalate = () => {
            this.playTone(400, 0.1, 'sawtooth', 0.3);
            setTimeout(() => this.playTone(600, 0.1, 'sawtooth', 0.3), 100);
            setTimeout(() => this.playTone(800, 0.1, 'sawtooth', 0.3), 200);
        };

        // Victory fanfare
        this.sounds.victory = () => {
            const notes = [523, 659, 784, 1047];
            notes.forEach((freq, i) => {
                setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.4), i * 150);
            });
        };

        // Game over
        this.sounds.game_over = () => {
            this.playTone(400, 0.3, 'sawtooth', 0.4);
            setTimeout(() => this.playTone(300, 0.3, 'sawtooth', 0.4), 300);
            setTimeout(() => this.playTone(200, 0.5, 'sawtooth', 0.4), 600);
        };

        // Game start
        this.sounds.game_start = () => {
            const notes = [262, 330, 392, 523];
            notes.forEach((freq, i) => {
                setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.3), i * 100);
            });
        };
    }

    /**
     * Play a procedural tone
     */
    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        gainNode.gain.setValueAtTime(volume * this.sfxVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    /**
     * Play a named sound
     */
    play(soundName) {
        if (!this.enabled || !this.sounds[soundName]) return;

        // Ensure audio context is resumed (required after page interaction)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        try {
            this.sounds[soundName]();
        } catch (err) {
            console.warn(`Failed to play sound: ${soundName}`, err);
        }
    }

    /**
     * Process sound events from game state
     */
    processSoundEvents(events) {
        if (!events || !Array.isArray(events)) return;

        events.forEach(event => {
            this.play(event.type);
        });
    }

    /**
     * Set SFX volume
     */
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxVolume;
        }
    }

    /**
     * Set music volume
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicVolume;
        }
    }

    /**
     * Toggle audio on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    /**
     * Enable audio
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable audio
     */
    disable() {
        this.enabled = false;
    }
}

// Global audio manager instance
const audioManager = new AudioManager();

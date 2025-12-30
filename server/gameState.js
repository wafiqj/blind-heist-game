/**
 * Game State - Centralized state management for a heist game session
 * Enhanced with abilities, scoring, and difficulty settings
 */

const { generateMap, generateCameras, generateLoot, getDifficultySettings, CELL_TYPES } = require('./mapGenerator');

class GameState {
    constructor(mapId = 'bank', difficulty = 'medium') {
        this.mapId = mapId;
        this.difficulty = difficulty;
        this.reset();
    }

    reset() {
        const diffSettings = getDifficultySettings(this.difficulty);

        // Generate map
        const map = generateMap(this.mapId);

        this.map = {
            width: map.width,
            height: map.height,
            cells: map.cells,
            name: map.name,
            difficulty: map.difficulty
        };

        // Player starts at entry
        this.player = {
            x: map.entry.x,
            y: map.entry.y
        };

        // Entry and exit positions
        this.entry = map.entry;
        this.exit = map.exit;

        // Generate cameras with difficulty
        this.cameras = generateCameras(this.mapId, this.difficulty);

        // Generate loot
        this.loot = generateLoot(this.mapId);

        // Alarm system
        this.alarm = {
            level: 0,
            maxLevel: 100,
            countdown: diffSettings.countdown,
            startCountdown: diffSettings.countdown,
            isTriggered: false
        };

        // Difficulty settings
        this.diffSettings = diffSettings;

        // Game events log
        this.events = [];

        // Game status
        this.status = 'playing';
        this.collectedLoot = [];
        this.score = 0;

        // Tick counter
        this.tick = 0;
        this.startTime = Date.now();

        // Stats for scoring
        this.stats = {
            timesDetected: 0,
            closeCallCount: 0,
            peakAlarm: 0,
            movementCount: 0
        };

        // Abilities state
        this.abilities = {
            // Navigator: Peek (see wider area briefly)
            navigator: {
                peek: { available: true, cooldownEnd: 0, duration: 5000, cooldown: 30000, active: false, activeUntil: 0 }
            },
            // Security: Disable camera temporarily
            security: {
                disableCamera: { available: true, cooldownEnd: 0, duration: 10000, cooldown: 45000 }
            },
            // Loot Master: Ping loot to team
            lootmaster: {
                pingLoot: { available: true, cooldownEnd: 0, duration: 8000, cooldown: 20000 }
            },
            // Alarm Controller: Silence alarm (reduce level)
            alarmcontroller: {
                silenceAlarm: { available: true, cooldownEnd: 0, reduction: 25, cooldown: 60000 }
            }
        };

        // Sound events queue (for client-side audio)
        this.soundEvents = [];
    }

    /**
     * Get filtered state for a specific role
     */
    getStateForRole(role) {
        const now = Date.now();
        const baseState = {
            status: this.status,
            tick: this.tick,
            mapId: this.mapId,
            difficulty: this.difficulty
        };

        switch (role) {
            case 'navigator':
                return {
                    ...baseState,
                    role: 'navigator',
                    map: this.map,
                    player: this.player,
                    entry: this.entry,
                    exit: this.exit,
                    score: this.score,
                    collectedCount: this.collectedLoot.length,
                    totalLoot: this.loot.length,
                    ability: this.getAbilityState('navigator', now),
                    // Show pinged loot if active
                    pingedLoot: this.loot.filter(l => l.pinged && l.pingUntil > now).map(l => ({ x: l.x, y: l.y, type: l.type })),
                    soundEvents: this.consumeSoundEvents()
                };

            case 'security':
                return {
                    ...baseState,
                    role: 'security',
                    cameras: this.cameras.map(c => ({
                        ...c,
                        disabled: c.disabled && c.disabledUntil > now
                    })),
                    mapSize: { width: this.map.width, height: this.map.height },
                    ability: this.getAbilityState('security', now),
                    soundEvents: this.consumeSoundEvents()
                };

            case 'lootmaster':
                return {
                    ...baseState,
                    role: 'lootmaster',
                    loot: this.loot,
                    collectedLoot: this.collectedLoot,
                    mapSize: { width: this.map.width, height: this.map.height },
                    score: this.score,
                    ability: this.getAbilityState('lootmaster', now),
                    soundEvents: this.consumeSoundEvents()
                };

            case 'alarmcontroller':
                return {
                    ...baseState,
                    role: 'alarmcontroller',
                    alarm: this.alarm,
                    events: this.events.slice(-15),
                    stats: this.stats,
                    ability: this.getAbilityState('alarmcontroller', now),
                    soundEvents: this.consumeSoundEvents()
                };

            default:
                return { error: 'Unknown role' };
        }
    }

    /**
     * Get ability state for a role
     */
    getAbilityState(role, now) {
        const abilities = this.abilities[role];
        if (!abilities) return {};

        const result = {};
        for (const [name, ability] of Object.entries(abilities)) {
            result[name] = {
                available: ability.cooldownEnd <= now,
                cooldownRemaining: Math.max(0, Math.ceil((ability.cooldownEnd - now) / 1000)),
                active: ability.active && ability.activeUntil > now,
                activeRemaining: ability.activeUntil ? Math.max(0, Math.ceil((ability.activeUntil - now) / 1000)) : 0
            };
        }
        return result;
    }

    /**
     * Use an ability
     */
    useAbility(role, abilityName, params = {}) {
        const now = Date.now();
        const roleAbilities = this.abilities[role];
        if (!roleAbilities) return { success: false, error: 'Invalid role' };

        const ability = roleAbilities[abilityName];
        if (!ability) return { success: false, error: 'Unknown ability' };

        if (ability.cooldownEnd > now) {
            return { success: false, error: 'Ability on cooldown' };
        }

        // Execute ability
        switch (`${role}.${abilityName}`) {
            case 'navigator.peek':
                ability.active = true;
                ability.activeUntil = now + ability.duration;
                ability.cooldownEnd = now + ability.cooldown;
                this.addEvent('info', '👁️ Navigator activated Peek!');
                this.addSoundEvent('ability_activate');
                break;

            case 'security.disableCamera':
                const cameraId = params.cameraId;
                if (cameraId === undefined || !this.cameras[cameraId]) {
                    return { success: false, error: 'Invalid camera ID' };
                }
                this.cameras[cameraId].disabled = true;
                this.cameras[cameraId].disabledUntil = now + ability.duration;
                ability.cooldownEnd = now + ability.cooldown;
                this.addEvent('success', `📹 Camera ${cameraId + 1} disabled for 10 seconds!`);
                this.addSoundEvent('camera_disable');
                break;

            case 'lootmaster.pingLoot':
                const lootId = params.lootId;
                if (lootId === undefined || !this.loot[lootId]) {
                    return { success: false, error: 'Invalid loot ID' };
                }
                if (this.loot[lootId].collected) {
                    return { success: false, error: 'Loot already collected' };
                }
                this.loot[lootId].pinged = true;
                this.loot[lootId].pingUntil = now + ability.duration;
                ability.cooldownEnd = now + ability.cooldown;
                this.addEvent('info', `📍 Loot Master pinged ${this.loot[lootId].type} location!`);
                this.addSoundEvent('ping');
                break;

            case 'alarmcontroller.silenceAlarm':
                const reduction = Math.min(ability.reduction, this.alarm.level);
                this.alarm.level = Math.max(0, this.alarm.level - reduction);
                ability.cooldownEnd = now + ability.cooldown;
                this.addEvent('success', `🔇 Alarm silenced! Reduced by ${reduction}%`);
                this.addSoundEvent('alarm_silence');
                break;

            default:
                return { success: false, error: 'Unknown ability action' };
        }

        return { success: true };
    }

    /**
     * Add a sound event
     */
    addSoundEvent(type) {
        this.soundEvents.push({ type, timestamp: Date.now() });
    }

    /**
     * Consume and clear sound events
     */
    consumeSoundEvents() {
        const events = [...this.soundEvents];
        this.soundEvents = [];
        return events;
    }

    /**
     * Add an event to the log
     */
    addEvent(type, message) {
        this.events.push({
            id: this.events.length,
            type,
            message,
            timestamp: Date.now(),
            tick: this.tick
        });

        if (this.events.length > 50) {
            this.events = this.events.slice(-50);
        }
    }

    /**
     * Calculate final score with breakdown
     */
    calculateFinalScore() {
        const now = Date.now();
        const timeUsed = Math.floor((now - this.startTime) / 1000);
        const timeLeft = this.alarm.countdown;

        // Base score from loot
        const lootScore = this.score;

        // Time bonus (more time left = more bonus)
        const timeBonus = Math.floor(timeLeft * 2);

        // Stealth bonus (fewer detections = more bonus)
        const stealthBonus = Math.max(0, 100 - (this.stats.timesDetected * 20));

        // Close call bonus (exciting gameplay)
        const closeCallBonus = this.stats.closeCallCount * 10;

        // Difficulty multiplier
        const difficultyMultiplier = { easy: 1, medium: 1.5, hard: 2 }[this.difficulty] || 1;

        // Total
        const subtotal = lootScore + timeBonus + stealthBonus + closeCallBonus;
        const total = Math.floor(subtotal * difficultyMultiplier);

        // Star rating
        const maxPossibleLoot = this.loot.reduce((sum, l) => sum + l.value, 0);
        const lootPercent = lootScore / maxPossibleLoot;
        const stars = lootPercent >= 0.9 && this.stats.timesDetected <= 2 ? 3 :
            lootPercent >= 0.6 && this.stats.timesDetected <= 5 ? 2 : 1;

        return {
            lootScore,
            timeBonus,
            stealthBonus,
            closeCallBonus,
            difficultyMultiplier,
            total,
            stars,
            timeUsed,
            lootCollected: this.collectedLoot.length,
            totalLoot: this.loot.length,
            timesDetected: this.stats.timesDetected,
            peakAlarm: this.stats.peakAlarm
        };
    }

    /**
     * Get cell type at position
     */
    getCellAt(x, y) {
        if (x < 0 || x >= this.map.width || y < 0 || y >= this.map.height) {
            return CELL_TYPES.WALL;
        }
        return this.map.cells[y][x];
    }

    /**
     * Check if position is walkable
     */
    isWalkable(x, y) {
        const cell = this.getCellAt(x, y);
        return cell !== CELL_TYPES.WALL;
    }

    /**
     * Get full state (for debugging)
     */
    getFullState() {
        return {
            map: this.map,
            player: this.player,
            entry: this.entry,
            exit: this.exit,
            cameras: this.cameras,
            loot: this.loot,
            alarm: this.alarm,
            events: this.events,
            status: this.status,
            score: this.score,
            tick: this.tick,
            abilities: this.abilities,
            stats: this.stats
        };
    }
}

module.exports = GameState;

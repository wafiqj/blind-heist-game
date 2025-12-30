/**
 * Room Manager - Handles room creation, player management, and role assignment
 * Enhanced with map selection, difficulty, and ability handling
 */

const { v4: uuidv4 } = require('uuid');
const GameState = require('./gameState');
const GameLogic = require('./gameLogic');
const { getAvailableMaps } = require('./mapGenerator');

const ROLES = ['navigator', 'security', 'lootmaster', 'alarmcontroller'];
const ROLE_NAMES = {
    navigator: 'Navigator',
    security: 'Security',
    lootmaster: 'Loot Master',
    alarmcontroller: 'Alarm Controller'
};

class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    /**
     * Generate a unique 6-character room code
     */
    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code;
        do {
            code = '';
            for (let i = 0; i < 6; i++) {
                code += chars[Math.floor(Math.random() * chars.length)];
            }
        } while (this.rooms.has(code));
        return code;
    }

    /**
     * Create a new room
     */
    createRoom(hostPlayerId) {
        const code = this.generateRoomCode();
        const room = {
            code,
            status: 'waiting',
            players: new Map(),
            availableRoles: [...ROLES],
            gameState: null,
            gameLogic: null,
            createdAt: Date.now(),
            // New: Game settings
            settings: {
                mapId: 'bank',
                difficulty: 'medium'
            }
        };

        this.rooms.set(code, room);
        return { code, room };
    }

    /**
     * Update room settings
     */
    updateSettings(code, settings) {
        const room = this.rooms.get(code.toUpperCase());
        if (!room) return { success: false, error: 'Room not found' };
        if (room.status !== 'waiting') return { success: false, error: 'Game already started' };

        if (settings.mapId) room.settings.mapId = settings.mapId;
        if (settings.difficulty) room.settings.difficulty = settings.difficulty;

        return { success: true, settings: room.settings };
    }

    /**
     * Get available maps
     */
    getMaps() {
        return getAvailableMaps();
    }

    /**
     * Join a room with a code
     */
    joinRoom(code, playerId, ws) {
        const room = this.rooms.get(code.toUpperCase());

        if (!room) {
            return { success: false, error: 'Room not found' };
        }

        if (room.status !== 'waiting') {
            return { success: false, error: 'Game already in progress' };
        }

        if (room.players.size >= 4) {
            return { success: false, error: 'Room is full' };
        }

        if (room.players.has(playerId)) {
            return { success: false, error: 'Already in room' };
        }

        const role = room.availableRoles.shift();

        room.players.set(playerId, {
            id: playerId,
            role,
            roleName: ROLE_NAMES[role],
            ws,
            ready: false,
            joinedAt: Date.now()
        });

        return {
            success: true,
            role,
            roleName: ROLE_NAMES[role],
            playerCount: room.players.size,
            canStart: room.players.size === 4,
            settings: room.settings,
            maps: this.getMaps()
        };
    }

    /**
     * Leave a room
     */
    leaveRoom(code, playerId) {
        const room = this.rooms.get(code);
        if (!room) return false;

        const player = room.players.get(playerId);
        if (player) {
            room.availableRoles.unshift(player.role);
            room.players.delete(playerId);

            if (room.players.size === 0) {
                if (room.gameLogic) {
                    room.gameLogic.stop();
                }
                this.rooms.delete(code);
            }
        }

        return true;
    }

    /**
     * Get room info
     */
    getRoom(code) {
        return this.rooms.get(code.toUpperCase());
    }

    /**
     * Get all players in a room
     */
    getPlayers(code) {
        const room = this.rooms.get(code);
        if (!room) return [];

        return Array.from(room.players.values()).map(p => ({
            id: p.id,
            role: p.role,
            roleName: p.roleName,
            ready: p.ready
        }));
    }

    /**
     * Start the game with settings
     */
    startGame(code, onStateChange) {
        const room = this.rooms.get(code);
        if (!room) return { success: false, error: 'Room not found' };

        if (room.players.size !== 4) {
            return { success: false, error: 'Need exactly 4 players to start' };
        }

        room.status = 'playing';
        room.gameState = new GameState(room.settings.mapId, room.settings.difficulty);
        room.gameLogic = new GameLogic(room.gameState);

        room.gameLogic.start(() => {
            onStateChange(code);
        });

        return { success: true, mapId: room.settings.mapId, difficulty: room.settings.difficulty };
    }

    /**
     * Process a game action
     */
    processAction(code, playerId, action) {
        const room = this.rooms.get(code);
        if (!room || room.status !== 'playing') {
            return { success: false, error: 'Game not in progress' };
        }

        const player = room.players.get(playerId);
        if (!player) {
            return { success: false, error: 'Player not in room' };
        }

        // Movement action (Navigator only)
        if (action.type === 'move') {
            if (player.role !== 'navigator') {
                return { success: false, error: 'Only Navigator can move' };
            }
            const moved = room.gameLogic.movePlayer(action.direction);
            return { success: moved };
        }

        // Ability action (any role can use their ability)
        if (action.type === 'ability') {
            const result = room.gameState.useAbility(player.role, action.abilityName, action.params || {});
            if (result.success) {
                this.broadcastState(code);
            }
            return result;
        }

        return { success: false, error: 'Unknown action' };
    }

    /**
     * Get filtered game state for a player
     */
    getPlayerState(code, playerId) {
        const room = this.rooms.get(code);
        if (!room || !room.gameState) return null;

        const player = room.players.get(playerId);
        if (!player) return null;

        const state = room.gameState.getStateForRole(player.role);

        // Add final score if game ended
        if (room.gameState.status !== 'playing' && room.gameState.finalScore) {
            state.finalScore = room.gameState.finalScore;
        }

        return state;
    }

    /**
     * Broadcast state to all players in a room
     */
    broadcastState(code) {
        const room = this.rooms.get(code);
        if (!room) return;

        room.players.forEach((player, playerId) => {
            if (player.ws && player.ws.readyState === 1) {
                const state = this.getPlayerState(code, playerId);
                player.ws.send(JSON.stringify({
                    type: 'state_update',
                    state
                }));
            }
        });
    }

    /**
     * Broadcast settings to all players
     */
    broadcastSettings(code) {
        const room = this.rooms.get(code);
        if (!room) return;

        const message = JSON.stringify({
            type: 'settings_updated',
            settings: room.settings,
            maps: this.getMaps()
        });

        room.players.forEach((player) => {
            if (player.ws && player.ws.readyState === 1) {
                player.ws.send(message);
            }
        });
    }

    /**
     * Clean up old rooms
     */
    cleanup() {
        const now = Date.now();
        const maxAge = 30 * 60 * 1000;

        this.rooms.forEach((room, code) => {
            if (now - room.createdAt > maxAge && room.status !== 'playing') {
                if (room.gameLogic) {
                    room.gameLogic.stop();
                }
                this.rooms.delete(code);
            }
        });
    }
}

module.exports = RoomManager;

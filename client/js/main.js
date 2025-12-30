/**
 * Blind Heist - Main WebSocket Client
 * Enhanced with settings and ability actions
 */

class GameClient {
    constructor() {
        this.ws = null;
        this.playerId = null;
        this.roomCode = null;
        this.role = null;
        this.roleName = null;
        this.gameState = null;
        this.isConnected = false;
        this.maps = [];

        // Event handlers
        this.onConnect = null;
        this.onDisconnect = null;
        this.onRoomCreated = null;
        this.onRoomJoined = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onGameStarted = null;
        this.onStateUpdate = null;
        this.onSettingsUpdate = null;
        this.onError = null;
    }

    /**
     * Connect to the WebSocket server
     */
    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (err) {
                console.error('Failed to parse message:', err);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            if (this.onDisconnect) {
                this.onDisconnect();
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            if (this.onError) {
                this.onError('Connection error');
            }
        };
    }

    /**
     * Handle incoming messages
     */
    handleMessage(message) {
        console.log('Received:', message.type, message);

        switch (message.type) {
            case 'connected':
                this.playerId = message.playerId;
                this.isConnected = true;
                this.maps = message.maps || [];
                if (this.onConnect) {
                    this.onConnect(message.playerId, message.maps);
                }
                break;

            case 'room_created':
                this.roomCode = message.code;
                this.role = message.role;
                this.roleName = message.roleName;
                this.maps = message.maps || this.maps;
                if (this.onRoomCreated) {
                    this.onRoomCreated(message);
                }
                break;

            case 'room_joined':
                this.roomCode = message.code;
                this.role = message.role;
                this.roleName = message.roleName;
                this.maps = message.maps || this.maps;
                if (this.onRoomJoined) {
                    this.onRoomJoined(message);
                }
                break;

            case 'player_joined':
                if (this.onPlayerJoined) {
                    this.onPlayerJoined(message);
                }
                break;

            case 'player_left':
                if (this.onPlayerLeft) {
                    this.onPlayerLeft(message);
                }
                break;

            case 'settings_updated':
                if (this.onSettingsUpdate) {
                    this.onSettingsUpdate(message.settings, message.maps);
                }
                break;

            case 'game_started':
                if (this.onGameStarted) {
                    this.onGameStarted(message);
                }
                break;

            case 'state_update':
                this.gameState = message.state;
                if (this.onStateUpdate) {
                    this.onStateUpdate(message.state);
                }
                break;

            case 'action_failed':
                console.warn('Action failed:', message.message);
                break;

            case 'error':
                console.error('Server error:', message.message);
                if (this.onError) {
                    this.onError(message.message);
                }
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    }

    /**
     * Send a message to the server
     */
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket not connected');
        }
    }

    /**
     * Create a new room
     */
    createRoom() {
        this.send({ type: 'create_room' });
    }

    /**
     * Join an existing room
     */
    joinRoom(code) {
        this.send({ type: 'join_room', code: code.toUpperCase() });
    }

    /**
     * Update room settings
     */
    updateSettings(settings) {
        this.send({ type: 'update_settings', code: this.roomCode, settings });
    }

    /**
     * Start the game
     */
    startGame() {
        this.send({ type: 'start_game', code: this.roomCode });
    }

    /**
     * Send a movement action
     */
    move(direction) {
        this.send({
            type: 'action',
            code: this.roomCode,
            action: { type: 'move', direction }
        });
    }

    /**
     * Use an ability
     */
    useAbility(abilityName, params = {}) {
        this.send({
            type: 'action',
            code: this.roomCode,
            action: { type: 'ability', abilityName, params }
        });
    }

    /**
     * Request current state
     */
    requestState() {
        this.send({ type: 'get_state', code: this.roomCode });
    }
}

// Global game client instance
const gameClient = new GameClient();

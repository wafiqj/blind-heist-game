/**
 * Blind Heist - Main Server Entry Point
 * WebSocket server for real-time multiplayer coordination
 * Enhanced with settings and ability handling
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const RoomManager = require('./roomManager');

const PORT = process.env.PORT || 3000;
const roomManager = new RoomManager();

// MIME types for static file serving
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg'
};

// Create HTTP server for static files
const server = http.createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = filePath.split('?')[0];

    const fullPath = path.join(__dirname, '..', 'client', filePath);
    const ext = path.extname(fullPath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Track player connections
const playerConnections = new Map();

wss.on('connection', (ws) => {
    const playerId = uuidv4();
    let currentRoom = null;

    console.log(`Player connected: ${playerId}`);

    ws.send(JSON.stringify({
        type: 'connected',
        playerId,
        maps: roomManager.getMaps()
    }));

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleMessage(ws, playerId, message, (room) => {
                currentRoom = room;
            });
        } catch (err) {
            console.error('Invalid message:', err);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });

    ws.on('close', () => {
        console.log(`Player disconnected: ${playerId}`);

        if (currentRoom) {
            roomManager.leaveRoom(currentRoom, playerId);

            const room = roomManager.getRoom(currentRoom);
            if (room) {
                broadcastToRoom(currentRoom, {
                    type: 'player_left',
                    playerId,
                    players: roomManager.getPlayers(currentRoom)
                });
            }
        }

        playerConnections.delete(playerId);
    });

    playerConnections.set(playerId, { ws, room: null });
});

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(ws, playerId, message, setRoom) {
    switch (message.type) {
        case 'create_room':
            handleCreateRoom(ws, playerId, setRoom);
            break;

        case 'join_room':
            handleJoinRoom(ws, playerId, message.code, setRoom);
            break;

        case 'update_settings':
            handleUpdateSettings(ws, message.code, message.settings);
            break;

        case 'start_game':
            handleStartGame(ws, playerId, message.code);
            break;

        case 'action':
            handleAction(ws, playerId, message.code, message.action);
            break;

        case 'get_state':
            handleGetState(ws, playerId, message.code);
            break;

        case 'get_maps':
            ws.send(JSON.stringify({
                type: 'maps_list',
                maps: roomManager.getMaps()
            }));
            break;

        default:
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Unknown message type'
            }));
    }
}

/**
 * Handle room creation
 */
function handleCreateRoom(ws, playerId, setRoom) {
    const { code, room } = roomManager.createRoom(playerId);
    const result = roomManager.joinRoom(code, playerId, ws);

    if (result.success) {
        setRoom(code);

        ws.send(JSON.stringify({
            type: 'room_created',
            code,
            role: result.role,
            roleName: result.roleName,
            playerCount: result.playerCount,
            settings: result.settings,
            maps: result.maps
        }));

        console.log(`Room created: ${code} by ${playerId}`);
    } else {
        ws.send(JSON.stringify({
            type: 'error',
            message: result.error
        }));
    }
}

/**
 * Handle room joining
 */
function handleJoinRoom(ws, playerId, code, setRoom) {
    const result = roomManager.joinRoom(code, playerId, ws);

    if (result.success) {
        setRoom(code);

        ws.send(JSON.stringify({
            type: 'room_joined',
            code,
            role: result.role,
            roleName: result.roleName,
            playerCount: result.playerCount,
            canStart: result.canStart,
            settings: result.settings,
            maps: result.maps
        }));

        broadcastToRoom(code, {
            type: 'player_joined',
            players: roomManager.getPlayers(code),
            canStart: result.canStart
        });

        console.log(`Player ${playerId} joined room ${code} as ${result.role}`);
    } else {
        ws.send(JSON.stringify({
            type: 'error',
            message: result.error
        }));
    }
}

/**
 * Handle settings update
 */
function handleUpdateSettings(ws, code, settings) {
    const result = roomManager.updateSettings(code, settings);

    if (result.success) {
        roomManager.broadcastSettings(code);
        console.log(`Settings updated in room ${code}: ${JSON.stringify(settings)}`);
    } else {
        ws.send(JSON.stringify({
            type: 'error',
            message: result.error
        }));
    }
}

/**
 * Handle game start
 */
function handleStartGame(ws, playerId, code) {
    const result = roomManager.startGame(code, (roomCode) => {
        roomManager.broadcastState(roomCode);
    });

    if (result.success) {
        broadcastToRoom(code, {
            type: 'game_started',
            mapId: result.mapId,
            difficulty: result.difficulty
        });

        roomManager.broadcastState(code);
        console.log(`Game started in room ${code} - Map: ${result.mapId}, Difficulty: ${result.difficulty}`);
    } else {
        ws.send(JSON.stringify({
            type: 'error',
            message: result.error
        }));
    }
}

/**
 * Handle game actions (move, ability)
 */
function handleAction(ws, playerId, code, action) {
    const result = roomManager.processAction(code, playerId, action);

    if (result.success) {
        roomManager.broadcastState(code);
    } else {
        ws.send(JSON.stringify({
            type: 'action_failed',
            message: result.error
        }));
    }
}

/**
 * Handle state request
 */
function handleGetState(ws, playerId, code) {
    const state = roomManager.getPlayerState(code, playerId);

    if (state) {
        ws.send(JSON.stringify({
            type: 'state_update',
            state
        }));
    }
}

/**
 * Broadcast message to all players in a room
 */
function broadcastToRoom(code, message) {
    const room = roomManager.getRoom(code);
    if (!room) return;

    const msgStr = JSON.stringify(message);

    room.players.forEach((player) => {
        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(msgStr);
        }
    });
}

// Cleanup old rooms periodically
setInterval(() => {
    roomManager.cleanup();
}, 5 * 60 * 1000);

// Start server
server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║         BLIND HEIST SERVER v2.0               ║
╠═══════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}      ║
║  Share this address with other players!       ║
║                                               ║
║  New Features:                                ║
║  ✓ Multiple maps (Bank, Museum, Fortress)     ║
║  ✓ Difficulty levels (Easy/Medium/Hard)       ║
║  ✓ Special abilities per role                 ║
║  ✓ Rotating cameras                           ║
║  ✓ Scoring system with star ratings           ║
╚═══════════════════════════════════════════════╝
  `);
});

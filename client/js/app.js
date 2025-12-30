/**
 * Blind Heist - Main Application Entry Point
 * Enhanced with audio, abilities, and score breakdown
 */

class BlindHeistApp {
    constructor() {
        this.currentView = null;
        this.elements = {
            lobbyView: document.getElementById('lobby-view'),
            gameView: document.getElementById('game-view'),
            gameContent: document.getElementById('game-content'),
            controlsContainer: document.getElementById('controls-container'),
            roleBadge: document.getElementById('role-badge'),
            gameStatus: document.getElementById('game-status'),
            soundToggle: document.getElementById('sound-toggle'),
            gameOverModal: document.getElementById('game-over-modal'),
            gameOverIcon: document.getElementById('game-over-icon'),
            gameOverTitle: document.getElementById('game-over-title'),
            gameOverStars: document.getElementById('game-over-stars'),
            gameOverMessage: document.getElementById('game-over-message'),
            gameOverBreakdown: document.getElementById('game-over-breakdown'),
            gameOverScore: document.getElementById('game-over-score'),
            playAgainBtn: document.getElementById('play-again-btn')
        };

        this.init();
    }

    init() {
        // Set up game client callbacks
        gameClient.onConnect = (playerId, maps) => this.onConnect(playerId, maps);
        gameClient.onDisconnect = () => this.onDisconnect();
        gameClient.onRoomCreated = (data) => this.onRoomCreated(data);
        gameClient.onRoomJoined = (data) => this.onRoomJoined(data);
        gameClient.onPlayerJoined = (data) => this.onPlayerJoined(data);
        gameClient.onPlayerLeft = (data) => this.onPlayerLeft(data);
        gameClient.onSettingsUpdate = (settings, maps) => this.onSettingsUpdate(settings, maps);
        gameClient.onGameStarted = (data) => this.onGameStarted(data);
        gameClient.onStateUpdate = (state) => this.onStateUpdate(state);
        gameClient.onError = (message) => this.onError(message);

        this.setupControls();
        this.setupSoundToggle();
        this.elements.playAgainBtn.addEventListener('click', () => this.resetGame());

        // Connect
        gameClient.connect();
    }

    setupControls() {
        const moveButtons = document.querySelectorAll('.move-btn');
        moveButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const direction = btn.dataset.direction;
                gameClient.move(direction);
            });
        });

        document.addEventListener('keydown', (e) => {
            if (this.elements.gameView.classList.contains('hidden')) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            const keyMap = {
                'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
                'w': 'up', 's': 'down', 'a': 'left', 'd': 'right',
                'W': 'up', 'S': 'down', 'A': 'left', 'D': 'right'
            };

            const direction = keyMap[e.key];
            if (direction) {
                e.preventDefault();
                gameClient.move(direction);
            }
        });
    }

    setupSoundToggle() {
        if (this.elements.soundToggle) {
            this.elements.soundToggle.addEventListener('click', () => {
                const enabled = audioManager.toggle();
                this.elements.soundToggle.textContent = enabled ? '🔊' : '🔇';
            });
        }
    }

    onConnect(playerId, maps) {
        console.log('Connected with ID:', playerId);
        lobby.updateConnectionStatus(true);
        if (maps) lobby.setMaps(maps);

        // Initialize audio on first user interaction
        document.addEventListener('click', () => {
            audioManager.init();
        }, { once: true });
    }

    onDisconnect() {
        console.log('Disconnected');
        lobby.updateConnectionStatus(false);
    }

    onRoomCreated(data) {
        console.log('Room created:', data);
        lobby.setMaps(data.maps);
        lobby.updateSettings(data.settings);
        lobby.showWaitingRoom(data.code, data.role, data.roleName, true);
        lobby.updatePlayersList([{ role: data.role, roleName: data.roleName }], false);
    }

    onRoomJoined(data) {
        console.log('Room joined:', data);
        lobby.setMaps(data.maps);
        lobby.updateSettings(data.settings);
        lobby.showWaitingRoom(data.code, data.role, data.roleName, false);
    }

    onPlayerJoined(data) {
        console.log('Player joined:', data);
        lobby.updatePlayersList(data.players, data.canStart);
    }

    onPlayerLeft(data) {
        console.log('Player left:', data);
        lobby.updatePlayersList(data.players, data.players.length === 4);
    }

    onSettingsUpdate(settings, maps) {
        console.log('Settings updated:', settings);
        if (maps) lobby.setMaps(maps);
        lobby.updateSettings(settings);
    }

    onGameStarted(data) {
        console.log('Game started!', data);
        this.showGameView();
        audioManager.init();
    }

    onStateUpdate(state) {
        if (state.status === 'won' || state.status === 'lost') {
            this.showGameOver(state);
            return;
        }

        this.elements.gameStatus.textContent = `${state.mapId?.toUpperCase() || ''} | ${state.difficulty?.toUpperCase() || ''}`;
        this.renderRoleView(state);
    }

    onError(message) {
        console.error('Error:', message);
        lobby.showError(message);
    }

    showGameView() {
        this.elements.lobbyView.classList.add('hidden');
        this.elements.gameView.classList.remove('hidden');

        const role = gameClient.role;
        const roleName = gameClient.roleName;
        this.elements.roleBadge.textContent = roleName;
        this.elements.roleBadge.className = `role-badge ${role}`;

        if (role === 'navigator') {
            this.elements.controlsContainer.classList.remove('hidden');
        } else {
            this.elements.controlsContainer.classList.add('hidden');
        }

        this.initRoleView(role);
    }

    initRoleView(role) {
        const container = this.elements.gameContent;

        switch (role) {
            case 'navigator': this.currentView = navigatorView; break;
            case 'security': this.currentView = securityView; break;
            case 'lootmaster': this.currentView = lootMasterView; break;
            case 'alarmcontroller': this.currentView = alarmControllerView; break;
            default: console.error('Unknown role:', role); return;
        }

        this.currentView.init(container);
    }

    renderRoleView(state) {
        if (this.currentView) {
            this.currentView.render(state);
        }
    }

    showGameOver(state) {
        const isWin = state.status === 'won';
        const finalScore = state.finalScore || {};

        this.elements.gameOverIcon.textContent = isWin ? '🏆' : '💀';
        this.elements.gameOverTitle.textContent = isWin ? 'HEIST SUCCESSFUL!' : 'HEIST FAILED!';
        this.elements.gameOverTitle.className = `game-over-title ${isWin ? 'won' : 'lost'}`;

        // Stars
        if (isWin && finalScore.stars) {
            this.elements.gameOverStars.innerHTML = '⭐'.repeat(finalScore.stars) + '☆'.repeat(3 - finalScore.stars);
            this.elements.gameOverStars.style.display = 'block';
        } else {
            this.elements.gameOverStars.style.display = 'none';
        }

        this.elements.gameOverMessage.textContent = isWin
            ? `Your team escaped with ${finalScore.lootCollected}/${finalScore.totalLoot} loot items!`
            : 'The alarm went off or time ran out!';

        // Score breakdown
        if (finalScore.total !== undefined) {
            this.elements.gameOverBreakdown.innerHTML = `
        <div class="breakdown-row"><span>💎 Loot Value:</span><span>$${finalScore.lootScore}</span></div>
        <div class="breakdown-row"><span>⏱️ Time Bonus:</span><span>+$${finalScore.timeBonus}</span></div>
        <div class="breakdown-row"><span>🥷 Stealth Bonus:</span><span>+$${finalScore.stealthBonus}</span></div>
        <div class="breakdown-row"><span>😰 Close Calls:</span><span>+$${finalScore.closeCallBonus}</span></div>
        <div class="breakdown-row"><span>🎯 Difficulty (x${finalScore.difficultyMultiplier}):</span><span></span></div>
      `;
            this.elements.gameOverBreakdown.style.display = 'block';
            this.elements.gameOverScore.textContent = `Total: $${finalScore.total}`;
            this.elements.gameOverScore.style.display = 'block';
        } else {
            this.elements.gameOverBreakdown.style.display = 'none';
            this.elements.gameOverScore.style.display = 'none';
        }

        this.elements.gameOverModal.classList.add('active');

        // Play sound
        audioManager.play(isWin ? 'victory' : 'game_over');
    }

    resetGame() {
        this.elements.gameOverModal.classList.remove('active');
        this.elements.gameView.classList.add('hidden');
        lobby.show();
        gameClient.connect();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BlindHeistApp();
});

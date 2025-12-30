/**
 * Blind Heist - Lobby Logic
 * Enhanced with map selection and difficulty settings
 */

class Lobby {
    constructor() {
        this.elements = {
            lobbyView: document.getElementById('lobby-view'),
            lobbyActions: document.getElementById('lobby-actions'),
            waitingRoom: document.getElementById('waiting-room'),
            connectionDot: document.getElementById('connection-dot'),
            connectionText: document.getElementById('connection-text'),
            createRoomBtn: document.getElementById('create-room-btn'),
            joinRoomBtn: document.getElementById('join-room-btn'),
            roomCodeInput: document.getElementById('room-code-input'),
            displayRoomCode: document.getElementById('display-room-code'),
            yourRoleName: document.getElementById('your-role-name'),
            playersContainer: document.getElementById('players-container'),
            startGameBtn: document.getElementById('start-game-btn'),
            waitingMessage: document.getElementById('waiting-message'),
            mapSelect: document.getElementById('map-select'),
            difficultySelect: document.getElementById('difficulty-select')
        };

        this.roleIcons = {
            navigator: '🧭',
            security: '📹',
            lootmaster: '💎',
            alarmcontroller: '🚨'
        };

        this.roleDescriptions = {
            navigator: 'See the room layout and control movement. Use PEEK ability for wider view.',
            security: 'See cameras and their FOV. Use DISABLE ability to shut down a camera.',
            lootmaster: 'See loot locations and values. Use PING ability to mark loot for Navigator.',
            alarmcontroller: 'See alarm meter and events. Use SILENCE ability to reduce alarm level.'
        };

        this.maps = [];
        this.currentSettings = { mapId: 'bank', difficulty: 'medium' };
        this.isHost = false;

        this.bindEvents();
    }

    bindEvents() {
        this.elements.createRoomBtn.addEventListener('click', () => {
            gameClient.createRoom();
        });

        this.elements.joinRoomBtn.addEventListener('click', () => {
            const code = this.elements.roomCodeInput.value.trim();
            if (code.length === 6) {
                gameClient.joinRoom(code);
            }
        });

        this.elements.roomCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            this.elements.joinRoomBtn.disabled = e.target.value.length !== 6;
        });

        this.elements.roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.elements.roomCodeInput.value.length === 6) {
                gameClient.joinRoom(this.elements.roomCodeInput.value);
            }
        });

        this.elements.startGameBtn.addEventListener('click', () => {
            gameClient.startGame();
        });

        // Settings change handlers
        if (this.elements.mapSelect) {
            this.elements.mapSelect.addEventListener('change', (e) => {
                if (this.isHost) {
                    gameClient.updateSettings({ mapId: e.target.value });
                }
            });
        }

        if (this.elements.difficultySelect) {
            this.elements.difficultySelect.addEventListener('change', (e) => {
                if (this.isHost) {
                    gameClient.updateSettings({ difficulty: e.target.value });
                }
            });
        }
    }

    updateConnectionStatus(connected) {
        if (connected) {
            this.elements.connectionDot.className = 'connection-dot connected';
            this.elements.connectionText.textContent = 'Connected';
            this.elements.createRoomBtn.disabled = false;
            this.elements.joinRoomBtn.disabled = this.elements.roomCodeInput.value.length !== 6;
        } else {
            this.elements.connectionDot.className = 'connection-dot';
            this.elements.connectionText.textContent = 'Disconnected';
            this.elements.createRoomBtn.disabled = true;
            this.elements.joinRoomBtn.disabled = true;
        }
    }

    setMaps(maps) {
        this.maps = maps || [];
        this.updateMapSelector();
    }

    updateMapSelector() {
        if (!this.elements.mapSelect) return;

        this.elements.mapSelect.innerHTML = this.maps.map(map =>
            `<option value="${map.id}" ${map.id === this.currentSettings.mapId ? 'selected' : ''}>
        ${map.name} (${map.difficulty}) - ${map.lootCount} loot, ${map.cameraCount} cameras
      </option>`
        ).join('');
    }

    showWaitingRoom(code, role, roleName, isHost = false) {
        this.isHost = isHost;
        this.elements.lobbyActions.classList.add('hidden');
        this.elements.waitingRoom.classList.add('active');

        this.elements.displayRoomCode.textContent = code;
        this.elements.yourRoleName.textContent = roleName;
        this.elements.yourRoleName.className = `role-name ${role}`;

        // Show role description
        const description = this.roleDescriptions[role];
        if (description) {
            const existingDesc = document.getElementById('role-description');
            if (existingDesc) existingDesc.remove();

            const descEl = document.createElement('p');
            descEl.id = 'role-description';
            descEl.style.cssText = 'color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;';
            descEl.textContent = description;
            this.elements.yourRoleName.parentElement.appendChild(descEl);
        }

        // Enable/disable settings based on host status
        if (this.elements.mapSelect) {
            this.elements.mapSelect.disabled = !isHost;
        }
        if (this.elements.difficultySelect) {
            this.elements.difficultySelect.disabled = !isHost;
        }
    }

    updateSettings(settings) {
        this.currentSettings = { ...this.currentSettings, ...settings };

        if (this.elements.mapSelect && settings.mapId) {
            this.elements.mapSelect.value = settings.mapId;
        }
        if (this.elements.difficultySelect && settings.difficulty) {
            this.elements.difficultySelect.value = settings.difficulty;
        }
    }

    updatePlayersList(players, canStart) {
        const allRoles = ['navigator', 'security', 'lootmaster', 'alarmcontroller'];
        const roleNames = {
            navigator: 'Navigator',
            security: 'Security',
            lootmaster: 'Loot Master',
            alarmcontroller: 'Alarm Controller'
        };

        const occupiedRoles = new Map(players.map(p => [p.role, p]));

        this.elements.playersContainer.innerHTML = allRoles.map(role => {
            const player = occupiedRoles.get(role);
            const isMe = player && player.role === gameClient.role;

            if (player) {
                return `
          <div class="player-slot">
            <div class="player-icon ${role}">${this.roleIcons[role]}</div>
            <div class="player-info">
              <div class="player-role">${roleNames[role]}${isMe ? ' (You)' : ''}</div>
              <div class="player-status">Ready</div>
            </div>
          </div>
        `;
            } else {
                return `
          <div class="player-slot empty">
            <div class="player-icon" style="background: var(--bg-surface);">${this.roleIcons[role]}</div>
            <div class="player-info">
              <div class="player-role">${roleNames[role]}</div>
              <div class="player-status">Waiting...</div>
            </div>
          </div>
        `;
            }
        }).join('');

        const playersListHeader = this.elements.playersContainer.parentElement.querySelector('h3');
        if (playersListHeader) {
            playersListHeader.textContent = `Players (${players.length}/4)`;
        }

        this.elements.startGameBtn.disabled = !canStart;
        this.elements.waitingMessage.textContent = canStart
            ? 'All players ready! Start when everyone is prepared.'
            : `Waiting for ${4 - players.length} more player${4 - players.length !== 1 ? 's' : ''}...`;
    }

    hide() {
        this.elements.lobbyView.classList.add('hidden');
    }

    show() {
        this.elements.lobbyView.classList.remove('hidden');
        this.elements.lobbyActions.classList.remove('hidden');
        this.elements.waitingRoom.classList.remove('active');
        this.elements.roomCodeInput.value = '';
        this.isHost = false;
    }

    showError(message) {
        alert(message);
    }
}

// Global lobby instance
const lobby = new Lobby();

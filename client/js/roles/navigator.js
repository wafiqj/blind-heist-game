/**
 * Blind Heist - Navigator Role View
 * Enhanced with Peek ability and pinged loot display
 */

class NavigatorView {
    constructor() {
        this.container = null;
        this.svg = null;
        this.CELL_SIZE = 32;
    }

    init(container) {
        this.container = container;
        this.container.innerHTML = `
      <div class="game-canvas-container navigator-view">
        <div id="navigator-canvas"></div>
      </div>
      <div class="navigator-info" style="text-align: center; margin-top: 1rem;">
        <p>🧭 You are the <strong style="color: var(--navigator-color);">Navigator</strong></p>
        <p style="font-size: 0.875rem; color: var(--text-secondary);">Guide your team through the building. Arrow keys or WASD to move.</p>
      </div>
      <div class="ability-panel" id="navigator-ability">
        <button id="peek-btn" class="ability-btn">
          <span class="ability-icon">👁️</span>
          <span class="ability-name">PEEK</span>
          <span class="ability-status">Ready</span>
        </button>
      </div>
      <div class="game-stats" id="navigator-stats"></div>
    `;

        // Bind ability button
        document.getElementById('peek-btn').addEventListener('click', () => {
            gameClient.useAbility('peek');
        });
    }

    render(state) {
        if (!state || !state.map) return;

        const canvasContainer = document.getElementById('navigator-canvas');
        if (!canvasContainer) return;

        const { map, player, entry, exit, pingedLoot, ability } = state;
        const width = map.width * this.CELL_SIZE;
        const height = map.height * this.CELL_SIZE;

        canvasContainer.innerHTML = '';
        const svg = renderer.createSVG(width, height, 'navigator-svg');

        // Render grid
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const cellType = map.cells[y][x];
                const color = renderer.getCellColor(cellType);

                const rect = renderer.createRect(
                    x * this.CELL_SIZE,
                    y * this.CELL_SIZE,
                    this.CELL_SIZE - 1,
                    this.CELL_SIZE - 1,
                    '',
                    color
                );

                if (cellType === 2) rect.setAttribute('rx', '4');
                svg.appendChild(rect);

                // Labels
                if (cellType === 3) {
                    const text = renderer.createText(
                        x * this.CELL_SIZE + this.CELL_SIZE / 2,
                        y * this.CELL_SIZE + this.CELL_SIZE / 2,
                        'IN', '', '#1a1a25'
                    );
                    text.style.fontSize = '10px';
                    text.style.fontWeight = 'bold';
                    svg.appendChild(text);
                } else if (cellType === 4) {
                    const text = renderer.createText(
                        x * this.CELL_SIZE + this.CELL_SIZE / 2,
                        y * this.CELL_SIZE + this.CELL_SIZE / 2,
                        'EXIT', '', '#1a1a25'
                    );
                    text.style.fontSize = '8px';
                    text.style.fontWeight = 'bold';
                    svg.appendChild(text);
                }
            }
        }

        // Render pinged loot (from Loot Master ability)
        if (pingedLoot && pingedLoot.length > 0) {
            pingedLoot.forEach(loot => {
                const pingCircle = renderer.createCircle(
                    loot.x * this.CELL_SIZE + this.CELL_SIZE / 2,
                    loot.y * this.CELL_SIZE + this.CELL_SIZE / 2,
                    this.CELL_SIZE / 2 + 4,
                    'ping-indicator',
                    'rgba(251, 191, 36, 0.3)'
                );
                pingCircle.style.animation = 'ping-pulse 1s infinite';
                svg.appendChild(pingCircle);

                const lootIcon = renderer.createText(
                    loot.x * this.CELL_SIZE + this.CELL_SIZE / 2,
                    loot.y * this.CELL_SIZE + this.CELL_SIZE / 2,
                    '💎', 'pinged-loot'
                );
                lootIcon.style.fontSize = '14px';
                svg.appendChild(lootIcon);
            });
        }

        // Render player
        const playerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        const pulse = renderer.createCircle(
            player.x * this.CELL_SIZE + this.CELL_SIZE / 2,
            player.y * this.CELL_SIZE + this.CELL_SIZE / 2,
            this.CELL_SIZE / 2,
            'player-pulse',
            'rgba(251, 191, 36, 0.3)'
        );
        pulse.style.animation = 'pulse 1.5s infinite';

        const playerCircle = renderer.createCircle(
            player.x * this.CELL_SIZE + this.CELL_SIZE / 2,
            player.y * this.CELL_SIZE + this.CELL_SIZE / 2,
            this.CELL_SIZE / 3,
            'player',
            '#fbbf24'
        );

        const playerIcon = renderer.createText(
            player.x * this.CELL_SIZE + this.CELL_SIZE / 2,
            player.y * this.CELL_SIZE + this.CELL_SIZE / 2,
            '🥷', 'player-icon'
        );
        playerIcon.style.fontSize = '16px';

        playerGroup.appendChild(pulse);
        playerGroup.appendChild(playerCircle);
        playerGroup.appendChild(playerIcon);
        svg.appendChild(playerGroup);

        // CSS animations
        const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.1; }
      }
      @keyframes ping-pulse {
        0%, 100% { opacity: 0.5; transform-origin: center; transform: scale(1); }
        50% { opacity: 0.2; transform: scale(1.2); }
      }
    `;
        svg.appendChild(style);

        canvasContainer.appendChild(svg);

        // Update stats
        this.updateStats(state);

        // Update ability button
        this.updateAbilityButton(ability);

        // Process sound events
        if (state.soundEvents) {
            audioManager.processSoundEvents(state.soundEvents);
        }
    }

    updateStats(state) {
        const stats = document.getElementById('navigator-stats');
        if (!stats) return;

        stats.innerHTML = `
      <div class="stat-row">
        <span class="stat-label">💰 Score:</span>
        <span class="stat-value" style="color: var(--accent-yellow);">$${state.score || 0}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">💎 Loot:</span>
        <span class="stat-value">${state.collectedCount || 0}/${state.totalLoot || 0}</span>
      </div>
    `;
    }

    updateAbilityButton(ability) {
        const btn = document.getElementById('peek-btn');
        if (!btn || !ability || !ability.peek) return;

        const status = btn.querySelector('.ability-status');

        if (ability.peek.active) {
            btn.classList.add('active');
            btn.disabled = true;
            status.textContent = `Active: ${ability.peek.activeRemaining}s`;
        } else if (ability.peek.available) {
            btn.classList.remove('active', 'cooldown');
            btn.disabled = false;
            status.textContent = 'Ready';
        } else {
            btn.classList.add('cooldown');
            btn.disabled = true;
            status.textContent = `Cooldown: ${ability.peek.cooldownRemaining}s`;
        }
    }
}

const navigatorView = new NavigatorView();

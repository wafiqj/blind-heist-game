/**
 * Blind Heist - Loot Master Role View
 * Enhanced with Ping Loot ability
 */

class LootMasterView {
  constructor() {
    this.container = null;
    this.CELL_SIZE = 32;
    this.selectedLoot = null;
    this.dropdownInitialized = false;

    this.lootIcons = {
      diamond: '💎',
      gold: '🪙',
      cash: '💵',
      artifact: '🏺',
      jewel: '💍'
    };

    this.lootColors = {
      diamond: { fill: '#60a5fa', stroke: '#93c5fd' },
      gold: { fill: '#fbbf24', stroke: '#fcd34d' },
      cash: { fill: '#4ade80', stroke: '#86efac' },
      artifact: { fill: '#a855f7', stroke: '#c084fc' },
      jewel: { fill: '#f472b6', stroke: '#f9a8d4' }
    };
  }

  init(container) {
    this.container = container;
    this.selectedLoot = null;
    this.dropdownInitialized = false;

    this.container.innerHTML = `
      <div class="game-canvas-container lootmaster-view">
        <div id="lootmaster-canvas"></div>
      </div>
      <div class="lootmaster-info" style="text-align: center; margin-top: 1rem;">
        <p>💎 You are the <strong style="color: var(--lootmaster-color);">Loot Master</strong></p>
        <p style="font-size: 0.875rem; color: var(--text-secondary);">Guide your team to the valuables!</p>
      </div>
      <div class="ability-panel" id="lootmaster-ability">
        <div class="loot-select" id="loot-select"></div>
        <button id="ping-loot-btn" class="ability-btn" disabled>
          <span class="ability-icon">📍</span>
          <span class="ability-name">PING LOOT</span>
          <span class="ability-status">Select loot to ping</span>
        </button>
      </div>
      <div id="loot-summary" class="loot-summary" style="margin-top: 1rem;"></div>
    `;

    document.getElementById('ping-loot-btn').addEventListener('click', () => {
      if (this.selectedLoot !== null) {
        gameClient.useAbility('pingLoot', { lootId: this.selectedLoot });
        this.selectedLoot = null;
        // Reset dropdown after use
        const dropdown = document.getElementById('loot-dropdown');
        if (dropdown) dropdown.value = '';
      }
    });
  }

  render(state) {
    if (!state || !state.loot) return;

    const canvasContainer = document.getElementById('lootmaster-canvas');
    if (!canvasContainer) return;

    const { loot, collectedLoot, mapSize, score, ability } = state;
    const width = mapSize.width * this.CELL_SIZE;
    const height = mapSize.height * this.CELL_SIZE;

    canvasContainer.innerHTML = '';
    const svg = renderer.createSVG(width, height, 'lootmaster-svg');

    // Background
    const bg = renderer.createRect(0, 0, width, height, '', '#0a0a08');
    svg.appendChild(bg);

    // Grid
    for (let x = 0; x <= mapSize.width; x++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x * this.CELL_SIZE);
      line.setAttribute('y1', 0);
      line.setAttribute('x2', x * this.CELL_SIZE);
      line.setAttribute('y2', height);
      line.setAttribute('stroke', '#1a1a14');
      svg.appendChild(line);
    }
    for (let y = 0; y <= mapSize.height; y++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 0);
      line.setAttribute('y1', y * this.CELL_SIZE);
      line.setAttribute('x2', width);
      line.setAttribute('y2', y * this.CELL_SIZE);
      line.setAttribute('stroke', '#1a1a14');
      svg.appendChild(line);
    }

    // Draw loot items
    loot.forEach((item, index) => {
      this.drawLootItem(svg, item, index);
    });

    canvasContainer.appendChild(svg);

    this.updateSummary(loot, collectedLoot, score);
    this.updateLootSelector(loot, ability);

    if (state.soundEvents) {
      audioManager.processSoundEvents(state.soundEvents);
    }
  }

  drawLootItem(svg, item, index) {
    const cx = item.x * this.CELL_SIZE + this.CELL_SIZE / 2;
    const cy = item.y * this.CELL_SIZE + this.CELL_SIZE / 2;
    const colors = this.lootColors[item.type] || { fill: '#fff', stroke: '#ccc' };

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    if (item.collected) {
      group.setAttribute('class', 'loot-collected');
      group.style.opacity = '0.3';
    }

    // Glow for uncollected
    if (!item.collected) {
      const glow = renderer.createCircle(cx, cy, this.CELL_SIZE / 2, 'loot-glow');
      glow.setAttribute('fill', `${colors.fill}33`);
      group.appendChild(glow);
    }

    // Ping indicator
    if (item.pinged) {
      const pingRing = renderer.createCircle(cx, cy, this.CELL_SIZE / 2 + 6, 'ping-ring');
      pingRing.setAttribute('fill', 'none');
      pingRing.setAttribute('stroke', '#22c55e');
      pingRing.setAttribute('stroke-width', '3');
      pingRing.style.animation = 'ping-pulse 1s infinite';
      group.appendChild(pingRing);
    }

    // Loot circle
    const circle = renderer.createCircle(cx, cy, this.CELL_SIZE / 3, '', colors.fill);
    circle.setAttribute('stroke', colors.stroke);
    circle.setAttribute('stroke-width', '2');
    group.appendChild(circle);

    // Icon
    const icon = renderer.createText(cx, cy, this.lootIcons[item.type], '');
    icon.style.fontSize = '14px';
    group.appendChild(icon);

    // Value
    const valueLabel = renderer.createText(cx, cy + this.CELL_SIZE / 2 + 8, `$${item.value}`, '', item.collected ? '#555' : colors.stroke);
    valueLabel.style.fontSize = '10px';
    valueLabel.style.fontWeight = 'bold';
    group.appendChild(valueLabel);

    // Position
    const posLabel = renderer.createText(cx, cy - this.CELL_SIZE / 2 - 5, `(${item.x},${item.y})`, '', '#666');
    posLabel.style.fontSize = '8px';
    group.appendChild(posLabel);

    svg.appendChild(group);

    if (item.collected) {
      const checkmark = renderer.createText(cx, cy, '✓', '', '#22c55e');
      checkmark.style.fontSize = '20px';
      checkmark.style.fontWeight = 'bold';
      svg.appendChild(checkmark);
    }
  }

  updateSummary(loot, collectedLoot, score) {
    const summary = document.getElementById('loot-summary');
    if (!summary) return;

    const uncollected = loot.filter(l => !l.collected);

    summary.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; max-width: 400px; margin: 0 auto;">
        <div style="background: var(--bg-surface); padding: 1rem; border-radius: 8px; text-align: center;">
          <div style="color: var(--text-muted); font-size: 0.75rem;">Collected</div>
          <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-green);">
            ${collectedLoot.length}/${loot.length}
          </div>
        </div>
        <div style="background: var(--bg-surface); padding: 1rem; border-radius: 8px; text-align: center;">
          <div style="color: var(--text-muted); font-size: 0.75rem;">Score</div>
          <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-yellow);">
            $${score || 0}
          </div>
        </div>
      </div>
      <div style="margin-top: 1rem; text-align: center;">
        ${uncollected.length === 0 ?
        '<span style="color: var(--accent-green); font-weight: bold;">🎉 All loot collected! Head to EXIT!</span>' :
        `<span style="color: var(--text-muted);">Remaining: ${uncollected.map(l => this.lootIcons[l.type]).join(' ')}</span>`
      }
      </div>
    `;
  }

  updateLootSelector(loot, ability) {
    const selectContainer = document.getElementById('loot-select');
    const btn = document.getElementById('ping-loot-btn');
    if (!selectContainer || !btn) return;

    // Check if dropdown already exists
    let dropdown = document.getElementById('loot-dropdown');

    // Only create dropdown if it doesn't exist
    if (!dropdown) {
      selectContainer.innerHTML = `
        <select id="loot-dropdown" class="loot-dropdown">
          <option value="">Select Loot to Ping</option>
          ${loot.map((item, i) =>
        `<option value="${i}" ${item.collected || item.pinged ? 'disabled' : ''}>
              ${this.lootIcons[item.type]} ${item.type} at (${item.x},${item.y}) - $${item.value}
              ${item.collected ? '(Collected)' : item.pinged ? '(Pinged)' : ''}
            </option>`
      ).join('')}
        </select>
      `;

      dropdown = document.getElementById('loot-dropdown');
      dropdown.addEventListener('change', (e) => {
        this.selectedLoot = e.target.value !== '' ? parseInt(e.target.value) : null;
        this.updateButtonState(ability);
      });
    } else {
      // Update options without recreating dropdown
      const currentValue = dropdown.value;

      // Update disabled states on existing options
      loot.forEach((item, i) => {
        const option = dropdown.querySelector(`option[value="${i}"]`);
        if (option) {
          option.disabled = item.collected || item.pinged;
          option.textContent = `${this.lootIcons[item.type]} ${item.type} at (${item.x},${item.y}) - $${item.value} ${item.collected ? '(Collected)' : item.pinged ? '(Pinged)' : ''}`;
        }
      });

      // If selected loot was collected or pinged, reset selection
      if (this.selectedLoot !== null) {
        const selectedItem = loot[this.selectedLoot];
        if (selectedItem && (selectedItem.collected || selectedItem.pinged)) {
          this.selectedLoot = null;
          dropdown.value = '';
        } else {
          dropdown.value = currentValue;
        }
      }
    }

    // Update button state
    this.updateButtonState(ability);
  }

  updateButtonState(ability) {
    const btn = document.getElementById('ping-loot-btn');
    if (!btn) return;

    const status = btn.querySelector('.ability-status');
    if (ability?.pingLoot) {
      if (ability.pingLoot.available) {
        btn.classList.remove('cooldown');
        status.textContent = this.selectedLoot !== null ? 'Ready' : 'Select loot to ping';
        btn.disabled = this.selectedLoot === null;
      } else {
        btn.classList.add('cooldown');
        btn.disabled = true;
        status.textContent = `Cooldown: ${ability.pingLoot.cooldownRemaining}s`;
      }
    }
  }
}

const lootMasterView = new LootMasterView();

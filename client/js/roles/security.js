/**
 * Blind Heist - Security Role View
 * Enhanced with camera disable ability and rotating camera visualization
 */

class SecurityView {
  constructor() {
    this.container = null;
    this.CELL_SIZE = 32;
    this.selectedCamera = null;
    this.dropdownInitialized = false;
  }

  init(container) {
    this.container = container;
    this.selectedCamera = null;
    this.dropdownInitialized = false;

    this.container.innerHTML = `
      <div class="game-canvas-container security-view">
        <div id="security-canvas"></div>
      </div>
      <div class="security-info" style="text-align: center; margin-top: 1rem;">
        <p>📹 You are the <strong style="color: var(--security-color);">Security Monitor</strong></p>
        <p style="font-size: 0.875rem; color: var(--text-secondary);">Watch the cameras and warn your team about dangerous zones!</p>
      </div>
      <div class="ability-panel" id="security-ability">
        <div class="camera-select" id="camera-select"></div>
        <button id="disable-camera-btn" class="ability-btn" disabled>
          <span class="ability-icon">🔇</span>
          <span class="ability-name">DISABLE CAMERA</span>
          <span class="ability-status">Select a camera</span>
        </button>
      </div>
      <div class="camera-legend" style="display: flex; justify-content: center; gap: 1rem; margin-top: 1rem; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 12px; height: 12px; background: var(--security-color); border-radius: 50%;"></div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Active Camera</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 12px; height: 12px; background: #666; border-radius: 50%;"></div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Disabled</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 12px; height: 12px; background: rgba(239, 68, 68, 0.3);"></div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Detection Zone</span>
        </div>
      </div>
    `;

    document.getElementById('disable-camera-btn').addEventListener('click', () => {
      if (this.selectedCamera !== null) {
        gameClient.useAbility('disableCamera', { cameraId: this.selectedCamera });
        this.selectedCamera = null;
        // Reset dropdown after use
        const dropdown = document.getElementById('camera-dropdown');
        if (dropdown) dropdown.value = '';
      }
    });
  }

  render(state) {
    if (!state || !state.cameras) return;

    const canvasContainer = document.getElementById('security-canvas');
    if (!canvasContainer) return;

    const { cameras, mapSize, ability } = state;
    const width = mapSize.width * this.CELL_SIZE;
    const height = mapSize.height * this.CELL_SIZE;

    canvasContainer.innerHTML = '';
    const svg = renderer.createSVG(width, height, 'security-svg');

    // Dark background
    const bg = renderer.createRect(0, 0, width, height, '', '#0a0808');
    svg.appendChild(bg);

    // Grid lines
    for (let x = 0; x <= mapSize.width; x++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x * this.CELL_SIZE);
      line.setAttribute('y1', 0);
      line.setAttribute('x2', x * this.CELL_SIZE);
      line.setAttribute('y2', height);
      line.setAttribute('stroke', '#1a1a1a');
      svg.appendChild(line);
    }
    for (let y = 0; y <= mapSize.height; y++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 0);
      line.setAttribute('y1', y * this.CELL_SIZE);
      line.setAttribute('x2', width);
      line.setAttribute('y2', y * this.CELL_SIZE);
      line.setAttribute('stroke', '#1a1a1a');
      svg.appendChild(line);
    }

    // Draw cameras
    cameras.forEach((camera, index) => {
      this.drawCamera(svg, camera, index);
    });

    canvasContainer.appendChild(svg);

    // Update camera selector (without recreating if open)
    this.updateCameraSelector(cameras, ability);

    // Process sound events
    if (state.soundEvents) {
      audioManager.processSoundEvents(state.soundEvents);
    }
  }

  drawCamera(svg, camera, index) {
    const cx = camera.x * this.CELL_SIZE + this.CELL_SIZE / 2;
    const cy = camera.y * this.CELL_SIZE + this.CELL_SIZE / 2;
    const range = camera.fovRange * this.CELL_SIZE;
    const halfFov = (camera.fovAngle / 2) * (Math.PI / 180);
    const angle = camera.currentAngle * (Math.PI / 180);
    const isDisabled = camera.disabled;

    // FOV cone points
    const x1 = cx + range * Math.cos(angle - halfFov);
    const y1 = cy + range * Math.sin(angle - halfFov);
    const x2 = cx + range * Math.cos(angle + halfFov);
    const y2 = cy + range * Math.sin(angle + halfFov);

    if (!isDisabled) {
      // FOV cone
      const fovPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const largeArc = camera.fovAngle > 180 ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${range} ${range} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      fovPath.setAttribute('d', d);
      fovPath.setAttribute('fill', 'rgba(239, 68, 68, 0.2)');
      fovPath.setAttribute('stroke', 'var(--security-color)');
      fovPath.setAttribute('stroke-width', '1');
      fovPath.setAttribute('stroke-dasharray', '4,4');
      svg.appendChild(fovPath);

      // Direction line
      const dirX = cx + 20 * Math.cos(angle);
      const dirY = cy + 20 * Math.sin(angle);
      const dirLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      dirLine.setAttribute('x1', cx);
      dirLine.setAttribute('y1', cy);
      dirLine.setAttribute('x2', dirX);
      dirLine.setAttribute('y2', dirY);
      dirLine.setAttribute('stroke', 'var(--security-color)');
      dirLine.setAttribute('stroke-width', '2');
      svg.appendChild(dirLine);
    }

    // Camera body
    const cameraBody = renderer.createRect(cx - 8, cy - 6, 16, 12, 'camera-body', isDisabled ? '#444' : '#333');
    cameraBody.setAttribute('rx', '2');
    cameraBody.setAttribute('stroke', isDisabled ? '#666' : 'var(--security-color)');
    cameraBody.setAttribute('stroke-width', '2');
    svg.appendChild(cameraBody);

    // Camera lens
    const lens = renderer.createCircle(cx, cy, 4, 'camera-lens', isDisabled ? '#666' : 'var(--security-color)');
    svg.appendChild(lens);

    // Camera label
    const label = renderer.createText(cx, cy - 16, `CAM ${index + 1}`, '', isDisabled ? '#666' : 'var(--security-color)');
    label.style.fontSize = '10px';
    label.style.fontWeight = 'bold';
    svg.appendChild(label);

    // Rotating indicator
    if (camera.rotates && !isDisabled) {
      const rotateIcon = renderer.createText(cx + 12, cy - 16, '↻', '', 'var(--accent-yellow)');
      rotateIcon.style.fontSize = '10px';
      svg.appendChild(rotateIcon);
    }

    // Disabled indicator
    if (isDisabled) {
      const disabledText = renderer.createText(cx, cy + 20, 'DISABLED', '', '#ef4444');
      disabledText.style.fontSize = '8px';
      disabledText.style.fontWeight = 'bold';
      svg.appendChild(disabledText);
    }
  }

  updateCameraSelector(cameras, ability) {
    const selectContainer = document.getElementById('camera-select');
    const btn = document.getElementById('disable-camera-btn');
    if (!selectContainer || !btn) return;

    // Check if dropdown already exists
    let dropdown = document.getElementById('camera-dropdown');

    // Only create dropdown if it doesn't exist
    if (!dropdown) {
      selectContainer.innerHTML = `
        <select id="camera-dropdown" class="camera-dropdown">
          <option value="">Select Camera to Disable</option>
          ${cameras.map((cam, i) =>
        `<option value="${i}" ${cam.disabled ? 'disabled' : ''}>
              Camera ${i + 1} ${cam.disabled ? '(Disabled)' : cam.rotates ? '(Rotating)' : '(Static)'}
            </option>`
      ).join('')}
        </select>
      `;

      dropdown = document.getElementById('camera-dropdown');
      dropdown.addEventListener('change', (e) => {
        this.selectedCamera = e.target.value !== '' ? parseInt(e.target.value) : null;
        this.updateButtonState(ability);
      });
    } else {
      // Update options without recreating dropdown
      const currentValue = dropdown.value;

      // Update disabled states on existing options
      cameras.forEach((cam, i) => {
        const option = dropdown.querySelector(`option[value="${i}"]`);
        if (option) {
          option.disabled = cam.disabled;
          option.textContent = `Camera ${i + 1} ${cam.disabled ? '(Disabled)' : cam.rotates ? '(Rotating)' : '(Static)'}`;
        }
      });

      // Restore selection
      dropdown.value = currentValue;
    }

    // Update button state
    this.updateButtonState(ability);
  }

  updateButtonState(ability) {
    const btn = document.getElementById('disable-camera-btn');
    if (!btn) return;

    const status = btn.querySelector('.ability-status');
    if (ability?.disableCamera) {
      if (ability.disableCamera.available) {
        btn.classList.remove('cooldown');
        status.textContent = this.selectedCamera !== null ? 'Ready' : 'Select a camera';
        btn.disabled = this.selectedCamera === null;
      } else {
        btn.classList.add('cooldown');
        btn.disabled = true;
        status.textContent = `Cooldown: ${ability.disableCamera.cooldownRemaining}s`;
      }
    }
  }
}

const securityView = new SecurityView();

/**
 * Blind Heist - Alarm Controller Role View
 * Enhanced with Silence Alarm ability
 */

class AlarmControllerView {
  constructor() {
    this.container = null;
  }

  init(container) {
    this.container = container;
    this.container.innerHTML = `
      <div class="alarm-view">
        <div class="alarm-controller-header" style="text-align: center; margin-bottom: 1rem;">
          <p>🚨 You are the <strong style="color: var(--alarmcontroller-color);">Alarm Controller</strong></p>
          <p style="font-size: 0.875rem; color: var(--text-muted);">Monitor the alarm and warn your team about danger!</p>
        </div>
        
        <div class="countdown-display">
          <div class="countdown-label">⏱️ Time Remaining</div>
          <div id="countdown-value" class="countdown-value">3:00</div>
        </div>
        
        <div class="alarm-meter">
          <div class="alarm-meter-label">🔔 Alarm Level</div>
          <div class="alarm-meter-bar">
            <div id="alarm-meter-fill" class="alarm-meter-fill" style="width: 0%;"></div>
          </div>
          <div id="alarm-meter-value" class="alarm-meter-value alarm-low">0%</div>
        </div>
        
        <div class="ability-panel" id="alarm-ability">
          <button id="silence-alarm-btn" class="ability-btn">
            <span class="ability-icon">🔇</span>
            <span class="ability-name">SILENCE ALARM</span>
            <span class="ability-status">Ready (-25%)</span>
          </button>
        </div>
        
        <div class="stats-panel" id="alarm-stats" style="margin-top: 1rem;"></div>
        
        <div class="events-panel">
          <h3>📋 Security Events</h3>
          <div id="events-list" class="events-list">
            <div class="event-item info">Waiting for game to start...</div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('silence-alarm-btn').addEventListener('click', () => {
      gameClient.useAbility('silenceAlarm');
    });

    this.addShakeAnimation();
  }

  render(state) {
    if (!state || !state.alarm) return;

    const { alarm, events, stats, ability } = state;

    this.updateCountdown(alarm.countdown);
    this.updateAlarmMeter(alarm.level);
    this.updateEvents(events);
    this.updateStats(stats, alarm);
    this.updateAbilityButton(ability, alarm.level);

    if (state.soundEvents) {
      audioManager.processSoundEvents(state.soundEvents);
    }
  }

  updateCountdown(seconds) {
    const countdownEl = document.getElementById('countdown-value');
    if (!countdownEl) return;

    const formatted = renderer.formatTime(seconds);
    countdownEl.textContent = formatted;

    if (seconds <= 30) {
      countdownEl.classList.add('urgent');
    } else {
      countdownEl.classList.remove('urgent');
    }
  }

  updateAlarmMeter(level) {
    const fillEl = document.getElementById('alarm-meter-fill');
    const valueEl = document.getElementById('alarm-meter-value');
    if (!fillEl || !valueEl) return;

    fillEl.style.width = `${level}%`;
    valueEl.textContent = `${Math.round(level)}%`;
    valueEl.className = 'alarm-meter-value ' + renderer.getAlarmClass(level);

    if (level >= 80) {
      fillEl.style.animation = 'shake 0.5s infinite';
    } else {
      fillEl.style.animation = 'none';
    }
  }

  updateStats(stats, alarm) {
    const statsEl = document.getElementById('alarm-stats');
    if (!statsEl || !stats) return;

    statsEl.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.875rem;">
        <div style="background: var(--bg-surface); padding: 0.5rem; border-radius: 4px; text-align: center;">
          <div style="color: var(--text-muted); font-size: 0.7rem;">Detections</div>
          <div style="color: ${stats.timesDetected > 3 ? 'var(--accent-red)' : 'var(--text-primary)'}; font-weight: bold;">
            ${stats.timesDetected}
          </div>
        </div>
        <div style="background: var(--bg-surface); padding: 0.5rem; border-radius: 4px; text-align: center;">
          <div style="color: var(--text-muted); font-size: 0.7rem;">Peak Alarm</div>
          <div style="color: ${stats.peakAlarm > 70 ? 'var(--accent-red)' : 'var(--accent-yellow)'}; font-weight: bold;">
            ${Math.round(stats.peakAlarm)}%
          </div>
        </div>
        <div style="background: var(--bg-surface); padding: 0.5rem; border-radius: 4px; text-align: center;">
          <div style="color: var(--text-muted); font-size: 0.7rem;">Close Calls</div>
          <div style="color: var(--accent-green); font-weight: bold;">
            ${stats.closeCallCount}
          </div>
        </div>
        <div style="background: var(--bg-surface); padding: 0.5rem; border-radius: 4px; text-align: center;">
          <div style="color: var(--text-muted); font-size: 0.7rem;">Danger Level</div>
          <div style="font-weight: bold; color: ${this.getDangerColor(alarm.level)};">
            ${this.getDangerText(alarm.level)}
          </div>
        </div>
      </div>
    `;
  }

  getDangerText(level) {
    if (level < 25) return 'LOW';
    if (level < 50) return 'MEDIUM';
    if (level < 75) return 'HIGH';
    return 'CRITICAL';
  }

  getDangerColor(level) {
    if (level < 25) return 'var(--accent-green)';
    if (level < 50) return 'var(--accent-yellow)';
    if (level < 75) return '#f97316';
    return 'var(--accent-red)';
  }

  updateEvents(events) {
    const listEl = document.getElementById('events-list');
    if (!listEl) return;

    if (!events || events.length === 0) {
      listEl.innerHTML = '<div class="event-item info">No events yet...</div>';
      return;
    }

    const sortedEvents = [...events].reverse();

    listEl.innerHTML = sortedEvents.map(event => `
      <div class="event-item ${event.type}">
        <span class="event-time" style="opacity: 0.6; font-size: 0.75rem;">
          [${this.formatEventTime(event.timestamp)}]
        </span>
        ${event.message}
      </div>
    `).join('');

    listEl.scrollTop = 0;
  }

  updateAbilityButton(ability, alarmLevel) {
    const btn = document.getElementById('silence-alarm-btn');
    if (!btn || !ability || !ability.silenceAlarm) return;

    const status = btn.querySelector('.ability-status');

    if (ability.silenceAlarm.available) {
      btn.classList.remove('cooldown');
      btn.disabled = alarmLevel < 5; // Don't allow if alarm too low
      status.textContent = alarmLevel < 5 ? 'Alarm too low' : 'Ready (-25%)';
    } else {
      btn.classList.add('cooldown');
      btn.disabled = true;
      status.textContent = `Cooldown: ${ability.silenceAlarm.cooldownRemaining}s`;
    }
  }

  formatEventTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  addShakeAnimation() {
    if (!document.getElementById('alarm-shake-style')) {
      const style = document.createElement('style');
      style.id = 'alarm-shake-style';
      style.textContent = `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

const alarmControllerView = new AlarmControllerView();

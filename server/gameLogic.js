/**
 * Game Logic - Core mechanics for the heist game
 * Enhanced with rotating cameras, escalating difficulty, and close calls
 */

class GameLogic {
    constructor(gameState) {
        this.state = gameState;
        this.tickInterval = null;
        this.onStateChange = null;
    }

    /**
     * Start the game loop
     */
    start(onStateChange) {
        this.onStateChange = onStateChange;
        this.state.status = 'playing';
        this.state.addEvent('info', `🎭 Heist started on ${this.state.map.name}!`);
        this.state.addEvent('info', `Difficulty: ${this.state.difficulty.toUpperCase()}`);
        this.state.addSoundEvent('game_start');

        // Game tick every 500ms
        this.tickInterval = setInterval(() => this.tick(), 500);
    }

    /**
     * Stop the game loop
     */
    stop() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }

    /**
     * Main game tick
     */
    tick() {
        if (this.state.status !== 'playing') {
            this.stop();
            return;
        }

        this.state.tick++;
        const now = Date.now();

        // Update cameras (rotation)
        this.updateCameras(now);

        // Decrease countdown (every second = 2 ticks)
        if (this.state.tick % 2 === 0) {
            this.state.alarm.countdown--;

            if (this.state.alarm.countdown <= 0) {
                this.triggerLose('Time ran out!');
                return;
            }

            // Warning events with escalating urgency
            this.checkTimeWarnings();
        }

        // Check camera detection
        this.checkCameraDetection(now);

        // Random alarm spike based on difficulty
        if (Math.random() < this.state.diffSettings.alarmSpikeFq) {
            this.randomAlarmSpike();
        }

        // Natural alarm decay
        if (this.state.tick % 4 === 0 && this.state.alarm.level > 0) {
            this.state.alarm.level = Math.max(0, this.state.alarm.level - this.state.diffSettings.alarmDecay);
        }

        // Track peak alarm
        if (this.state.alarm.level > this.state.stats.peakAlarm) {
            this.state.stats.peakAlarm = this.state.alarm.level;
        }

        // Check win/lose conditions
        this.checkWinLose();

        // Escalate difficulty over time
        this.escalateDifficulty();

        // Notify state change
        if (this.onStateChange) {
            this.onStateChange();
        }
    }

    /**
     * Update rotating cameras
     */
    updateCameras(now) {
        for (const camera of this.state.cameras) {
            // Skip disabled cameras
            if (camera.disabled && camera.disabledUntil > now) {
                continue;
            } else if (camera.disabled && camera.disabledUntil <= now) {
                camera.disabled = false;
            }

            // Rotate cameras that should rotate
            if (camera.rotates && camera.rotationSpeed > 0) {
                camera.currentAngle += camera.rotationSpeed * camera.rotationDirection * 0.5; // Per tick

                // Bounce at limits
                if (camera.currentAngle >= camera.maxAngle) {
                    camera.currentAngle = camera.maxAngle;
                    camera.rotationDirection = -1;
                } else if (camera.currentAngle <= camera.minAngle) {
                    camera.currentAngle = camera.minAngle;
                    camera.rotationDirection = 1;
                }

                // Normalize angle
                while (camera.currentAngle < 0) camera.currentAngle += 360;
                while (camera.currentAngle >= 360) camera.currentAngle -= 360;
            }
        }
    }

    /**
     * Check time warnings
     */
    checkTimeWarnings() {
        const countdown = this.state.alarm.countdown;

        if (countdown === 60) {
            this.state.addEvent('warning', '⏱️ 60 seconds remaining!');
            this.state.addSoundEvent('warning');
        } else if (countdown === 30) {
            this.state.addEvent('danger', '⚠️ 30 seconds remaining!');
            this.state.addSoundEvent('warning_urgent');
        } else if (countdown === 10) {
            this.state.addEvent('danger', '🚨 FINAL 10 SECONDS!');
            this.state.addSoundEvent('alarm_critical');
        }
    }

    /**
     * Move player in a direction
     */
    movePlayer(direction) {
        if (this.state.status !== 'playing') return false;

        const { x, y } = this.state.player;
        let newX = x;
        let newY = y;

        switch (direction) {
            case 'up': newY = y - 1; break;
            case 'down': newY = y + 1; break;
            case 'left': newX = x - 1; break;
            case 'right': newX = x + 1; break;
            default: return false;
        }

        if (!this.state.isWalkable(newX, newY)) {
            this.state.addSoundEvent('bump');
            return false;
        }

        this.state.player.x = newX;
        this.state.player.y = newY;
        this.state.stats.movementCount++;
        this.state.addSoundEvent('footstep');

        // Check for loot pickup
        this.checkLootPickup();

        if (this.onStateChange) {
            this.onStateChange();
        }

        return true;
    }

    /**
     * Check if player is in camera FOV and increase alarm
     */
    checkCameraDetection(now) {
        const { x: px, y: py } = this.state.player;
        let wasDetected = false;
        let closeCall = false;

        for (const camera of this.state.cameras) {
            // Skip disabled cameras
            if (camera.disabled && camera.disabledUntil > now) {
                continue;
            }

            const inFOV = this.isInCameraFOV(px, py, camera);
            const nearFOV = this.isNearCameraFOV(px, py, camera);

            if (inFOV) {
                wasDetected = true;
                const increase = this.state.diffSettings.cameraDetect;
                this.state.alarm.level = Math.min(
                    this.state.alarm.maxLevel,
                    this.state.alarm.level + increase
                );

                this.state.addEvent('danger', `🚨 Camera ${camera.id + 1} detected movement!`);
                this.state.addSoundEvent('detected');
                this.state.stats.timesDetected++;

                if (this.state.alarm.level >= this.state.alarm.maxLevel) {
                    this.triggerLose('Alarm reached maximum! Security arrived!');
                    return;
                }
                break;
            } else if (nearFOV) {
                closeCall = true;
            }
        }

        // Close call feedback (tension builder)
        if (closeCall && !wasDetected && Math.random() < 0.3) {
            this.state.addEvent('warning', '😰 Close call! Camera almost spotted you!');
            this.state.addSoundEvent('close_call');
            this.state.stats.closeCallCount++;
        }
    }

    /**
     * Check if a point is within camera FOV
     */
    isInCameraFOV(px, py, camera) {
        const dx = px - camera.x;
        const dy = py - camera.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > camera.fovRange || distance === 0) {
            return false;
        }

        let angleToPlayer = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angleToPlayer < 0) angleToPlayer += 360;

        const halfFov = camera.fovAngle / 2;
        let angleDiff = Math.abs(camera.currentAngle - angleToPlayer);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        return angleDiff <= halfFov;
    }

    /**
     * Check if player is near camera FOV (for close call detection)
     */
    isNearCameraFOV(px, py, camera) {
        const dx = px - camera.x;
        const dy = py - camera.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Within extended range?
        if (distance > camera.fovRange + 1 || distance === 0) {
            return false;
        }

        let angleToPlayer = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angleToPlayer < 0) angleToPlayer += 360;

        // Extended FOV check
        const extendedHalfFov = (camera.fovAngle / 2) + 15;
        let angleDiff = Math.abs(camera.currentAngle - angleToPlayer);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        return angleDiff <= extendedHalfFov && angleDiff > camera.fovAngle / 2;
    }

    /**
     * Check for loot pickup at player position
     */
    checkLootPickup() {
        const { x, y } = this.state.player;

        for (const loot of this.state.loot) {
            if (!loot.collected && loot.x === x && loot.y === y) {
                loot.collected = true;
                this.state.collectedLoot.push(loot);
                this.state.score += loot.value;

                this.state.addEvent('success', `💎 Collected ${loot.type}! (+$${loot.value})`);
                this.state.addSoundEvent('loot_pickup');

                // Increase alarm based on difficulty
                const alarmIncrease = this.state.diffSettings.lootAlarm + Math.floor(Math.random() * 5);
                this.state.alarm.level = Math.min(
                    this.state.alarm.maxLevel,
                    this.state.alarm.level + alarmIncrease
                );

                this.state.addEvent('warning', `⚠️ Alarm increased by ${alarmIncrease}%`);
            }
        }
    }

    /**
     * Random alarm spike event
     */
    randomAlarmSpike() {
        const spikeAmount = Math.floor(Math.random() * 8) + 3;
        this.state.alarm.level = Math.min(
            this.state.alarm.maxLevel,
            this.state.alarm.level + spikeAmount
        );

        const messages = [
            '👮 Security patrol passing by...',
            '🔊 Suspicious noise detected!',
            '📡 Motion sensor triggered!',
            '🚶 Guard checking area...',
            '🐀 Rats triggered motion detector!',
            '💨 Ventilation anomaly detected!'
        ];

        this.state.addEvent('warning', messages[Math.floor(Math.random() * messages.length)]);
        this.state.addSoundEvent('alarm_spike');
    }

    /**
     * Escalate difficulty over time
     */
    escalateDifficulty() {
        const timeElapsed = this.state.alarm.startCountdown - this.state.alarm.countdown;

        // Increase camera rotation speed gradually
        if (timeElapsed > 30 && this.state.tick % 60 === 0) {
            for (const camera of this.state.cameras) {
                if (camera.rotates) {
                    camera.rotationSpeed = Math.min(camera.rotationSpeed * 1.05, 60);
                }
            }
        }

        // Increase alarm spike frequency in final minute
        if (this.state.alarm.countdown <= 60 && this.state.tick % 30 === 0) {
            if (Math.random() < 0.3) {
                this.state.addEvent('danger', '🚨 Security on high alert!');
                this.state.addSoundEvent('alert_escalate');
            }
        }
    }

    /**
     * Check win/lose conditions
     */
    checkWinLose() {
        const { x, y } = this.state.player;
        const { exit } = this.state;

        if (x === exit.x && y === exit.y) {
            if (this.state.collectedLoot.length > 0) {
                this.triggerWin();
            } else {
                this.state.addEvent('info', '❌ You need at least one loot item to escape!');
            }
        }

        if (this.state.alarm.level >= this.state.alarm.maxLevel) {
            this.triggerLose('Alarm reached maximum!');
        }
    }

    /**
     * Trigger win condition
     */
    triggerWin() {
        this.state.status = 'won';
        const scoreBreakdown = this.state.calculateFinalScore();
        this.state.finalScore = scoreBreakdown;

        this.state.addEvent('success', `🏆 HEIST SUCCESSFUL!`);
        this.state.addEvent('success', `⭐ Rating: ${'⭐'.repeat(scoreBreakdown.stars)}`);
        this.state.addEvent('success', `💰 Final Score: $${scoreBreakdown.total}`);
        this.state.addSoundEvent('victory');
        this.stop();

        if (this.onStateChange) {
            this.onStateChange();
        }
    }

    /**
     * Trigger lose condition
     */
    triggerLose(reason) {
        this.state.status = 'lost';
        this.state.finalScore = this.state.calculateFinalScore();

        this.state.addEvent('danger', `💀 HEIST FAILED: ${reason}`);
        this.state.addSoundEvent('game_over');
        this.stop();

        if (this.onStateChange) {
            this.onStateChange();
        }
    }
}

module.exports = GameLogic;

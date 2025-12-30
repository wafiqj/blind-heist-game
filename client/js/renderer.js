/**
 * Blind Heist - Base Renderer Utilities
 * Common rendering functions used by role-specific views
 * Mobile-optimized with responsive SVG scaling
 */

class Renderer {
    constructor() {
        this.CELL_SIZE = 32;
        this.CELL_TYPES = {
            FLOOR: 0,
            WALL: 1,
            DOOR: 2,
            ENTRY: 3,
            EXIT: 4
        };
    }

    /**
     * Calculate optimal cell size based on screen dimensions
     */
    getOptimalCellSize(mapWidth, mapHeight) {
        const containerWidth = Math.min(window.innerWidth - 32, 800);
        const containerHeight = Math.min(window.innerHeight * 0.45, 500);

        const cellByWidth = Math.floor(containerWidth / mapWidth);
        const cellByHeight = Math.floor(containerHeight / mapHeight);

        // Use smaller dimension to ensure it fits, but cap it
        const optimal = Math.min(cellByWidth, cellByHeight, 40);
        return Math.max(optimal, 16); // Minimum 16px for visibility
    }

    /**
     * Create an SVG element with responsive viewBox
     */
    createSVG(width, height, className = '') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        // Don't set fixed width/height - let CSS handle responsive scaling
        svg.style.width = '100%';
        svg.style.height = 'auto';
        svg.style.maxHeight = '45vh';
        svg.style.display = 'block';
        if (className) {
            svg.setAttribute('class', className);
        }
        return svg;
    }

    /**
     * Create an SVG rect element
     */
    createRect(x, y, width, height, className = '', fill = '') {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', width);
        rect.setAttribute('height', height);
        if (className) rect.setAttribute('class', className);
        if (fill) rect.setAttribute('fill', fill);
        return rect;
    }

    /**
     * Create an SVG circle element
     */
    createCircle(cx, cy, r, className = '', fill = '') {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', r);
        if (className) circle.setAttribute('class', className);
        if (fill) circle.setAttribute('fill', fill);
        return circle;
    }

    /**
     * Create an SVG polygon element
     */
    createPolygon(points, className = '', fill = '') {
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', points);
        if (className) polygon.setAttribute('class', className);
        if (fill) polygon.setAttribute('fill', fill);
        return polygon;
    }

    /**
     * Create an SVG text element
     */
    createText(x, y, text, className = '', fill = '') {
        const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textEl.setAttribute('x', x);
        textEl.setAttribute('y', y);
        textEl.setAttribute('text-anchor', 'middle');
        textEl.setAttribute('dominant-baseline', 'central');
        textEl.textContent = text;
        if (className) textEl.setAttribute('class', className);
        if (fill) textEl.setAttribute('fill', fill);
        return textEl;
    }

    /**
     * Create an SVG path element
     */
    createPath(d, className = '', fill = '', stroke = '') {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        if (className) path.setAttribute('class', className);
        if (fill) path.setAttribute('fill', fill);
        if (stroke) path.setAttribute('stroke', stroke);
        return path;
    }

    /**
     * Create a container div
     */
    createContainer(className = '') {
        const div = document.createElement('div');
        if (className) div.className = className;
        return div;
    }

    /**
     * Get color for cell type (used by navigator)
     */
    getCellColor(cellType) {
        switch (cellType) {
            case this.CELL_TYPES.FLOOR: return '#1a1a25';
            case this.CELL_TYPES.WALL: return '#3a3a4a';
            case this.CELL_TYPES.DOOR: return '#8b5a2b';
            case this.CELL_TYPES.ENTRY: return '#22c55e';
            case this.CELL_TYPES.EXIT: return '#4a9eff';
            default: return '#1a1a25';
        }
    }

    /**
     * Format time in MM:SS
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Get alarm level class
     */
    getAlarmClass(level) {
        if (level < 33) return 'alarm-low';
        if (level < 66) return 'alarm-medium';
        return 'alarm-high';
    }

    /**
     * Clear a container
     */
    clear(container) {
        container.innerHTML = '';
    }

    /**
     * Detect if on mobile device
     */
    isMobile() {
        return window.innerWidth < 768 ||
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0);
    }

    /**
     * Get compact label for mobile
     */
    getMobileLabel(fullLabel) {
        if (!this.isMobile()) return fullLabel;
        // Shorten labels for mobile
        const shortLabels = {
            'Navigator': 'Nav',
            'Security': 'Sec',
            'Loot Master': 'Loot',
            'Alarm Controller': 'Alarm'
        };
        return shortLabels[fullLabel] || fullLabel;
    }
}

// Global renderer instance
const renderer = new Renderer();

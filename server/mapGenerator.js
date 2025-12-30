/**
 * Map Generator - Creates procedural grid-based maps for heist levels
 * Now with multiple map layouts and difficulty settings
 */

const CELL_TYPES = {
  FLOOR: 0,
  WALL: 1,
  DOOR: 2,
  ENTRY: 3,
  EXIT: 4
};

const MAP_PRESETS = {
  // Map 1: The Bank (Original - Easy)
  bank: {
    name: 'The Bank',
    difficulty: 'easy',
    width: 20,
    height: 15,
    rooms: [
      { x: 1, y: 10, w: 5, h: 4 },   // Entry room
      { x: 13, y: 1, w: 6, h: 5 },   // Vault
      { x: 7, y: 3, w: 5, h: 4 },    // Middle top
      { x: 7, y: 9, w: 6, h: 4 },    // Middle bottom
      { x: 1, y: 2, w: 4, h: 4 }     // Left room
    ],
    corridors: [
      { x1: 5, y1: 12, x2: 7, y2: 12 },
      { x1: 7, y1: 7, x2: 7, y2: 9 },
      { x1: 4, y1: 4, x2: 7, y2: 4 },
      { x1: 12, y1: 5, x2: 12, y2: 9 },
      { x1: 12, y1: 5, x2: 13, y2: 5 },
      { x1: 10, y1: 11, x2: 15, y2: 11 }
    ],
    doors: [
      { x: 6, y: 12 }, { x: 7, y: 7 }, { x: 12, y: 6 }, { x: 13, y: 3 }
    ],
    entry: { x: 2, y: 12 },
    exit: { x: 16, y: 3 },
    cameras: [
      { x: 10, y: 5, direction: 'down', rotates: false },
      { x: 15, y: 2, direction: 'left', rotates: false },
      { x: 5, y: 4, direction: 'right', rotates: false },
      { x: 13, y: 10, direction: 'up', rotates: false }
    ],
    loot: [
      { x: 17, y: 2, type: 'diamond' },
      { x: 15, y: 4, type: 'gold' },
      { x: 9, y: 4, type: 'cash' },
      { x: 8, y: 11, type: 'jewel' },
      { x: 3, y: 3, type: 'artifact' }
    ]
  },

  // Map 2: The Museum (Medium)
  museum: {
    name: 'The Museum',
    difficulty: 'medium',
    width: 24,
    height: 16,
    rooms: [
      { x: 1, y: 12, w: 4, h: 3 },    // Entry
      { x: 19, y: 1, w: 4, h: 4 },    // Vault
      { x: 8, y: 1, w: 6, h: 4 },     // Gallery 1
      { x: 1, y: 1, w: 5, h: 5 },     // Gallery 2
      { x: 8, y: 8, w: 8, h: 5 },     // Main Hall
      { x: 18, y: 8, w: 5, h: 6 }     // Side gallery
    ],
    corridors: [
      { x1: 3, y1: 12, x2: 3, y2: 8 },
      { x1: 3, y1: 8, x2: 8, y2: 8 },
      { x1: 5, y1: 3, x2: 8, y2: 3 },
      { x1: 14, y1: 3, x2: 19, y2: 3 },
      { x1: 14, y1: 3, x2: 14, y2: 8 },
      { x1: 16, y1: 10, x2: 18, y2: 10 },
      { x1: 20, y1: 5, x2: 20, y2: 8 }
    ],
    doors: [
      { x: 3, y: 11 }, { x: 6, y: 3 }, { x: 17, y: 3 }, { x: 17, y: 10 }, { x: 20, y: 6 }
    ],
    entry: { x: 2, y: 13 },
    exit: { x: 21, y: 2 },
    cameras: [
      { x: 11, y: 2, direction: 'down', rotates: true },
      { x: 3, y: 2, direction: 'right', rotates: true },
      { x: 12, y: 10, direction: 'left', rotates: true },
      { x: 20, y: 10, direction: 'up', rotates: false },
      { x: 18, y: 4, direction: 'down', rotates: true }
    ],
    loot: [
      { x: 21, y: 3, type: 'diamond' },
      { x: 10, y: 2, type: 'artifact' },
      { x: 2, y: 3, type: 'artifact' },
      { x: 12, y: 11, type: 'gold' },
      { x: 20, y: 12, type: 'jewel' },
      { x: 21, y: 9, type: 'gold' }
    ]
  },

  // Map 3: The Fortress (Hard)
  fortress: {
    name: 'The Fortress',
    difficulty: 'hard',
    width: 26,
    height: 18,
    rooms: [
      { x: 1, y: 14, w: 4, h: 3 },     // Entry
      { x: 21, y: 1, w: 4, h: 4 },     // Vault
      { x: 11, y: 7, w: 4, h: 4 },     // Center room
      { x: 1, y: 1, w: 5, h: 5 },      // NW room
      { x: 1, y: 7, w: 4, h: 5 },      // W room
      { x: 7, y: 1, w: 5, h: 4 },      // N room
      { x: 14, y: 1, w: 5, h: 4 },     // NE room
      { x: 17, y: 7, w: 4, h: 5 },     // E room
      { x: 7, y: 13, w: 6, h: 4 },     // S room
      { x: 17, y: 13, w: 5, h: 4 }     // SE room
    ],
    corridors: [
      { x1: 4, y1: 14, x2: 7, y2: 14 },
      { x1: 3, y1: 6, x2: 3, y2: 7 },
      { x1: 3, y1: 12, x2: 3, y2: 14 },
      { x1: 5, y1: 3, x2: 7, y2: 3 },
      { x1: 12, y1: 3, x2: 14, y2: 3 },
      { x1: 19, y1: 3, x2: 21, y2: 3 },
      { x1: 15, y1: 9, x2: 17, y2: 9 },
      { x1: 11, y1: 9, x2: 11, y2: 11 },
      { x1: 9, y1: 11, x2: 11, y2: 11 },
      { x1: 9, y1: 11, x2: 9, y2: 13 },
      { x1: 13, y1: 15, x2: 17, y2: 15 },
      { x1: 19, y1: 12, x2: 19, y2: 13 },
      { x1: 21, y1: 5, x2: 21, y2: 7 },
      { x1: 19, y1: 7, x2: 21, y2: 7 }
    ],
    doors: [
      { x: 5, y: 14 }, { x: 3, y: 6 }, { x: 6, y: 3 }, { x: 13, y: 3 },
      { x: 20, y: 3 }, { x: 16, y: 9 }, { x: 10, y: 14 }, { x: 19, y: 12 }, { x: 21, y: 6 }
    ],
    entry: { x: 2, y: 15 },
    exit: { x: 23, y: 2 },
    cameras: [
      { x: 9, y: 2, direction: 'down', rotates: true },
      { x: 16, y: 2, direction: 'down', rotates: true },
      { x: 13, y: 9, direction: 'right', rotates: true },
      { x: 3, y: 9, direction: 'right', rotates: true },
      { x: 19, y: 9, direction: 'left', rotates: true },
      { x: 10, y: 15, direction: 'up', rotates: true },
      { x: 22, y: 4, direction: 'left', rotates: false }
    ],
    loot: [
      { x: 23, y: 3, type: 'diamond' },
      { x: 22, y: 2, type: 'diamond' },
      { x: 13, y: 9, type: 'artifact' },
      { x: 2, y: 2, type: 'gold' },
      { x: 9, y: 14, type: 'gold' },
      { x: 19, y: 15, type: 'jewel' },
      { x: 2, y: 9, type: 'cash' }
    ]
  }
};

/**
 * Generate a heist map from preset
 */
function generateMap(preset = 'bank') {
  const config = MAP_PRESETS[preset] || MAP_PRESETS.bank;
  const { width, height, rooms, corridors, doors, entry, exit } = config;

  // Initialize with walls
  const cells = Array(height).fill(null).map(() =>
    Array(width).fill(CELL_TYPES.WALL)
  );

  // Carve out rooms
  rooms.forEach(room => {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (y >= 0 && y < height && x >= 0 && x < width) {
          cells[y][x] = CELL_TYPES.FLOOR;
        }
      }
    }
  });

  // Carve corridors
  corridors.forEach(corridor => {
    carveCorridor(cells, corridor.x1, corridor.y1, corridor.x2, corridor.y2, width, height);
  });

  // Add doors
  doors.forEach(pos => {
    if (pos.y >= 0 && pos.y < height && pos.x >= 0 && pos.x < width) {
      cells[pos.y][pos.x] = CELL_TYPES.DOOR;
    }
  });

  // Set entry and exit
  cells[entry.y][entry.x] = CELL_TYPES.ENTRY;
  cells[exit.y][exit.x] = CELL_TYPES.EXIT;

  return {
    width,
    height,
    cells,
    entry,
    exit,
    rooms,
    name: config.name,
    difficulty: config.difficulty
  };
}

function carveCorridor(cells, x1, y1, x2, y2, width, height) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  for (let x = minX; x <= maxX; x++) {
    if (y1 >= 0 && y1 < height && x >= 0 && x < width) {
      if (cells[y1][x] === CELL_TYPES.WALL) {
        cells[y1][x] = CELL_TYPES.FLOOR;
      }
    }
  }

  for (let y = minY; y <= maxY; y++) {
    if (y >= 0 && y < height && x2 >= 0 && x2 < width) {
      if (cells[y][x2] === CELL_TYPES.WALL) {
        cells[y][x2] = CELL_TYPES.FLOOR;
      }
    }
  }
}

/**
 * Generate cameras based on preset or custom settings
 */
function generateCameras(preset = 'bank', difficulty = 'medium') {
  const config = MAP_PRESETS[preset] || MAP_PRESETS.bank;

  // Difficulty modifiers
  const difficultyMods = {
    easy: { rotationSpeed: 15, fovAngle: 50, fovRange: 3 },
    medium: { rotationSpeed: 25, fovAngle: 60, fovRange: 4 },
    hard: { rotationSpeed: 40, fovAngle: 70, fovRange: 5 }
  };

  const mods = difficultyMods[difficulty] || difficultyMods.medium;

  return config.cameras.map((cam, i) => ({
    id: i,
    x: cam.x,
    y: cam.y,
    direction: cam.direction,
    rotates: cam.rotates,
    fovAngle: mods.fovAngle,
    fovRange: mods.fovRange,
    rotationSpeed: cam.rotates ? mods.rotationSpeed : 0,
    currentAngle: getAngleFromDirection(cam.direction),
    rotationDirection: 1, // 1 = clockwise, -1 = counter-clockwise
    minAngle: getAngleFromDirection(cam.direction) - 45,
    maxAngle: getAngleFromDirection(cam.direction) + 45,
    disabled: false,
    disabledUntil: 0
  }));
}

function getAngleFromDirection(direction) {
  switch (direction) {
    case 'up': return 270;
    case 'down': return 90;
    case 'left': return 180;
    case 'right': return 0;
    default: return 0;
  }
}

/**
 * Generate loot based on preset
 */
function generateLoot(preset = 'bank') {
  const config = MAP_PRESETS[preset] || MAP_PRESETS.bank;
  const lootValues = {
    diamond: 150,
    gold: 100,
    cash: 50,
    artifact: 200,
    jewel: 75
  };

  return config.loot.map((item, i) => ({
    id: i,
    x: item.x,
    y: item.y,
    type: item.type,
    value: lootValues[item.type],
    collected: false,
    pinged: false,
    pingUntil: 0
  }));
}

/**
 * Get list of available maps
 */
function getAvailableMaps() {
  return Object.entries(MAP_PRESETS).map(([id, config]) => ({
    id,
    name: config.name,
    difficulty: config.difficulty,
    size: `${config.width}x${config.height}`,
    lootCount: config.loot.length,
    cameraCount: config.cameras.length
  }));
}

/**
 * Get difficulty settings
 */
function getDifficultySettings(difficulty) {
  const settings = {
    easy: {
      countdown: 240,      // 4 minutes
      alarmDecay: 2,       // Faster decay
      alarmSpikeFq: 0.03,  // Less frequent spikes
      cameraDetect: 3,     // Lower detection
      lootAlarm: 5         // Lower alarm on pickup
    },
    medium: {
      countdown: 180,      // 3 minutes
      alarmDecay: 1,
      alarmSpikeFq: 0.05,
      cameraDetect: 5,
      lootAlarm: 10
    },
    hard: {
      countdown: 120,      // 2 minutes
      alarmDecay: 0.5,     // Slower decay
      alarmSpikeFq: 0.08,  // More frequent spikes
      cameraDetect: 8,     // Higher detection
      lootAlarm: 15        // Higher alarm on pickup
    }
  };

  return settings[difficulty] || settings.medium;
}

module.exports = {
  generateMap,
  generateCameras,
  generateLoot,
  getAvailableMaps,
  getDifficultySettings,
  CELL_TYPES,
  MAP_PRESETS
};

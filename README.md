# 🎮 Falling Objects Game

A fun falling objects game made with TypeScript, Canvas, and Vite.

## 🚀 Features

- **5 Different Themes**: Night, Day, Factory, Ocean, Space
- **3 Game Modes**: Shapes, Animals, Tools
- **100 Progressive Levels**: Difficulty increases as you progress
- **Visual Effects**: Fireworks, particle effects, animations
- **Sound Effects**: Collision sounds, level pass sounds
- **Responsive Design**: Works on desktop and mobile
- **Multiple Control Options**: Keyboard (Arrow Keys/WASD) or Mouse/Touch drag

## 🎯 How to Play

1. **Start the Game**: Click the "START GAME" button on the welcome screen
2. **Move the Player**: 
   - Use Arrow Keys or WASD to move
   - Or click and drag on the game canvas
3. **Catch Objects**: Move the green rectangle to catch falling objects
4. **Survive**: Don't let objects hit you!
5. **Progress**: Complete levels to unlock harder challenges

## 🌐 Play Online

👉 **[Play the Game](https://satananov.github.io/falling-objects-game/)**

## 💻 Local Development

### Prerequisites
- Node.js (v18+)
- npm

### Installation

```bash
git clone https://github.com/SATananov/falling-objects-game.git
cd falling-objects-game
npm install
```

### Development Server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` folder.

## 📁 Project Structure

```
src/
├── main.ts              # Main game logic
├── style.css            # Game styling
public/
├── music.mp3            # Background music
dist/                    # Built files (generated)
.github/
└── workflows/
    └── deploy.yml       # GitHub Pages deployment
```

## 🎨 Technologies Used

- **TypeScript**: Type-safe game logic
- **HTML Canvas**: Game rendering
- **Vite**: Fast build tool
- **GitHub Pages**: Free hosting

## 🎵 Audio

The game includes:
- Background music (looping)
- Collision sound effects
- Level pass sound effects
- Fireworks sound effects

## 📊 Game Mechanics

- **Object Types**: Circles, Squares, Triangles, Emojis, Stars, Diamonds
- **Difficulty Scaling**: Objects fall faster as levels progress
- **Level Variety**: Different themes and object types
- **Physics**: Simple gravity and collision detection

## 👥 Dedication

**Made for Dessi and Eva** ❤️

## 📝 License

MIT

## 🔗 Links

- GitHub: https://github.com/SATananov/falling-objects-game
- Play Online: https://satananov.github.io/falling-objects-game/

---

Enjoy the game! 🎮✨

import "./style.css";

// ---------- Basic Types ----------

interface Point {
  x: number;
  y: number;
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GameObject {
  location: Point;
  speed: Point; // pixels per second
  isAlive: boolean;

  move(deltaSeconds: number, field: GameField): void;
  getBounds(): Bounds;
  hasCollision(other: GameObject): boolean;
  render(ctx: CanvasRenderingContext2D): void;
}

// ---------- Utility ----------

function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------- Audio Manager ----------

class AudioManager {
  private audioContext: AudioContext | null = null;

  constructor() {
    // Don't initialize here - wait for user interaction
  }

  private ensureAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }

  initAudio() {
    this.ensureAudioContext();
  }

  private playSound(frequency: number, duration: number, volume: number = 0.3, type: "sine" | "square" | "triangle" = "sine") {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  playCollisionSound() {
    // Low descending pitch for collision
    this.playSound(200, 0.1, 0.4, "square");
    setTimeout(() => this.playSound(150, 0.1, 0.3, "square"), 50);
  }

  playLevelPassSound() {
    // Ascending melody for level pass
    this.playSound(523, 0.1, 0.3, "sine"); // C5
    setTimeout(() => this.playSound(659, 0.1, 0.3, "sine"), 120); // E5
    setTimeout(() => this.playSound(784, 0.1, 0.3, "sine"), 240); // G5
    setTimeout(() => this.playSound(1047, 0.2, 0.3, "sine"), 360); // C6
  }

  playFireworksSound() {
    // Quick pop sound for fireworks
    this.playSound(800, 0.05, 0.25, "square");
  }
}

// ---------- Fireworks ----------

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

class Fireworks {
  private particles: Particle[] = [];

  createExplosion(x: number, y: number, count: number = 50): void {
    const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#ffffff"];
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = randomBetween(150, 350);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      this.particles.push({
        x,
        y,
        vx,
        vy,
        life: 1,
        maxLife: randomBetween(0.8, 1.5),
        color: randomChoice(colors),
      });
    }
  }

  update(deltaSeconds: number): void {
    this.particles.forEach((p) => {
      p.x += p.vx * deltaSeconds;
      p.y += p.vy * deltaSeconds;
      p.vy += 300 * deltaSeconds; // gravity
      p.life -= deltaSeconds;
    });

    this.particles = this.particles.filter((p) => p.life > 0);
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.particles.forEach((p) => {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  hasParticles(): boolean {
    return this.particles.length > 0;
  }
}

// ---------- Game Objects ----------

abstract class BaseFallingObject implements GameObject {
  location: Point;
  speed: Point;
  isAlive = true;
  color: string;
  borderColor: string;

  constructor(location: Point, speedY: number, color: string, borderColor: string) {
    this.location = location;
    this.speed = { x: 0, y: speedY }; // only down
    this.color = color;
    this.borderColor = borderColor;
  }

  move(deltaSeconds: number, field: GameField): void {
    this.location.y += this.speed.y * deltaSeconds;

    // If outside field => mark as dead
    if (this.location.y - 100 > field.height) {
      this.isAlive = false;
    }
  }

  abstract getBounds(): Bounds;
  abstract render(ctx: CanvasRenderingContext2D): void;

  hasCollision(other: GameObject): boolean {
    return boundsIntersect(this.getBounds(), other.getBounds());
  }
}

class FallingCircle extends BaseFallingObject {
  radius: number;

  constructor(location: Point, speedY: number, radius: number, color: string, borderColor: string) {
    super(location, speedY, color, borderColor);
    this.radius = radius;
  }

  getBounds(): Bounds {
    return {
      x: this.location.x - this.radius,
      y: this.location.y - this.radius,
      width: this.radius * 2,
      height: this.radius * 2,
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.location.x, this.location.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.borderColor;
    ctx.stroke();
    ctx.restore();
  }
}

class RotatingFallingSquare extends BaseFallingObject {
  size: number;
  angle = 0;
  angularSpeed: number; // radians/sec

  constructor(
    location: Point,
    speedY: number,
    size: number,
    color: string,
    borderColor: string,
    angularSpeed: number
  ) {
    super(location, speedY, color, borderColor);
    this.size = size;
    this.angularSpeed = angularSpeed;
  }

  move(deltaSeconds: number, field: GameField): void {
    super.move(deltaSeconds, field);
    this.angle += this.angularSpeed * deltaSeconds;
  }

  getBounds(): Bounds {
    // Approximate with axis-aligned box
    return {
      x: this.location.x - this.size / 2,
      y: this.location.y - this.size / 2,
      width: this.size,
      height: this.size,
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.location.x, this.location.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const half = this.size / 2;
    ctx.rect(-half, -half, this.size, this.size);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

class RotatingFallingTriangle extends BaseFallingObject {
  size: number;
  angle = 0;
  angularSpeed: number;

  constructor(
    location: Point,
    speedY: number,
    size: number,
    color: string,
    borderColor: string,
    angularSpeed: number
  ) {
    super(location, speedY, color, borderColor);
    this.size = size;
    this.angularSpeed = angularSpeed;
  }

  move(deltaSeconds: number, field: GameField): void {
    super.move(deltaSeconds, field);
    this.angle += this.angularSpeed * deltaSeconds;
  }

  getBounds(): Bounds {
    return {
      x: this.location.x - this.size / 2,
      y: this.location.y - this.size / 2,
      width: this.size,
      height: this.size,
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    const half = this.size / 2;

    ctx.save();
    ctx.translate(this.location.x, this.location.y);
    ctx.rotate(this.angle);

    ctx.beginPath();
    ctx.moveTo(0, -half); // top
    ctx.lineTo(half, half);
    ctx.lineTo(-half, half);
    ctx.closePath();

    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.borderColor;
    ctx.stroke();

    ctx.restore();
  }
}

// Emoji object – animals / tools
class FallingEmojiObject extends BaseFallingObject {
  text: string;
  fontSize: number;

  constructor(location: Point, speedY: number, fontSize: number, text: string) {
    super(location, speedY, "#ffffff", "#000000");
    this.text = text;
    this.fontSize = fontSize;
  }

  getBounds(): Bounds {
    const size = this.fontSize;
    return {
      x: this.location.x - size / 2,
      y: this.location.y - size / 2,
      width: size,
      height: size,
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = `${this.fontSize}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.text, this.location.x, this.location.y);
    ctx.restore();
  }
}

// Star-shaped falling object for space theme
class FallingStarObject extends BaseFallingObject {
  size: number;
  rotation: number = 0;

  constructor(location: Point, speedY: number, size: number = 15) {
    super(location, speedY, "#ffff00", "#ffcc00");
    this.size = size;
  }

  getBounds(): Bounds {
    return {
      x: this.location.x - this.size,
      y: this.location.y - this.size,
      width: this.size * 2,
      height: this.size * 2,
    };
  }

  move(deltaSeconds: number, field: GameField): void {
    this.rotation += 0.1;
    super.move(deltaSeconds, field);
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.location.x, this.location.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 2;

    // Draw star
    const points = 5;
    const outerRadius = this.size;
    const innerRadius = this.size / 2;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// Diamond-shaped falling object for ocean theme
class FallingDiamondObject extends BaseFallingObject {
  size: number;

  constructor(location: Point, speedY: number, size: number = 15) {
    super(location, speedY, "#00ccff", "#0099cc");
    this.size = size;
  }

  getBounds(): Bounds {
    return {
      x: this.location.x - this.size,
      y: this.location.y - this.size,
      width: this.size * 2,
      height: this.size * 2,
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.location.x, this.location.y);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 2;

    // Draw diamond
    ctx.beginPath();
    ctx.moveTo(0, -this.size);
    ctx.lineTo(this.size, 0);
    ctx.lineTo(0, this.size);
    ctx.lineTo(-this.size, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

class Player implements GameObject {
  location: Point;
  speed: Point = { x: 0, y: 0 };
  width: number;
  height: number;
  color: string;
  borderColor: string;
  isAlive = true;
  private moveSpeed = 420; // pixels per second

  constructor(location: Point, width: number, height: number, color: string, borderColor: string) {
    this.location = location;
    this.width = width;
    this.height = height;
    this.color = color;
    this.borderColor = borderColor;
  }

  moveLeft(deltaSeconds: number): void {
    this.location.x -= this.moveSpeed * deltaSeconds;
  }

  moveRight(deltaSeconds: number): void {
    this.location.x += this.moveSpeed * deltaSeconds;
  }

  moveUp(deltaSeconds: number): void {
    this.location.y -= this.moveSpeed * deltaSeconds;
  }

  moveDown(deltaSeconds: number): void {
    this.location.y += this.moveSpeed * deltaSeconds;
  }

  move(deltaSeconds: number, field: GameField): void {
    // Clamp inside field horizontally
    if (this.location.x < this.width / 2) {
      this.location.x = this.width / 2;
    }
    if (this.location.x > field.width - this.width / 2) {
      this.location.x = field.width - this.width / 2;
    }
    // Clamp inside field vertically
    if (this.location.y < this.height / 2) {
      this.location.y = this.height / 2;
    }
    if (this.location.y > field.height - this.height / 2) {
      this.location.y = field.height - this.height / 2;
    }
  }

  getBounds(): Bounds {
    return {
      x: this.location.x - this.width / 2,
      y: this.location.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  hasCollision(other: GameObject): boolean {
    return boundsIntersect(this.getBounds(), other.getBounds());
  }

  render(ctx: CanvasRenderingContext2D): void {
    const bounds = this.getBounds();
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 2;
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.restore();
  }
}

// ---------- Level, LevelObject, Field ----------

class LevelObject {
  constructor(
    public startTime: number, // ms after level start
    private factory: () => GameObject
  ) {}

  createGameObject(): GameObject {
    return this.factory();
  }
}

type LevelTheme = "night" | "day" | "factory" | "ocean" | "space";
type LevelKind = "shapes" | "animals" | "tools";

class Level {
  constructor(
    public difficulty: number,
    public duration: number, // ms
    public levelObjects: LevelObject[],
    public theme: LevelTheme,
    public kind: LevelKind
  ) {}
}

class GameField {
  width: number;
  height: number;
  gameObjects: GameObject[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  addObject(obj: GameObject): void {
    this.gameObjects.push(obj);
  }

  removeDead(): void {
    this.gameObjects = this.gameObjects.filter((o) => o.isAlive);
  }
}

// ---------- Level Generator ----------

function generateLevel(
  durationMs: number,
  difficulty: number,
  field: GameField,
  theme: LevelTheme,
  kind: LevelKind
): Level {
  const seconds = durationMs / 1000;
  const objectsCount = Math.floor(seconds * difficulty * 1.5); // Increase object quantity

  const levelObjects: LevelObject[] = [];

  const animalEmojis = ["🐶", "🐱", "🦊", "🐻", "🐰", "🦁", "🐼"];
  const toolEmojis = ["🔧", "🛠", "⚙", "🔩", "🪚", "🔨", "🪛"];

  for (let i = 0; i < objectsCount; i++) {
    const startTime = randomBetween(0, durationMs - 500);
    const x = randomBetween(40, field.width - 40);
    const startY = randomBetween(-200, -40);
    // Speed increases with difficulty - faster falling objects
    const minSpeed = 80 + difficulty * 30;
    const maxSpeed = 190 + difficulty * 60;
    const speed = randomBetween(minSpeed, maxSpeed);
    const size = randomBetween(28, 48);
    const radius = size / 2;

    const factory = () => {
      // Theme-specific objects
      if (theme === "space") {
        return new FallingStarObject({ x, y: startY }, speed, radius);
      } else if (theme === "ocean") {
        return new FallingDiamondObject({ x, y: startY }, speed, radius);
      }

      // Default behavior for other themes (night, day, factory)
      if (kind === "shapes") {
        const type = randomChoice<"circle" | "square" | "triangle">([
          "circle",
          "square",
          "triangle",
        ]);
        const color = randomChoice<string>(["#ff9f80", "#ffdf6e", "#85e3ff", "#baffc9"]);
        const borderColor = "#ffffff";
        const angularSpeed = randomBetween(-2.5, 2.5);

        if (type === "circle") {
          return new FallingCircle({ x, y: startY }, speed, radius, color, borderColor);
        } else if (type === "square") {
          return new RotatingFallingSquare(
            { x, y: startY },
            speed,
            size,
            color,
            borderColor,
            angularSpeed
          );
        } else {
          return new RotatingFallingTriangle(
            { x, y: startY },
            speed,
            size,
            color,
            borderColor,
            angularSpeed
          );
        }
      } else if (kind === "animals") {
        const emoji = randomChoice(animalEmojis);
        return new FallingEmojiObject({ x, y: startY }, speed, size, emoji);
      } else {
        const emoji = randomChoice(toolEmojis);
        return new FallingEmojiObject({ x, y: startY }, speed, size, emoji);
      }
    };

    levelObjects.push(new LevelObject(startTime, factory));
  }

  levelObjects.sort((a, b) => a.startTime - b.startTime);

  return new Level(difficulty, durationMs, levelObjects, theme, kind);
}

// ---------- Game ----------

type GameStatus = "IDLE" | "RUNNING" | "PAUSED" | "STOPPED" | "FINISHED";

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private field: GameField;
  private player: Player;

  private levels: Level[] = [];
  private currentLevelIndex = 0;
  private levelStartTime = 0;
  private lastFrameTime = 0;
  private nextLevelObjectIndex = 0;

  public status: GameStatus = "IDLE";
  private animationFrameId = 0;

  private leftPressed = false;
  private rightPressed = false;
  private upPressed = false;
  private downPressed = false;

  private stars: Point[] = [];
  private fireworks: Fireworks = new Fireworks();
  private audioManager: AudioManager = new AudioManager();
  private backgroundMusic = document.getElementById("background-music") as HTMLAudioElement | null;
  private levelPassedTimer = 0;
  private levelPassedTimeoutId: number | null = null;
  private isLevelPassed = false;
  private levelPassedStartTime = 0;

  // UI
  private statusLabel = document.getElementById("status") as HTMLDivElement;
  private objectsLabel = document.getElementById("objects") as HTMLDivElement;
  private timeLabel = document.getElementById("time") as HTMLDivElement;
  private progressFill = document.getElementById("progress-fill") as HTMLDivElement;
  private gameOverOverlay = document.getElementById("game-over-overlay") as HTMLDivElement;
  private playAgainBtn = document.getElementById("btn-play-again") as HTMLButtonElement;
  private levelPassedOverlay = document.getElementById("level-passed-overlay") as HTMLDivElement;
  private levelPassedText = document.getElementById("level-passed-text") as HTMLDivElement;
  private nextLevelBtn = document.getElementById("btn-next-level") as HTMLButtonElement;
  private welcomeOverlay = document.getElementById("welcome-overlay") as HTMLDivElement;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context not available");
    }

    this.canvas = canvas;
    this.ctx = context;

    this.field = new GameField(canvas.width, canvas.height);

    const playerWidth = 110;
    const playerHeight = 18;
    this.player = new Player(
      { x: canvas.width / 2, y: canvas.height - playerHeight - 12 },
      playerWidth,
      playerHeight,
      "#22e246",
      "#ffffff"
    );

    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
      });
    }

    this.initControls();
    this.resetLevels();
    this.updateHud(0, 0);
    this.renderFrame();
  }

  private resetLevels(): void {
    this.levels = [];
    const duration = 25000;
    const themes: LevelTheme[] = ["night", "day", "factory", "ocean", "space"];
    const kinds: LevelKind[] = ["shapes", "animals", "tools"];
    const baseDifficulties = [0.7, 0.85, 0.9, 0.95, 1.0];

    // Generate 100 levels with progressive difficulty
    for (let i = 0; i < 100; i++) {
      const cycleIndex = i % 5; // Repeats every 5 levels
      const cycleNumber = Math.floor(i / 5); // Which cycle we're in (0, 1, 2, ...)
      
      const baseDifficulty = baseDifficulties[cycleIndex];
      // Progressive difficulty increase: 0.15 per cycle (every 5 levels)
      const difficulty = baseDifficulty + cycleNumber * 0.15;
      const theme = themes[cycleIndex];
      const kind = kinds[cycleIndex % 3]; // Cycle through 3 kinds
      
      this.levels.push(generateLevel(duration, difficulty, this.field, theme, kind));
    }

    this.currentLevelIndex = 0;
  }

  start(): void {
    if (this.status === "RUNNING") {
      return;
    }

    // Initialize audio on first user interaction
    this.audioManager.initAudio();

    // Starting fresh from the beginning
    this.resetLevels();
    this.currentLevelIndex = 0;
    this.isLevelPassed = false;

    this.status = "RUNNING";

    const now = performance.now();
    this.field.gameObjects = [];
    this.player.isAlive = true;
    this.levelStartTime = now;
    this.lastFrameTime = now;
    this.nextLevelObjectIndex = 0;

    this.gameOverOverlay.classList.add("hidden");
    this.levelPassedOverlay.classList.add("hidden");
    this.welcomeOverlay.classList.add("hidden");
    
    // Play background music
    if (this.backgroundMusic) {
      this.backgroundMusic.currentTime = 0;
      this.backgroundMusic.play().catch(() => {
        // Browser may block autoplay, user interaction required
      });
    }
    
    this.statusLabel.textContent = `Status: RUNNING (Level ${this.currentLevelIndex + 1}/${this.levels.length})`;
    this.loop(now);
  }

  pause(): void {
    if (this.status !== "RUNNING") {
      return;
    }
    this.status = "PAUSED";
    this.statusLabel.textContent = "Status: PAUSED";
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
    }
  }

  resume(): void {
    if (this.status !== "PAUSED") {
      return;
    }
    this.status = "RUNNING";
    this.statusLabel.textContent = `Status: RUNNING (Level ${
      this.currentLevelIndex + 1
    }/${this.levels.length})`;
    this.lastFrameTime = performance.now();
    if (this.backgroundMusic) {
      this.backgroundMusic.play();
    }
    this.loop(this.lastFrameTime);
  }

  stop(): void {
    this.status = "STOPPED";
    this.isLevelPassed = false;
    this.statusLabel.textContent = "Status: STOPPED";
    this.gameOverOverlay.classList.add("hidden");
    this.levelPassedOverlay.classList.add("hidden");
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }
    
    cancelAnimationFrame(this.animationFrameId);
    this.field.gameObjects = [];
    this.updateHud(0, 0);
    this.renderFrame();
  }

  private loop = (timestamp: number): void => {
    if (this.status !== "RUNNING") {
      cancelAnimationFrame(this.animationFrameId);
      return;
    }

    const deltaMs = timestamp - this.lastFrameTime;
    const deltaSeconds = deltaMs / 1000;
    this.lastFrameTime = timestamp;

    const level = this.levels[this.currentLevelIndex];
    const elapsedMs = timestamp - this.levelStartTime;

    while (
      this.nextLevelObjectIndex < level.levelObjects.length &&
      level.levelObjects[this.nextLevelObjectIndex].startTime <= elapsedMs
    ) {
      const levelObj = level.levelObjects[this.nextLevelObjectIndex];
      const obj = levelObj.createGameObject();
      this.field.addObject(obj);
      this.nextLevelObjectIndex++;
    }

    if (this.leftPressed) {
      this.player.moveLeft(deltaSeconds);
    }
    if (this.rightPressed) {
      this.player.moveRight(deltaSeconds);
    }
    if (this.upPressed) {
      this.player.moveUp(deltaSeconds);
    }
    if (this.downPressed) {
      this.player.moveDown(deltaSeconds);
    }
    this.player.move(deltaSeconds, this.field);

    this.field.gameObjects.forEach((obj) => obj.move(deltaSeconds, this.field));
    this.field.removeDead();

    for (const obj of this.field.gameObjects) {
      if (obj.hasCollision(this.player)) {
        this.handlePlayerHit();
        break;
      }
    }

    if (elapsedMs >= level.duration && this.field.gameObjects.length === 0) {
      this.handleLevelFinished();
    }

    // Update fireworks
    this.fireworks.update(deltaSeconds);

    this.updateHud(elapsedMs, level.duration);
    this.renderFrame();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private handlePlayerHit(): void {
    this.status = "STOPPED";
    this.statusLabel.textContent = "Status: GAME OVER";
    this.gameOverOverlay.classList.remove("hidden");
    this.audioManager.playCollisionSound();
  }

  private handleLevelFinished(): void {
    this.status = "STOPPED";
    this.isLevelPassed = true;
    this.levelPassedStartTime = performance.now();
    this.audioManager.playLevelPassSound();
    
    // Create fireworks explosions
    for (let i = 0; i < 5; i++) {
      const x = randomBetween(100, this.canvas.width - 100);
      const y = randomBetween(100, this.canvas.height - 100);
      this.fireworks.createExplosion(x, y, 40);
      this.audioManager.playFireworksSound();
    }
    
    if (this.currentLevelIndex < this.levels.length - 1) {
      // Show "You Pass Level X" message
      this.levelPassedText.textContent = `You Pass Level ${this.currentLevelIndex + 1}`;
      this.levelPassedOverlay.classList.remove("hidden");
      
      // Auto-advance to next level after 5 seconds with continuous fireworks
      this.animationFrameId = requestAnimationFrame(this.levelPassedLoop);
    } else {
      // Last level completed
      this.status = "FINISHED";
      this.statusLabel.textContent = "Status: ALL LEVELS COMPLETE";
      this.levelPassedText.textContent = `You Pass Level ${this.currentLevelIndex + 1} - ALL COMPLETE!`;
      this.levelPassedOverlay.classList.remove("hidden");
    }
  }

  private levelPassedLoop = (timestamp: number): void => {
    const elapsedMs = timestamp - this.levelPassedStartTime;
    const FIREWORKS_INTERVAL = 200; // ms
    
    // Add fireworks every 200ms
    if (Math.floor(elapsedMs / FIREWORKS_INTERVAL) % 1 === 0 && elapsedMs % FIREWORKS_INTERVAL < 16) {
      const x = randomBetween(100, this.canvas.width - 100);
      const y = randomBetween(100, this.canvas.height - 100);
      this.fireworks.createExplosion(x, y, 30);
      this.audioManager.playFireworksSound();
    }
    
    // Update fireworks
    const deltaSeconds = 0.016; // Approx 60fps
    this.fireworks.update(deltaSeconds);
    this.renderFrame();
    
    // Continue for 5 seconds (5000ms)
    if (elapsedMs < 5000) {
      this.animationFrameId = requestAnimationFrame(this.levelPassedLoop);
    } else {
      // After 5 seconds, advance to next level
      this.advanceToNextLevel();
    }
  };

  private advanceToNextLevel(): void {
    if (this.currentLevelIndex < this.levels.length - 1) {
      this.isLevelPassed = false;
      this.currentLevelIndex++;
      this.levelPassedOverlay.classList.add("hidden");
      
      const now = performance.now();
      this.field.gameObjects = [];
      this.levelStartTime = now;
      this.lastFrameTime = now;
      this.nextLevelObjectIndex = 0;
      
      this.status = "RUNNING";
      this.statusLabel.textContent = `Status: RUNNING (Level ${this.currentLevelIndex + 1}/${this.levels.length})`;
      this.animationFrameId = requestAnimationFrame(this.loop);
    }
  }

  private renderFrame(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const level = this.levels[this.currentLevelIndex];

    ctx.save();
    if (level.theme === "night") {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#020617");
      grad.addColorStop(1, "#020b3d");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "#ffffff";
      this.stars.forEach((s) => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (level.theme === "day") {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#9ad9ff");
      grad.addColorStop(1, "#e9f7ff");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "#6cc070";
      ctx.fillRect(0, h - 40, w, 40);
    } else if (level.theme === "factory") {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#2b103e");
      grad.addColorStop(1, "#7e3ff2");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "rgba(255,255,255,0.1)";
      for (let i = 0; i < 6; i++) {
        const x = (i * w) / 6;
        ctx.fillRect(x, 0, 8, h);
      }
    } else if (level.theme === "ocean") {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#1a5f7a");
      grad.addColorStop(0.5, "#2a8fa5");
      grad.addColorStop(1, "#0d4a63");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Water waves effect
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(w / 2, h / 2 + i * 40, 60 - i * 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (level.theme === "space") {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#000011");
      grad.addColorStop(0.5, "#0a0033");
      grad.addColorStop(1, "#000022");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Stars and nebula
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (let i = 0; i < 15; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Purple nebula glow
      ctx.fillStyle = "rgba(200,100,255,0.1)";
      ctx.fillRect(0, 0, w / 2, h / 2);
    }
    ctx.restore();

    this.player.render(ctx);
    this.field.gameObjects.forEach((obj) => obj.render(ctx));
    
    // Render fireworks on top
    this.fireworks.render(ctx);
  }

  private updateHud(elapsedMs: number, totalMs: number): void {
    const elapsedSeconds = elapsedMs / 1000;
    const totalSeconds = totalMs / 1000;

    this.objectsLabel.textContent = `Objects: ${this.field.gameObjects.length}`;
    this.timeLabel.textContent = `Time: ${elapsedSeconds.toFixed(2)}s / ${totalSeconds.toFixed(
      2
    )}s`;

    const progress = totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 0;
    this.progressFill.style.width = `${progress * 100}%`;
  }

  private initControls(): void {
    const btnStart = document.getElementById("btn-start") as HTMLButtonElement;
    const btnPause = document.getElementById("btn-pause") as HTMLButtonElement;
    const btnResume = document.getElementById("btn-resume") as HTMLButtonElement;
    const btnStop = document.getElementById("btn-stop") as HTMLButtonElement;
    const btnStartWelcome = document.getElementById("btn-start-welcome") as HTMLButtonElement;

    btnStart.addEventListener("click", () => this.start());
    btnStartWelcome.addEventListener("click", () => this.start());
    btnPause.addEventListener("click", () => this.pause());
    btnResume.addEventListener("click", () => this.resume());
    btnStop.addEventListener("click", () => this.stop());
    this.playAgainBtn.addEventListener("click", () => this.start());
    this.nextLevelBtn.addEventListener("click", () => this.advanceToNextLevel());

    // Keyboard
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        this.leftPressed = true;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        this.rightPressed = true;
      } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        this.upPressed = true;
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        this.downPressed = true;
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        this.leftPressed = false;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        this.rightPressed = false;
      } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        this.upPressed = false;
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        this.downPressed = false;
      }
    });

    // Mouse / touch (pointer) – move player by dragging / tapping
    const handlePointer = (clientX: number, clientY: number) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      this.player.location.x = x * (this.canvas.width / rect.width);
      this.player.location.y = y * (this.canvas.height / rect.height);
    };

    this.canvas.addEventListener("pointerdown", (e) => {
      handlePointer(e.clientX, e.clientY);
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (e.buttons !== 0 || e.pressure > 0) {
        handlePointer(e.clientX, e.clientY);
      }
    });
  }
}

// ---------- Bootstrap ----------

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const game = new Game(canvas);

console.log("✅ Game initialized successfully!");
console.log("Canvas:", canvas);
console.log("Game object:", game);

// @ts-ignore
(window as any).game = game;

// Auto-start the game after a short delay to allow audio context initialization
setTimeout(() => {
  try {
    console.log("Attempting to auto-start game...");
    console.log("Current status:", game.status);
    if (game.status === "IDLE") {
      console.log("Starting game...");
      game.start();
      console.log("Game started successfully!");
    }
  } catch (error) {
    console.error("Error auto-starting game:", error);
  }
}, 1500);

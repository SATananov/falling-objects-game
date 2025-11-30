import "./style.css";

// Simple, reliable game version
interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  alive: boolean;
  color: string;
  type: string;
}

class SimpleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private objects: GameObject[] = [];
  private player: GameObject;
  private score = 0;
  private level = 1;
  private running = false;
  private lastTime = Date.now();
  private spawnCounter = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cannot get canvas context");
    this.ctx = ctx;

    // Create player
    this.player = {
      x: canvas.width / 2,
      y: canvas.height - 40,
      width: 80,
      height: 20,
      vx: 0,
      vy: 0,
      alive: true,
      color: "#00ff00",
      type: "player"
    };

    this.setupControls();
    this.render();
  }

  private setupControls(): void {
    // Keyboard
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a") this.player.vx = -300;
      if (e.key === "ArrowRight" || e.key === "d") this.player.vx = 300;
    });
    window.addEventListener("keyup", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "ArrowRight" || e.key === "d") {
        this.player.vx = 0;
      }
    });

    // Mouse/Touch
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      this.player.x = Math.max(40, Math.min(this.canvas.width - 40, x));
    });

    this.canvas.addEventListener("touchmove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.touches[0].clientX - rect.left) * (this.canvas.width / rect.width);
      this.player.x = Math.max(40, Math.min(this.canvas.width - 40, x));
    });
  }

  start(): void {
    console.log("🎮 Game starting...");
    this.running = true;
    this.lastTime = Date.now();
    this.gameLoop();
  }

  stop(): void {
    this.running = false;
  }

  private gameLoop = (): void => {
    if (!this.running) return;

    const now = Date.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Update player
    this.player.x += this.player.vx * dt;
    this.player.x = Math.max(40, Math.min(this.canvas.width - 40, this.player.x));

    // Spawn objects
    this.spawnCounter += dt;
    if (this.spawnCounter > 0.5 / this.level) {
      this.spawnObject();
      this.spawnCounter = 0;
    }

    // Update objects
    for (let obj of this.objects) {
      obj.y += obj.vy * dt;
      if (obj.y > this.canvas.height) obj.alive = false;

      // Collision
      if (this.collides(obj, this.player)) {
        this.score += 10 * this.level;
        obj.alive = false;
        if (this.score % 100 === 0) this.level++;
        this.playSound(800, 0.1);
      }
    }

    // Remove dead objects
    this.objects = this.objects.filter((o) => o.alive);

    this.render();
    requestAnimationFrame(this.gameLoop);
  };

  private spawnObject(): void {
    const colors = ["#ff9f80", "#ffdf6e", "#85e3ff", "#baffc9"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const speed = 100 + this.level * 50 + Math.random() * 100;

    this.objects.push({
      x: Math.random() * (this.canvas.width - 30) + 15,
      y: -30,
      width: 30,
      height: 30,
      vx: 0,
      vy: speed,
      alive: true,
      color: color,
      type: "object"
    });
  }

  private collides(a: GameObject, b: GameObject): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#020617");
    grad.addColorStop(1, "#020b3d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Draw objects
    for (let obj of this.objects) {
      ctx.fillStyle = obj.color;
      ctx.fillRect(obj.x - obj.width / 2, obj.y - obj.height / 2, obj.width, obj.height);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.x - obj.width / 2, obj.y - obj.height / 2, obj.width, obj.height);
    }

    // Draw player
    ctx.fillStyle = this.player.color;
    ctx.fillRect(
      this.player.x - this.player.width / 2,
      this.player.y - this.player.height / 2,
      this.player.width,
      this.player.height
    );
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      this.player.x - this.player.width / 2,
      this.player.y - this.player.height / 2,
      this.player.width,
      this.player.height
    );

    // Draw HUD
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px Arial";
    ctx.fillText(`Score: ${this.score}`, 20, 30);
    ctx.fillText(`Level: ${this.level}`, 20, 60);
    ctx.fillText(`Objects: ${this.objects.length}`, 20, 90);

    if (!this.running) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#44ff44";
      ctx.font = "40px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🚀 CLICK TO START", w / 2, h / 2 - 40);
      ctx.font = "20px Arial";
      ctx.fillText("Use Arrow Keys or Mouse", w / 2, h / 2 + 30);
    }
  }

  private playSound(freq: number, duration: number): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + duration);
    } catch (e) {
      console.log("Audio not available");
    }
  }
}

// Initialize game
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
if (canvas) {
  const game = new SimpleGame(canvas);

  // Auto-start
  setTimeout(() => {
    console.log("Auto-starting game...");
    game.start();
  }, 1000);

  // Click to restart
  canvas.addEventListener("click", () => {
    if (!game["running"]) {
      game.start();
    }
  });

  (window as any).game = game;
  console.log("✅ Game ready! (auto-start in 1 second)");
} else {
  console.error("Canvas not found!");
}

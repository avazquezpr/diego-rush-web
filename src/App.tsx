import { useEffect, useMemo, useRef, useState } from 'react'
import Phaser from 'phaser'
import { GameAudio } from './audio'
import runSheet from './assets/sprites/diego_run_sheet.png'
import idleSheet from './assets/sprites/diego_idle_sheet.png'
import jumpSheet from './assets/sprites/diego_jump_sheet.png'
import portraitImg from './assets/sprites/portrait.png'
import heartImg from './assets/sprites/hud_heart.png'
import energyImg from './assets/sprites/hud_energy.png'
import panelImg from './assets/sprites/panel.png'
import './App.css'

type GamePhase = 'menu' | 'playing' | 'gameover'
type SceneAudioEvent = 'jump' | 'hit' | 'score'

type LoreCard = {
  id: number
  title: string
  body: string
  unlockScore: number
}

const HIGH_SCORE_KEY = 'diego-rush-high-score'
const AUDIO_MUTE_KEY = 'diego-rush-mute'
const AUDIO_MUSIC_VOL_KEY = 'diego-rush-music-vol'
const AUDIO_SFX_VOL_KEY = 'diego-rush-sfx-vol'

const LORE_CARDS: LoreCard[] = [
  { id: 1, title: 'Card 01 · The First Sprint', body: 'Diego learned to outrun storms before breakfast.', unlockScore: 10 },
  { id: 2, title: 'Card 02 · Jetpack Boots', body: 'Prototype boots made every jump feel illegal.', unlockScore: 20 },
  { id: 3, title: 'Card 03 · Neon Bay', body: 'He raced lights on the pier and won by a mile.', unlockScore: 30 },
  { id: 4, title: 'Card 04 · Wind Whisperer', body: 'The wind started moving out of Diego’s way.', unlockScore: 40 },
  { id: 5, title: 'Card 05 · Rooftop Oath', body: 'He swore to never miss a rooftop landing again.', unlockScore: 50 },
  { id: 6, title: 'Card 06 · Ghost Route', body: 'A hidden lane appears only to fearless runners.', unlockScore: 60 },
  { id: 7, title: 'Card 07 · Pulse Reactor', body: 'His heartbeat synced with the city grid.', unlockScore: 75 },
  { id: 8, title: 'Card 08 · The Quiet Rival', body: 'Someone fast is watching every move.', unlockScore: 90 },
  { id: 9, title: 'Card 09 · Final Sector', body: 'Every obstacle now feels personal.', unlockScore: 110 },
  { id: 10, title: 'Card 10 · Diego Rush', body: 'Legend confirmed. The city runs at Diego speed.', unlockScore: 130 },
]

class DiegoRushScene extends Phaser.Scene {
  private readonly onScoreUpdate: (score: number) => void
  private readonly onGameOver: (score: number) => void
  private readonly onAudioEvent: (event: SceneAudioEvent) => void
  private readonly onRuntimeUpdate: (seconds: number) => void

  private phaseRef: React.MutableRefObject<GamePhase>

  private player!: Phaser.Physics.Arcade.Sprite
  private obstacles!: Phaser.Physics.Arcade.Group
  private pickups!: Phaser.Physics.Arcade.Group
  private skyFar!: Phaser.GameObjects.TileSprite
  private skyMid!: Phaser.GameObjects.TileSprite
  private skyNear!: Phaser.GameObjects.TileSprite
  private starfield!: Phaser.GameObjects.TileSprite
  private score = 0
  private spawnTimer?: Phaser.Time.TimerEvent
  private scoreElapsed = 0
  private runtimeElapsed = 0
  private runtimeSeconds = 0
  private progress = 0
  private gameWidth = 390
  private gameHeight = 720

  constructor(
    phaseRef: React.MutableRefObject<GamePhase>,
    onScoreUpdate: (score: number) => void,
    onGameOver: (score: number) => void,
    onAudioEvent: (event: SceneAudioEvent) => void,
    onRuntimeUpdate: (seconds: number) => void,
  ) {
    super('DiegoRushScene')
    this.phaseRef = phaseRef
    this.onScoreUpdate = onScoreUpdate
    this.onGameOver = onGameOver
    this.onAudioEvent = onAudioEvent
    this.onRuntimeUpdate = onRuntimeUpdate
  }

  preload() {
    this.createTextures()
    this.load.spritesheet('diego-run', runSheet, { frameWidth: 96, frameHeight: 128 })
    this.load.spritesheet('diego-idle', idleSheet, { frameWidth: 96, frameHeight: 128 })
    this.load.spritesheet('diego-jump', jumpSheet, { frameWidth: 96, frameHeight: 128 })
    this.load.image('hud-portrait', portraitImg)
    this.load.image('hud-heart', heartImg)
    this.load.image('hud-energy', energyImg)
    this.load.image('hud-panel', panelImg)
  }

  create() {
    this.handleResize(this.scale.width, this.scale.height)

    this.skyFar = this.add.tileSprite(0, 0, this.gameWidth, this.gameHeight, 'bg-far').setOrigin(0)
    this.skyMid = this.add.tileSprite(0, 0, this.gameWidth, this.gameHeight, 'bg-mid').setOrigin(0).setAlpha(0.7)
    this.starfield = this.add.tileSprite(0, 0, this.gameWidth, this.gameHeight, 'bg-stars').setOrigin(0).setAlpha(0.55)
    this.skyNear = this.add.tileSprite(0, 0, this.gameWidth, this.gameHeight, 'bg-near').setOrigin(0).setAlpha(0.95)

    if (!this.anims.exists('diego-run-loop')) {
      this.anims.create({ key: 'diego-run-loop', frames: this.anims.generateFrameNumbers('diego-run', { start: 0, end: 3 }), frameRate: 10, repeat: -1 })
      this.anims.create({ key: 'diego-idle-loop', frames: this.anims.generateFrameNumbers('diego-idle', { start: 0, end: 1 }), frameRate: 4, repeat: -1 })
      this.anims.create({ key: 'diego-jump-pose', frames: [{ key: 'diego-jump', frame: 0 }], frameRate: 1, repeat: 0 })
    }

    this.player = this.physics.add.sprite(this.gameWidth * 0.3, this.gameHeight * 0.5, 'diego-run', 0)
    this.player.setDisplaySize(86, 114)
    this.player.setCircle(24, 24, 24)
    this.player.setBounce(0.1)
    this.player.setCollideWorldBounds(false)
    this.player.play('diego-idle-loop')

    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true })
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true })

    const spark = this.add.particles(0, 0, 'dust-particle', {
      lifespan: { min: 350, max: 900 },
      speedX: { min: -30, max: -120 },
      speedY: { min: -35, max: 35 },
      quantity: 1,
      alpha: { start: 0.5, end: 0 },
      scale: { start: 0.45, end: 0 },
      blendMode: 'ADD',
      follow: this.player,
      followOffset: { x: -30, y: 18 },
    })
    spark.setDepth(6)

    this.input.on('pointerdown', () => this.flap())
    this.input.keyboard?.on('keydown-SPACE', () => this.flap())

    this.physics.add.collider(this.player, this.obstacles, () => this.endRun(), undefined, this)
    this.physics.add.overlap(this.player, this.pickups, (_, pickup) => {
      const orb = pickup as Phaser.Physics.Arcade.Image
      if (orb.getData('collected')) return
      orb.setData('collected', true)
      this.score += 3
      this.onScoreUpdate(this.score)
      this.tweens.add({ targets: orb, scale: 1.8, alpha: 0, duration: 180, onComplete: () => orb.destroy() })
      this.onAudioEvent('score')
    })

    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      this.handleResize(size.width, size.height)
    })
  }

  startRun() {
    this.phaseRef.current = 'playing'
    this.score = 0
    this.scoreElapsed = 0
    this.runtimeElapsed = 0
    this.runtimeSeconds = 0
    this.progress = 0
    this.onRuntimeUpdate(0)
    this.onScoreUpdate(0)

    this.obstacles.clear(true, true)
    this.pickups.clear(true, true)

    this.player.setPosition(this.gameWidth * 0.3, this.gameHeight * 0.5)
    this.player.setVelocity(0, 0)
    this.player.setAngle(0)
    this.player.play('diego-run-loop', true)

    this.spawnTimer?.remove(false)
    this.spawnTimer = this.time.addEvent({
      delay: 1400,
      callback: this.spawnObstaclePair,
      callbackScope: this,
      loop: true,
    })
  }

  flap() {
    if (this.phaseRef.current !== 'playing') return
    this.player.setVelocityY(-380)
    this.player.setAngle(-18)
    this.player.play('diego-jump-pose', true)
    this.onAudioEvent('jump')
  }

  update(_: number, delta: number) {
    this.skyFar.tilePositionX += 0.15
    this.skyMid.tilePositionX += 0.35
    this.starfield.tilePositionX += 0.6
    this.skyNear.tilePositionX += 0.95

    if (this.phaseRef.current !== 'playing') return

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.player.setAngle(Phaser.Math.Clamp(playerBody.velocity.y * 0.05, -20, 60))
    if (playerBody.velocity.y < -40) {
      if (this.player.anims.currentAnim?.key !== 'diego-jump-pose') this.player.play('diego-jump-pose', true)
    } else if (this.player.anims.currentAnim?.key !== 'diego-run-loop') {
      this.player.play('diego-run-loop', true)
    }

    this.scoreElapsed += delta
    if (this.scoreElapsed >= 150) {
      this.score += 1
      this.scoreElapsed = 0
      this.onScoreUpdate(this.score)
    }

    this.runtimeElapsed += delta
    if (this.runtimeElapsed >= 1000) {
      this.runtimeElapsed = 0
      this.runtimeSeconds += 1
      this.onRuntimeUpdate(this.runtimeSeconds)
      this.progress = Math.min(1, this.progress + 0.01)
    }

    this.obstacles.getChildren().forEach((child) => {
      const obstacle = child as Phaser.Physics.Arcade.Image & { passed?: boolean }
      if (obstacle.x + obstacle.width < 0) {
        obstacle.destroy()
        return
      }

      if (!obstacle.passed && obstacle.getData('isTop') && obstacle.x < this.player.x) {
        obstacle.passed = true
        this.score += 5
        this.progress = Math.min(1, this.progress + 0.03)
        this.onScoreUpdate(this.score)
        this.onAudioEvent('score')
      }
    })

    this.pickups.getChildren().forEach((child) => {
      const pickup = child as Phaser.Physics.Arcade.Image
      pickup.rotation += 0.05
      if (pickup.x + pickup.width < -20) pickup.destroy()
    })

    if (this.player.y < -20 || this.player.y > this.gameHeight - 20) {
      this.endRun()
    }
  }

  getProgress() {
    return this.progress
  }

  private spawnObstaclePair() {
    const gap = Phaser.Math.Between(150, 180)
    const centerY = Phaser.Math.Between(180, this.gameHeight - 180)
    const halfGap = gap / 2

    const topHeight = centerY - halfGap
    const bottomY = centerY + halfGap

    const top = this.physics.add.image(this.gameWidth + 40, topHeight / 2, 'obstacle')
    top.setDisplaySize(72, topHeight)
    top.setVelocityX(-220)
    top.setImmovable(true)
    top.setData('isTop', true)

    const bottom = this.physics.add.image(this.gameWidth + 40, bottomY + (this.gameHeight - bottomY) / 2, 'obstacle')
    bottom.setDisplaySize(72, this.gameHeight - bottomY)
    bottom.setVelocityX(-220)
    bottom.setImmovable(true)
    bottom.setData('isTop', false)

    const orbY = Phaser.Math.Between(topHeight + 40, bottomY - 40)
    const orb = this.physics.add.image(this.gameWidth + 44, orbY, 'pickup-orb')
    orb.setDisplaySize(28, 28)
    orb.setVelocityX(-220)
    orb.setImmovable(true)
    orb.setAlpha(0.95)
    orb.setData('collected', false)

    this.tweens.add({ targets: orb, y: orbY - 12, yoyo: true, repeat: -1, duration: 550, ease: 'Sine.easeInOut' })

    this.obstacles.add(top)
    this.obstacles.add(bottom)
    this.pickups.add(orb)
  }

  private endRun() {
    if (this.phaseRef.current !== 'playing') return

    this.phaseRef.current = 'gameover'
    this.spawnTimer?.remove(false)
    this.player.setVelocity(0, 0)
    this.player.play('diego-idle-loop', true)
    this.onAudioEvent('hit')
    this.onGameOver(this.score)
  }

  private handleResize(width: number, height: number) {
    this.gameWidth = width
    this.gameHeight = height
    this.cameras.main.setViewport(0, 0, width, height)
    this.skyFar?.setSize(width, height)
    this.skyMid?.setSize(width, height)
    this.skyNear?.setSize(width, height)
    this.starfield?.setSize(width, height)
  }

  private createTextures() {
    if (this.textures.exists('obstacle')) return

    const g = this.add.graphics()

    g.fillGradientStyle(0x2e2a75, 0x4f2f84, 0x161c3f, 0x101329, 1)
    g.fillRoundedRect(0, 0, 72, 420, 18)
    g.lineStyle(4, 0xb674ff, 0.9)
    g.strokeRoundedRect(3, 3, 66, 414, 16)
    g.fillStyle(0xffffff, 0.07)
    for (let y = 16; y < 410; y += 24) g.fillRect(10, y, 52, 2)
    g.generateTexture('obstacle', 72, 420)
    g.clear()

    g.fillGradientStyle(0x0a0f24, 0x0a0f24, 0x141a36, 0x141a36, 1)
    g.fillRect(0, 0, 64, 64)
    g.generateTexture('bg-far', 64, 64)
    g.clear()

    g.fillGradientStyle(0x11183a, 0x11183a, 0x1b244f, 0x1b244f, 1)
    g.fillRect(0, 0, 64, 64)
    g.fillStyle(0x995eff, 0.15)
    g.fillRect(0, 42, 64, 6)
    g.fillStyle(0x6dc5ff, 0.1)
    g.fillRect(0, 52, 64, 4)
    g.generateTexture('bg-mid', 64, 64)
    g.clear()

    g.fillGradientStyle(0x161f44, 0x161f44, 0x2f2f5e, 0x2f2f5e, 1)
    g.fillRect(0, 0, 64, 64)
    g.fillStyle(0xff8844, 0.12)
    g.fillRect(0, 56, 64, 8)
    g.fillStyle(0xffffff, 0.08)
    g.fillRect(12, 34, 6, 10)
    g.fillRect(30, 28, 5, 16)
    g.fillRect(47, 24, 7, 20)
    g.generateTexture('bg-near', 64, 64)
    g.clear()

    g.fillStyle(0xffffff, 0)
    g.fillRect(0, 0, 96, 96)
    for (let i = 0; i < 36; i += 1) {
      const x = Phaser.Math.Between(2, 94)
      const y = Phaser.Math.Between(2, 94)
      const r = Phaser.Math.Between(1, 2)
      g.fillStyle(Phaser.Math.Between(0, 1) ? 0x99e6ff : 0xd8b4ff, Phaser.Math.FloatBetween(0.35, 0.9))
      g.fillCircle(x, y, r)
    }
    g.generateTexture('bg-stars', 96, 96)
    g.clear()

    g.fillStyle(0x7ff9ff, 1)
    g.fillCircle(14, 14, 12)
    g.lineStyle(2, 0xdfffff, 0.9)
    g.strokeCircle(14, 14, 12)
    g.fillStyle(0xffffff, 0.7)
    g.fillCircle(9, 9, 3)
    g.generateTexture('pickup-orb', 28, 28)
    g.clear()

    g.fillStyle(0x74e3ff, 1)
    g.fillCircle(4, 4, 4)
    g.generateTexture('dust-particle', 8, 8)

    g.destroy()
  }
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function App() {
  const gameHostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const sceneRef = useRef<DiegoRushScene | null>(null)
  const phaseRef = useRef<GamePhase>('menu')
  const audioRef = useRef(new GameAudio())

  const [phase, setPhase] = useState<GamePhase>('menu')
  const [score, setScore] = useState(0)
  const [runtime, setRuntime] = useState(0)
  const [progress, setProgress] = useState(0)
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = Number(localStorage.getItem(HIGH_SCORE_KEY) ?? 0)
    return Number.isFinite(saved) ? saved : 0
  })
  const [isMuted, setIsMuted] = useState(localStorage.getItem(AUDIO_MUTE_KEY) === '1')
  const [musicVolume, setMusicVolume] = useState<number>(() => {
    const saved = Number(localStorage.getItem(AUDIO_MUSIC_VOL_KEY) ?? 0.5)
    return Number.isFinite(saved) ? saved : 0.5
  })
  const [sfxVolume, setSfxVolume] = useState<number>(() => {
    const saved = Number(localStorage.getItem(AUDIO_SFX_VOL_KEY) ?? 0.8)
    return Number.isFinite(saved) ? saved : 0.8
  })

  const unlockedCards = useMemo(() => LORE_CARDS.filter((card) => highScore >= card.unlockScore), [highScore])

  useEffect(() => {
    if (!gameHostRef.current) return

    const scene = new DiegoRushScene(
      phaseRef,
      setScore,
      (finalScore: number) => {
        setPhase('gameover')
        const nextHigh = Math.max(finalScore, Number(localStorage.getItem(HIGH_SCORE_KEY) ?? 0))
        localStorage.setItem(HIGH_SCORE_KEY, String(nextHigh))
        setHighScore(nextHigh)
        setProgress(sceneRef.current?.getProgress() ?? 0)
        audioRef.current.playSfx('gameOver')
      },
      (event: SceneAudioEvent) => {
        if (event === 'jump') audioRef.current.playSfx('jump')
        if (event === 'hit') audioRef.current.playSfx('hit')
        if (event === 'score') audioRef.current.playSfx('score')
      },
      (seconds) => {
        setRuntime(seconds)
        setProgress(sceneRef.current?.getProgress() ?? 0)
      },
    )

    sceneRef.current = scene

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: gameHostRef.current.clientWidth || 390,
      height: gameHostRef.current.clientHeight || 720,
      parent: gameHostRef.current,
      transparent: true,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 1200 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [scene],
    })

    gameRef.current = game

    const resizeObserver = new ResizeObserver(() => {
      const host = gameHostRef.current
      if (!host || !gameRef.current) return
      gameRef.current.scale.resize(host.clientWidth, host.clientHeight)
    })

    resizeObserver.observe(gameHostRef.current)

    return () => {
      resizeObserver.disconnect()
      game.destroy(true)
      gameRef.current = null
      sceneRef.current = null
      audioRef.current.stopMusic()
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(AUDIO_MUTE_KEY, isMuted ? '1' : '0')
    audioRef.current.setMuted(isMuted)
  }, [isMuted])

  useEffect(() => {
    localStorage.setItem(AUDIO_MUSIC_VOL_KEY, String(musicVolume))
    audioRef.current.setVolume('music', musicVolume)
  }, [musicVolume])

  useEffect(() => {
    localStorage.setItem(AUDIO_SFX_VOL_KEY, String(sfxVolume))
    audioRef.current.setVolume('sfx', sfxVolume)
  }, [sfxVolume])

  useEffect(() => {
    if (phase === 'playing') {
      audioRef.current.playGameplayMusic()
    } else {
      audioRef.current.playMenuMusic()
    }
  }, [phase])

  const unlockAndClick = () => {
    audioRef.current.unlock()
    audioRef.current.playSfx('uiClick')
  }

  const startGame = () => {
    unlockAndClick()
    phaseRef.current = 'playing'
    setPhase('playing')
    setScore(0)
    setRuntime(0)
    setProgress(0)
    sceneRef.current?.startRun()
  }

  const onToggleMute = () => {
    unlockAndClick()
    setIsMuted((prev) => !prev)
  }

  return (
    <main className="arena-shell">
      <div className="vignette" />
      <section className="game-stage">
        <div ref={gameHostRef} className="game-canvas" />
      </section>

      <section className="top-chips">
        <div className="chip">Pilot: Diego</div>
        <div className="chip">Run: {formatTime(runtime)}</div>
        <div className={`chip status ${phase}`}>Status: {phase === 'playing' ? 'RUSHING' : phase.toUpperCase()}</div>
      </section>

      <aside className="left-panel">
        <header>
          <img src={panelImg} alt="hud" className="panel-base" />
          <img src={portraitImg} alt="Diego portrait" className="portrait" />
          <h1>Diego Rush</h1>
        </header>
        <div className="stat-row"><span>Score</span><strong>{score}</strong></div>
        <div className="stat-row"><span>High</span><strong>{highScore}</strong></div>
        <div className="stat-row"><span>Buffs</span><strong>—</strong></div>
        <div className="icons-row">
          <img src={heartImg} alt="health" />
          <img src={energyImg} alt="energy" />
        </div>
        <button className="audio-toggle" onClick={onToggleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
        <label>
          Music {Math.round(musicVolume * 100)}%
          <input type="range" min={0} max={100} value={Math.round(musicVolume * 100)} onPointerDown={unlockAndClick} onChange={(e) => setMusicVolume(Number(e.target.value) / 100)} />
        </label>
        <label>
          SFX {Math.round(sfxVolume * 100)}%
          <input type="range" min={0} max={100} value={Math.round(sfxVolume * 100)} onPointerDown={unlockAndClick} onChange={(e) => setSfxVolume(Number(e.target.value) / 100)} />
        </label>
      </aside>

      <aside className="right-panel">
        <h2>Sector Map</h2>
        <div className="mini-grid">
          <div className="scanline" />
          <div className="tracker" style={{ left: `${Math.max(4, Math.round(progress * 92))}%` }} />
        </div>
        <div className="progress-row"><span>Run Progress</span><strong>{Math.round(progress * 100)}%</strong></div>
        <div className="progress-bar"><span style={{ width: `${Math.max(4, progress * 100)}%` }} /></div>
        <p className="lore-inline">Lore unlocked: {unlockedCards.length}/10</p>
      </aside>

      {phase === 'menu' && (
        <div className="overlay">
          <h2>Arena Link Online</h2>
          <p>Tap, click or press SPACE to keep Diego alive through the wasteland lanes.</p>
          <button onClick={startGame}>Start Run</button>
        </div>
      )}

      {phase === 'gameover' && (
        <div className="overlay gameover">
          <h2>Transmission Lost</h2>
          <p>Final Score: {score}</p>
          <p>High Score: {highScore}</p>
          <button onClick={startGame}>Run Again</button>
        </div>
      )}
    </main>
  )
}

export default App

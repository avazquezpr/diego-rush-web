import { useEffect, useMemo, useRef, useState } from 'react'
import Phaser from 'phaser'
import { GameAudio } from './audio'
import runSheet from './assets/sprites/diego/diego_run_sheet.png'
import idleSheet from './assets/sprites/diego/diego_idle_sheet.png'
import jumpSheet from './assets/sprites/diego/diego_jump_sheet.png'
import obstacleAImg from './assets/sprites/obstacles/obstacle_pillar_a.png'
import obstacleBImg from './assets/sprites/obstacles/obstacle_pillar_b.png'
import pickupOrbImg from './assets/sprites/pickups/pickup_orb.png'
import propFireImg from './assets/sprites/props/prop_fire.png'
import propCrateImg from './assets/sprites/props/prop_crate.png'
import propPlantImg from './assets/sprites/props/prop_plant.png'
import propSkullImg from './assets/sprites/props/prop_skull.png'
import propTorchImg from './assets/sprites/props/prop_torch.png'
import bgFarImg from './assets/backgrounds/bg_far.png'
import bgMidImg from './assets/backgrounds/bg_mid.png'
import bgNearImg from './assets/backgrounds/bg_near.png'
import bgStarsImg from './assets/backgrounds/bg_stars.png'
import portraitImg from './assets/ui/diego_portrait.png'
import heartImg from './assets/ui/icon_heart.png'
import energyImg from './assets/ui/icon_energy.png'
import coinImg from './assets/ui/icon_coin.png'
import panelImg from './assets/ui/panel_frame.png'
import logoImg from './assets/ui/logo_diego_rush.png'
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
  private props!: Phaser.Physics.Arcade.Group
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
  private orbFloatTweens = new Set<Phaser.Tweens.Tween>()
  private trailFx?: Phaser.GameObjects.Particles.ParticleEmitter
  private pointerHandler?: () => void
  private spaceHandler?: () => void
  private resizeHandler?: (size: Phaser.Structs.Size) => void

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
    this.load.spritesheet('diego-run', runSheet, { frameWidth: 96, frameHeight: 128 })
    this.load.spritesheet('diego-idle', idleSheet, { frameWidth: 96, frameHeight: 128 })
    this.load.spritesheet('diego-jump', jumpSheet, { frameWidth: 96, frameHeight: 128 })
    this.load.image('obstacle-a', obstacleAImg)
    this.load.image('obstacle-b', obstacleBImg)
    this.load.image('pickup-orb', pickupOrbImg)
    this.load.image('prop-fire', propFireImg)
    this.load.image('prop-crate', propCrateImg)
    this.load.image('prop-plant', propPlantImg)
    this.load.image('prop-skull', propSkullImg)
    this.load.image('prop-torch', propTorchImg)
    this.load.image('bg-far', bgFarImg)
    this.load.image('bg-mid', bgMidImg)
    this.load.image('bg-near', bgNearImg)
    this.load.image('bg-stars', bgStarsImg)
    this.load.image('hud-portrait', portraitImg)
    this.load.image('hud-heart', heartImg)
    this.load.image('hud-energy', energyImg)
    this.load.image('hud-panel', panelImg)
  }

  create() {
    this.handleResize(this.scale.width, this.scale.height)
    this.cameras.main.setRoundPixels(true)

    ;['diego-run', 'diego-idle', 'diego-jump', 'obstacle-a', 'obstacle-b', 'pickup-orb', 'prop-fire', 'prop-crate', 'prop-plant', 'prop-skull', 'prop-torch', 'bg-far', 'bg-mid', 'bg-near', 'bg-stars'].forEach((key) => {
      this.textures.get(key)?.setFilter(Phaser.Textures.FilterMode.NEAREST)
    })

    this.skyFar = this.add.tileSprite(0, 0, this.gameWidth, this.gameHeight, 'bg-far').setOrigin(0)
    this.skyMid = this.add.tileSprite(0, 0, this.gameWidth, this.gameHeight, 'bg-mid').setOrigin(0).setAlpha(0.76)
    this.starfield = this.add.tileSprite(0, 0, this.gameWidth, this.gameHeight, 'bg-stars').setOrigin(0).setAlpha(0.5)
    this.skyNear = this.add.tileSprite(0, 0, this.gameWidth, this.gameHeight, 'bg-near').setOrigin(0).setAlpha(0.96)

    if (!this.anims.exists('diego-run-loop')) {
      this.anims.create({ key: 'diego-run-loop', frames: this.anims.generateFrameNumbers('diego-run', { start: 0, end: 5 }), frameRate: 12, repeat: -1 })
      this.anims.create({ key: 'diego-idle-loop', frames: this.anims.generateFrameNumbers('diego-idle', { start: 0, end: 3 }), frameRate: 6, repeat: -1 })
      this.anims.create({ key: 'diego-jump-pose', frames: this.anims.generateFrameNumbers('diego-jump', { start: 0, end: 1 }), frameRate: 6, repeat: -1 })
    }

    this.player = this.physics.add.sprite(this.gameWidth * 0.3, this.gameHeight * 0.5, 'diego-run', 0)
    this.player.setDisplaySize(86, 114)
    this.player.setCircle(24, 24, 24)
    this.player.setBounce(0.1)
    this.player.setCollideWorldBounds(false)
    this.player.play('diego-idle-loop')

    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true })
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true })
    this.props = this.physics.add.group({ allowGravity: false, immovable: true })

    this.trailFx = this.add.particles(0, 0, 'pickup-orb', {
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
    this.trailFx.setDepth(6)

    this.pointerHandler = () => this.flap()
    this.spaceHandler = () => this.flap()
    this.input.on('pointerdown', this.pointerHandler)
    this.input.keyboard?.on('keydown-SPACE', this.spaceHandler)

    this.physics.add.collider(this.player, this.obstacles, () => this.endRun(), undefined, this)
    this.physics.add.overlap(this.player, this.pickups, (_, pickup) => {
      const orb = pickup as Phaser.Physics.Arcade.Image
      if (orb.getData('collected')) return
      orb.setData('collected', true)
      this.score += 3
      this.onScoreUpdate(this.score)
      this.clearOrbTween(orb)
      this.tweens.add({ targets: orb, scale: 1.8, alpha: 0, duration: 180, onComplete: () => orb.destroy() })
      this.onAudioEvent('score')
    })

    this.resizeHandler = (size: Phaser.Structs.Size) => {
      this.handleResize(size.width, size.height)
    }
    this.scale.on('resize', this.resizeHandler)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onSceneShutdown, this)
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onSceneShutdown, this)
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

    this.cleanupSpawnedObjects()

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
      if (pickup.x + pickup.width < -20) {
        this.clearOrbTween(pickup)
        pickup.destroy()
      }
    })

    this.props.getChildren().forEach((child) => {
      const prop = child as Phaser.Physics.Arcade.Image
      if (prop.x + prop.width < -40) prop.destroy()
    })

    if (this.player.y < -20 || this.player.y > this.gameHeight - 20) {
      this.endRun()
    }
  }

  getProgress() {
    return this.progress
  }

  private spawnObstaclePair() {
    if (this.obstacles.countActive(true) > 36 || this.pickups.countActive(true) > 18 || this.props.countActive(true) > 20) {
      this.trimOldSpawnedObjects()
      return
    }

    const gap = Phaser.Math.Between(150, 180)
    const centerY = Phaser.Math.Between(180, this.gameHeight - 180)
    const halfGap = gap / 2

    const topHeight = centerY - halfGap
    const bottomY = centerY + halfGap

    const obstacleKey = Phaser.Math.Between(0, 1) ? 'obstacle-a' : 'obstacle-b'
    const top = this.physics.add.image(this.gameWidth + 40, topHeight / 2, obstacleKey)
    top.setDisplaySize(72, topHeight)
    top.setVelocityX(-220)
    top.setImmovable(true)
    top.setData('isTop', true)

    const bottom = this.physics.add.image(this.gameWidth + 40, bottomY + (this.gameHeight - bottomY) / 2, obstacleKey)
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

    const floatTween = this.tweens.add({ targets: orb, y: orbY - 12, yoyo: true, repeat: -1, duration: 550, ease: 'Sine.easeInOut' })
    this.orbFloatTweens.add(floatTween)
    orb.setData('floatTween', floatTween)

    if (Phaser.Math.Between(0, 100) < 72) {
      const propOptions = ['prop-fire', 'prop-crate', 'prop-plant', 'prop-skull', 'prop-torch']
      const propKey = propOptions[Phaser.Math.Between(0, propOptions.length - 1)]
      const propY = Phaser.Math.Between(56, this.gameHeight - 56)
      const prop = this.physics.add.image(this.gameWidth + Phaser.Math.Between(90, 170), propY, propKey)
      prop.setVelocityX(-220)
      prop.setImmovable(true)
      prop.setAlpha(0.8)
      prop.setScale(propKey === 'prop-plant' ? 0.84 : 0.72)
      this.props.add(prop)
    }

    this.obstacles.add(top)
    this.obstacles.add(bottom)
    this.pickups.add(orb)
  }

  private endRun() {
    if (this.phaseRef.current !== 'playing') return

    this.phaseRef.current = 'gameover'
    this.spawnTimer?.remove(false)
    this.spawnTimer = undefined
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

  private clearOrbTween(orb: Phaser.Physics.Arcade.Image) {
    const tween = orb.getData('floatTween') as Phaser.Tweens.Tween | undefined
    if (tween) {
      tween.stop()
      this.orbFloatTweens.delete(tween)
    }
    orb.setData('floatTween', undefined)
  }

  private trimOldSpawnedObjects() {
    const obstacleChildren = this.obstacles.getChildren() as Phaser.Physics.Arcade.Image[]
    const pickupChildren = this.pickups.getChildren() as Phaser.Physics.Arcade.Image[]
    const propChildren = this.props.getChildren() as Phaser.Physics.Arcade.Image[]
    obstacleChildren.slice(0, 8).forEach((obstacle) => obstacle.destroy())
    pickupChildren.slice(0, 4).forEach((pickup) => {
      this.clearOrbTween(pickup)
      pickup.destroy()
    })
    propChildren.slice(0, 6).forEach((prop) => prop.destroy())
  }

  private cleanupSpawnedObjects() {
    ;(this.pickups.getChildren() as Phaser.Physics.Arcade.Image[]).forEach((pickup) => this.clearOrbTween(pickup))
    this.orbFloatTweens.forEach((tween) => tween.stop())
    this.orbFloatTweens.clear()
    this.obstacles.clear(true, true)
    this.pickups.clear(true, true)
    this.props.clear(true, true)
  }

  private onSceneShutdown() {
    this.spawnTimer?.remove(false)
    this.spawnTimer = undefined
    this.cleanupSpawnedObjects()
    this.trailFx?.stop()
    this.trailFx?.destroy()
    this.input.off('pointerdown', this.pointerHandler)
    this.input.keyboard?.off('keydown-SPACE', this.spaceHandler)
    if (this.resizeHandler) this.scale.off('resize', this.resizeHandler)
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

    const audio = audioRef.current
    const scene = new DiegoRushScene(
      phaseRef,
      setScore,
      (finalScore: number) => {
        setPhase('gameover')
        const nextHigh = Math.max(finalScore, Number(localStorage.getItem(HIGH_SCORE_KEY) ?? 0))
        localStorage.setItem(HIGH_SCORE_KEY, String(nextHigh))
        setHighScore(nextHigh)
        setProgress(sceneRef.current?.getProgress() ?? 0)
        audio.playSfx('gameOver')
      },
      (event: SceneAudioEvent) => {
        if (event === 'jump') audio.playSfx('jump')
        if (event === 'hit') audio.playSfx('hit')
        if (event === 'score') audio.playSfx('score')
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
      pixelArt: true,
      render: {
        antialias: false,
        pixelArt: true,
        roundPixels: true,
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
      audio.stopMusic()
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
          <img src={logoImg} alt="Diego Rush" className="logo-title" />
        </header>
        <div className="stat-row"><span>Score</span><strong>{score}</strong></div>
        <div className="stat-row"><span>High</span><strong>{highScore}</strong></div>
        <div className="stat-row"><span>Buffs</span><strong>—</strong></div>
        <div className="icons-row">
          <img src={heartImg} alt="health" />
          <img src={energyImg} alt="energy" />
          <img src={coinImg} alt="coin" />
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

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
import logoImg from './assets/ui/logo_diego.png'
import './App.css'

type GamePhase = 'menu' | 'playing' | 'gameover'
type SceneAudioEvent = 'jump' | 'hit' | 'score'

type QualityProfile = {
  mobile: boolean
  spawnDelay: number
  trailFrequency: number
  trailScaleStart: number
  parallaxScale: number
  pickupRotationStep: number
  pickupRotationInterval: number
  maxObstacles: number
  maxPickups: number
  maxProps: number
  trimObstacles: number
  trimPickups: number
  trimProps: number
  propChance: number
  obstacleSpeed: number
  pickupSpeed: number
  trailEnabled: boolean
}

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
const PERFORMANCE_MODE_KEY = 'diego-rush-performance-mode'
const PROP_OPTIONS = ['prop-fire', 'prop-crate', 'prop-plant', 'prop-skull', 'prop-torch'] as const

const LORE_CARDS: LoreCard[] = [
  { id: 1, title: 'Crónica 01 · El Primer Impulso', body: 'Diego aprendió a correr contra la tormenta antes del amanecer.', unlockScore: 10 },
  { id: 2, title: 'Crónica 02 · Botas de Salto', body: 'Un prototipo peligroso convirtió cada salto en apuesta.', unlockScore: 20 },
  { id: 3, title: 'Crónica 03 · Bahía Neón', body: 'Corrió entre luces y ruinas hasta quedar invicto.', unlockScore: 30 },
  { id: 4, title: 'Crónica 04 · Voz del Viento', body: 'El viento dejó de ser obstáculo y se volvió guía.', unlockScore: 40 },
  { id: 5, title: 'Crónica 05 · Juramento en Altura', body: 'Prometió no volver a fallar un salto decisivo.', unlockScore: 50 },
  { id: 6, title: 'Crónica 06 · Ruta Fantasma', body: 'Solo quien no teme encuentra este camino oculto.', unlockScore: 60 },
  { id: 7, title: 'Crónica 07 · Pulso de la Isla', body: 'Su latido empezó a sincronizarse con las ruinas vivas.', unlockScore: 75 },
  { id: 8, title: 'Crónica 08 · Rival Silencioso', body: 'Alguien observa cada movimiento desde las sombras.', unlockScore: 90 },
  { id: 9, title: 'Crónica 09 · Último Sector', body: 'Cada obstáculo parece puesto para frenarlo.', unlockScore: 110 },
  { id: 10, title: 'Crónica 10 · Ahiacabo', body: 'La leyenda crece: solo los valientes llegan al final.', unlockScore: 130 },
]

function detectQualityProfile(): QualityProfile {
  if (typeof window === 'undefined') {
    return {
      mobile: false,
      spawnDelay: 1400,
      trailFrequency: 120,
      trailScaleStart: 0.45,
      parallaxScale: 1,
      pickupRotationStep: 0.05,
      pickupRotationInterval: 16,
      maxObstacles: 36,
      maxPickups: 18,
      maxProps: 20,
      trimObstacles: 8,
      trimPickups: 4,
      trimProps: 6,
      propChance: 72,
      obstacleSpeed: -205,
      pickupSpeed: -220,
      trailEnabled: true,
    }
  }

  const ua = window.navigator.userAgent
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobi|Mobile/i.test(ua)
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) <= 900
  const isMobile = isMobileUA || coarsePointer || smallScreen

  if (isMobile) {
    return {
      mobile: true,
      spawnDelay: 1500,
      trailFrequency: 220,
      trailScaleStart: 0.32,
      parallaxScale: 0.72,
      pickupRotationStep: 0.035,
      pickupRotationInterval: 48,
      maxObstacles: 20,
      maxPickups: 10,
      maxProps: 8,
      trimObstacles: 6,
      trimPickups: 3,
      trimProps: 3,
      propChance: 40,
      obstacleSpeed: -170,
      pickupSpeed: -190,
      trailEnabled: true,
    }
  }

  return {
    mobile: false,
    spawnDelay: 1400,
    trailFrequency: 120,
    trailScaleStart: 0.45,
    parallaxScale: 1,
    pickupRotationStep: 0.05,
    pickupRotationInterval: 16,
    maxObstacles: 36,
    maxPickups: 18,
    maxProps: 20,
    trimObstacles: 8,
    trimPickups: 4,
    trimProps: 6,
    propChance: 72,
    obstacleSpeed: -205,
    pickupSpeed: -220,
    trailEnabled: true,
  }
}

type HudSnapshot = {
  score: number
  runtime: number
  progress: number
}


class DiegoRushScene extends Phaser.Scene {
  private readonly onHudUpdate: (snapshot: HudSnapshot) => void
  private readonly onGameOver: (score: number) => void
  private readonly onAudioEvent: (event: SceneAudioEvent) => void
  private readonly baseQuality: QualityProfile

  private quality: QualityProfile
  private performanceModeRef: React.MutableRefObject<boolean>

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
  private orbFloatTweens = new Map<Phaser.Physics.Arcade.Image, Phaser.Tweens.Tween>()
  private trailFx?: Phaser.GameObjects.Particles.ParticleEmitter
  private pointerHandler?: () => void
  private spaceHandler?: () => void
  private resizeHandler?: (size: Phaser.Structs.Size) => void
  private pickupUpdateElapsed = 0
  private noCollisionUntil = 0
  private obstacleChildren: Phaser.GameObjects.GameObject[] = []
  private pickupChildren: Phaser.GameObjects.GameObject[] = []
  private propChildren: Phaser.GameObjects.GameObject[] = []
  private uiDirty = false
  private uiElapsed = 0
  private readonly uiThrottleMs = 220

  constructor(
    phaseRef: React.MutableRefObject<GamePhase>,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    onGameOver: (score: number) => void,
    onAudioEvent: (event: SceneAudioEvent) => void,
    quality: QualityProfile,
    performanceModeRef: React.MutableRefObject<boolean>,
  ) {
    super('DiegoRushScene')
    this.phaseRef = phaseRef
    this.onHudUpdate = onHudUpdate
    this.onGameOver = onGameOver
    this.onAudioEvent = onAudioEvent
    this.baseQuality = quality
    this.performanceModeRef = performanceModeRef
    this.quality = this.resolveQuality()
  }

  private resolveQuality(): QualityProfile {
    if (!this.performanceModeRef.current) return { ...this.baseQuality }

    return {
      ...this.baseQuality,
      trailFrequency: Math.max(260, this.baseQuality.trailFrequency + 140),
      trailScaleStart: Math.min(this.baseQuality.trailScaleStart, 0.28),
      pickupRotationInterval: Math.max(66, this.baseQuality.pickupRotationInterval * 2),
      maxObstacles: Math.max(12, this.baseQuality.maxObstacles - 6),
      maxPickups: Math.max(6, this.baseQuality.maxPickups - 3),
      maxProps: Math.max(5, this.baseQuality.maxProps - 3),
      trimObstacles: Math.max(4, this.baseQuality.trimObstacles - 2),
      trimPickups: Math.max(2, this.baseQuality.trimPickups - 1),
      trimProps: Math.max(2, this.baseQuality.trimProps - 1),
      propChance: Math.max(20, this.baseQuality.propChance - 16),
      obstacleSpeed: this.baseQuality.obstacleSpeed + 10,
      pickupSpeed: this.baseQuality.pickupSpeed + 15,
      parallaxScale: this.baseQuality.mobile ? this.baseQuality.parallaxScale * 0.84 : this.baseQuality.parallaxScale * 0.9,
      trailEnabled: false,
    }
  }

  setPerformanceMode(enabled: boolean) {
    this.performanceModeRef.current = enabled
    this.quality = this.resolveQuality()
    if (this.trailFx) {
      if (this.quality.trailEnabled) {
        this.trailFx.setFrequency(this.quality.trailFrequency)
        this.trailFx.start()
      } else {
        this.trailFx.stop()
      }
    }
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
    this.player.setCollideWorldBounds(true)
    this.player.play('diego-idle-loop')

    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true })
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true })
    this.props = this.physics.add.group({ allowGravity: false, immovable: true })

    this.trailFx = this.add.particles(0, 0, 'pickup-orb', {
      lifespan: { min: this.quality.mobile ? 250 : 320, max: this.quality.mobile ? 520 : 780 },
      speedX: { min: -24, max: -92 },
      speedY: { min: -24, max: 24 },
      quantity: 1,
      frequency: this.quality.trailFrequency,
      maxParticles: this.quality.mobile ? 14 : 36,
      alpha: { start: this.quality.mobile ? 0.22 : 0.4, end: 0 },
      scale: { start: this.quality.trailScaleStart, end: 0 },
      blendMode: 'NORMAL',
      follow: this.player,
      followOffset: { x: -30, y: 18 },
    })
    this.trailFx.setDepth(6)
    if (!this.quality.trailEnabled) this.trailFx.stop()

    this.pointerHandler = () => this.flap()
    this.spaceHandler = () => this.flap()
    this.input.on('pointerdown', this.pointerHandler)
    this.input.keyboard?.on('keydown-SPACE', this.spaceHandler)

    this.physics.add.collider(this.player, this.obstacles, () => {
      if (this.time.now < this.noCollisionUntil) return
      this.endRun()
    }, undefined, this)
    this.physics.add.overlap(this.player, this.pickups, (_, pickup) => {
      const orb = pickup as Phaser.Physics.Arcade.Image
      if (!orb.active || orb.getData('collected')) return
      orb.setData('collected', true)
      this.score += 3
      this.uiDirty = true
      this.clearOrbTween(orb)
      this.tweens.killTweensOf(orb)
      this.tweens.add({
        targets: orb,
        scale: 1.4,
        alpha: 0,
        duration: this.quality.mobile ? 120 : 160,
        onComplete: () => this.deactivatePooledImage(orb),
      })
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
    this.quality = this.resolveQuality()
    this.phaseRef.current = 'playing'
    this.score = 0
    this.scoreElapsed = 0
    this.runtimeElapsed = 0
    this.runtimeSeconds = 0
    this.progress = 0
    this.pickupUpdateElapsed = 0
    this.uiElapsed = 0
    this.uiDirty = true
    this.noCollisionUntil = this.time.now + 2500

    this.cleanupSpawnedObjects()

    this.player.setPosition(this.gameWidth * 0.3, this.gameHeight * 0.5)
    this.player.setVelocity(0, 0)
    this.player.setAngle(0)
    this.player.play('diego-run-loop', true)

    this.spawnTimer?.remove(false)
    this.spawnTimer = this.time.addEvent({
      delay: this.quality.spawnDelay,
      callback: this.spawnObstaclePair,
      callbackScope: this,
      loop: true,
    })

    this.emitHudUpdate(0, true)
  }

  flap() {
    if (this.phaseRef.current !== 'playing') return
    this.player.setVelocityY(-320)
    this.player.setAngle(-18)
    this.player.play('diego-jump-pose', true)
    this.onAudioEvent('jump')
  }

  update(_: number, delta: number) {
    const parallaxScale = this.quality.parallaxScale
    this.skyFar.tilePositionX += 0.15 * parallaxScale
    this.skyMid.tilePositionX += 0.35 * parallaxScale
    this.starfield.tilePositionX += 0.6 * parallaxScale
    this.skyNear.tilePositionX += 0.95 * parallaxScale

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
      this.scoreElapsed -= 150
      this.uiDirty = true
    }

    this.runtimeElapsed += delta
    if (this.runtimeElapsed >= 1000) {
      this.runtimeElapsed -= 1000
      this.runtimeSeconds += 1
      this.progress = Math.min(1, this.progress + 0.01)
      this.uiDirty = true
    }

    this.obstacleChildren = this.obstacles.getChildren()
    for (let i = this.obstacleChildren.length - 1; i >= 0; i -= 1) {
      const obstacle = this.obstacleChildren[i] as Phaser.Physics.Arcade.Image & { passed?: boolean }
      if (!obstacle.active) continue
      if (obstacle.x + obstacle.width < -6) {
        this.deactivatePooledImage(obstacle)
        continue
      }

      if (!obstacle.passed && obstacle.getData('isTop') && obstacle.x < this.player.x) {
        obstacle.passed = true
        this.score += 5
        this.progress = Math.min(1, this.progress + 0.03)
        this.uiDirty = true
        this.onAudioEvent('score')
      }
    }

    this.pickupUpdateElapsed += delta
    const shouldUpdatePickups = this.pickupUpdateElapsed >= this.quality.pickupRotationInterval
    if (shouldUpdatePickups) {
      this.pickupUpdateElapsed = 0
      this.pickupChildren = this.pickups.getChildren()
      for (let i = this.pickupChildren.length - 1; i >= 0; i -= 1) {
        const pickup = this.pickupChildren[i] as Phaser.Physics.Arcade.Image
        if (!pickup.active) continue
        pickup.rotation += this.quality.pickupRotationStep
        if (pickup.x + pickup.width < -20) {
          this.clearOrbTween(pickup)
          this.tweens.killTweensOf(pickup)
          this.deactivatePooledImage(pickup)
        }
      }
    }

    this.propChildren = this.props.getChildren()
    for (let i = this.propChildren.length - 1; i >= 0; i -= 1) {
      const prop = this.propChildren[i] as Phaser.Physics.Arcade.Image
      if (!prop.active) continue
      if (prop.x + prop.width < -40) this.deactivatePooledImage(prop)
    }

    this.emitHudUpdate(delta)

    if (this.player.y > this.gameHeight - 8) {
      this.endRun()
    }
  }

  getProgress() {
    return this.progress
  }

  private emitHudUpdate(delta = 0, force = false) {
    this.uiElapsed += delta
    if (!force && (!this.uiDirty || this.uiElapsed < this.uiThrottleMs)) return

    this.uiElapsed = 0
    this.uiDirty = false
    this.onHudUpdate({ score: this.score, runtime: this.runtimeSeconds, progress: this.progress })
  }

  private deactivatePooledImage(image: Phaser.Physics.Arcade.Image) {
    image.setActive(false)
    image.setVisible(false)
    image.setVelocity(0, 0)
    image.setAlpha(1)
    image.rotation = 0
    const body = image.body as Phaser.Physics.Arcade.Body | undefined
    if (body) body.enable = false
  }

  private activatePooledImage(image: Phaser.Physics.Arcade.Image, x: number, y: number, texture?: string) {
    if (texture && image.texture.key !== texture) image.setTexture(texture)
    image.setPosition(x, y)
    image.setActive(true)
    image.setVisible(true)
    image.setScale(1)
    image.setAlpha(1)
    image.rotation = 0
    const body = image.body as Phaser.Physics.Arcade.Body | undefined
    if (body) body.enable = true
  }

  private spawnObstaclePair() {
    if (
      this.obstacles.countActive(true) > this.quality.maxObstacles
      || this.pickups.countActive(true) > this.quality.maxPickups
      || this.props.countActive(true) > this.quality.maxProps
    ) {
      this.trimOldSpawnedObjects()
      return
    }

    const gap = this.quality.mobile ? Phaser.Math.Between(220, 260) : Phaser.Math.Between(190, 230)
    const centerY = Phaser.Math.Between(190, this.gameHeight - 190)
    const halfGap = gap / 2

    const topHeight = centerY - halfGap
    const bottomY = centerY + halfGap

    const obstacleKey = Phaser.Math.Between(0, 1) ? 'obstacle-a' : 'obstacle-b'

    const top = (this.obstacles.getFirstDead(false) as Phaser.Physics.Arcade.Image | null) ?? this.physics.add.image(0, 0, obstacleKey)
    if (!this.obstacles.contains(top)) this.obstacles.add(top)
    this.activatePooledImage(top, this.gameWidth + 40, topHeight / 2, obstacleKey)
    top.setDisplaySize(this.quality.mobile ? 96 : 86, topHeight)
    top.setVelocityX(this.quality.obstacleSpeed)
    top.setImmovable(true)
    top.setTint(0xffb24a)
    top.setData('isTop', true)
    ;(top.body as Phaser.Physics.Arcade.Body).setSize(this.quality.mobile ? 88 : 78, topHeight, true)
    ;(top as Phaser.Physics.Arcade.Image & { passed?: boolean }).passed = false

    const bottom = (this.obstacles.getFirstDead(false) as Phaser.Physics.Arcade.Image | null) ?? this.physics.add.image(0, 0, obstacleKey)
    if (!this.obstacles.contains(bottom)) this.obstacles.add(bottom)
    this.activatePooledImage(bottom, this.gameWidth + 40, bottomY + (this.gameHeight - bottomY) / 2, obstacleKey)
    bottom.setDisplaySize(this.quality.mobile ? 96 : 86, this.gameHeight - bottomY)
    bottom.setVelocityX(this.quality.obstacleSpeed)
    bottom.setImmovable(true)
    bottom.setTint(0xffb24a)
    bottom.setData('isTop', false)
    ;(bottom.body as Phaser.Physics.Arcade.Body).setSize(this.quality.mobile ? 88 : 78, this.gameHeight - bottomY, true)

    const orbY = Phaser.Math.Between(topHeight + 40, bottomY - 40)
    const orb = (this.pickups.getFirstDead(false) as Phaser.Physics.Arcade.Image | null) ?? this.physics.add.image(0, 0, 'pickup-orb')
    if (!this.pickups.contains(orb)) this.pickups.add(orb)
    this.activatePooledImage(orb, this.gameWidth + 44, orbY, 'pickup-orb')
    orb.setDisplaySize(28, 28)
    orb.setVelocityX(this.quality.pickupSpeed)
    orb.setImmovable(true)
    orb.setAlpha(this.quality.mobile ? 0.9 : 0.95)
    orb.setData('collected', false)

    this.clearOrbTween(orb)
    const floatTween = this.tweens.add({
      targets: orb,
      y: orbY - (this.quality.mobile ? 8 : 12),
      yoyo: true,
      repeat: -1,
      duration: this.quality.mobile ? 760 : 600,
      ease: 'Sine.easeInOut',
    })
    this.orbFloatTweens.set(orb, floatTween)

    if (Phaser.Math.Between(0, 100) < this.quality.propChance) {
      const propKey = PROP_OPTIONS[Phaser.Math.Between(0, PROP_OPTIONS.length - 1)]
      const propY = Phaser.Math.Between(56, this.gameHeight - 56)
      const prop = (this.props.getFirstDead(false) as Phaser.Physics.Arcade.Image | null) ?? this.physics.add.image(0, 0, propKey)
      if (!this.props.contains(prop)) this.props.add(prop)
      this.activatePooledImage(prop, this.gameWidth + Phaser.Math.Between(90, 170), propY, propKey)
      prop.setVelocityX(this.quality.pickupSpeed)
      prop.setImmovable(true)
      prop.setAlpha(this.quality.mobile ? 0.7 : 0.8)
      prop.setScale(propKey === 'prop-plant' ? 0.84 : 0.72)
    }
  }

  private endRun() {
    if (this.phaseRef.current !== 'playing') return

    this.phaseRef.current = 'gameover'
    this.spawnTimer?.remove(false)
    this.spawnTimer = undefined
    this.player.setVelocity(0, 0)
    this.player.play('diego-idle-loop', true)
    this.emitHudUpdate(0, true)
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
    const tween = this.orbFloatTweens.get(orb)
    if (tween) tween.stop()
    this.orbFloatTweens.delete(orb)
  }

  private trimOldSpawnedObjects() {
    let removedObstacles = 0
    this.obstacleChildren = this.obstacles.getChildren()
    for (let i = 0; i < this.obstacleChildren.length && removedObstacles < this.quality.trimObstacles; i += 1) {
      const obstacle = this.obstacleChildren[i] as Phaser.Physics.Arcade.Image
      if (!obstacle.active) continue
      this.deactivatePooledImage(obstacle)
      removedObstacles += 1
    }

    let removedPickups = 0
    this.pickupChildren = this.pickups.getChildren()
    for (let i = 0; i < this.pickupChildren.length && removedPickups < this.quality.trimPickups; i += 1) {
      const pickup = this.pickupChildren[i] as Phaser.Physics.Arcade.Image
      if (!pickup.active) continue
      this.clearOrbTween(pickup)
      this.tweens.killTweensOf(pickup)
      this.deactivatePooledImage(pickup)
      removedPickups += 1
    }

    let removedProps = 0
    this.propChildren = this.props.getChildren()
    for (let i = 0; i < this.propChildren.length && removedProps < this.quality.trimProps; i += 1) {
      const prop = this.propChildren[i] as Phaser.Physics.Arcade.Image
      if (!prop.active) continue
      this.deactivatePooledImage(prop)
      removedProps += 1
    }
  }

  private cleanupSpawnedObjects() {
    this.pickupChildren = this.pickups.getChildren()
    for (let i = 0; i < this.pickupChildren.length; i += 1) {
      const pickup = this.pickupChildren[i] as Phaser.Physics.Arcade.Image
      this.clearOrbTween(pickup)
      this.tweens.killTweensOf(pickup)
      this.deactivatePooledImage(pickup)
    }

    this.obstacleChildren = this.obstacles.getChildren()
    for (let i = 0; i < this.obstacleChildren.length; i += 1) {
      this.deactivatePooledImage(this.obstacleChildren[i] as Phaser.Physics.Arcade.Image)
    }

    this.propChildren = this.props.getChildren()
    for (let i = 0; i < this.propChildren.length; i += 1) {
      this.deactivatePooledImage(this.propChildren[i] as Phaser.Physics.Arcade.Image)
    }

    this.orbFloatTweens.forEach((tween) => tween.stop())
    this.orbFloatTweens.clear()
  }

  private onSceneShutdown() {
    this.spawnTimer?.remove(false)
    this.spawnTimer = undefined
    this.cleanupSpawnedObjects()
    this.tweens.killAll()
    this.time.removeAllEvents()
    this.trailFx?.stop()
    this.trailFx?.destroy()
    if (this.pointerHandler) this.input.off('pointerdown', this.pointerHandler)
    if (this.spaceHandler) this.input.keyboard?.off('keydown-SPACE', this.spaceHandler)
    if (this.resizeHandler) this.scale.off('resize', this.resizeHandler)
    this.pointerHandler = undefined
    this.spaceHandler = undefined
    this.resizeHandler = undefined
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
  const qualityRef = useRef<QualityProfile>(detectQualityProfile())
  const performanceModeRef = useRef<boolean>(false)

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
  const [performanceMode, setPerformanceMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(PERFORMANCE_MODE_KEY)
    if (saved === '0') return false
    if (saved === '1') return true
    return qualityRef.current.mobile
  })

  const unlockedCards = useMemo(() => LORE_CARDS.filter((card) => highScore >= card.unlockScore), [highScore])

  performanceModeRef.current = performanceMode

  useEffect(() => {
    if (!gameHostRef.current) return

    const audio = audioRef.current
    const scene = new DiegoRushScene(
      phaseRef,
      ({ score: nextScore, runtime: nextRuntime, progress: nextProgress }) => {
        setScore(nextScore)
        setRuntime(nextRuntime)
        setProgress(nextProgress)
      },
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
      qualityRef.current,
      performanceModeRef,
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
        zoom: qualityRef.current.mobile || performanceModeRef.current ? 0.86 : 1,
      },
      pixelArt: false,
      render: {
        antialias: !(qualityRef.current.mobile || performanceModeRef.current),
        pixelArt: false,
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

  useEffect(() => {
    localStorage.setItem(PERFORMANCE_MODE_KEY, performanceMode ? '1' : '0')
    sceneRef.current?.setPerformanceMode(performanceMode)
  }, [performanceMode])

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

  const onTogglePerformanceMode = () => {
    unlockAndClick()
    setPerformanceMode((prev) => !prev)
  }

  return (
    <main className="arena-shell">
      <div className="vignette" />
      <section className="game-stage">
        <div ref={gameHostRef} className="game-canvas" />
      </section>

      <section className="top-chips">
        <div className="chip">Piloto: Diego</div>
        <div className="chip">Tiempo: {formatTime(runtime)}</div>
        <div className={`chip status ${phase}`}>Estado: {phase === 'playing' ? 'EN RUTA' : phase.toUpperCase()}</div>
      </section>

      <aside className="left-panel">
        <header>
          <img src={panelImg} alt="hud" className="panel-base" />
          <img src={portraitImg} alt="Diego portrait" className="portrait" />
          <img src={logoImg} alt="Ahiacabo: La Ruta de Diego" className="logo-title" />
        </header>
        <div className="stat-row"><span>Puntaje</span><strong>{score}</strong></div>
        <div className="stat-row"><span>Récord</span><strong>{highScore}</strong></div>
        <div className="stat-row"><span>Mejoras</span><strong>—</strong></div>
        <div className="icons-row">
          <img src={heartImg} alt="health" />
          <img src={energyImg} alt="energy" />
          <img src={coinImg} alt="coin" />
        </div>
        <button className="audio-toggle" onClick={onToggleMute}>{isMuted ? 'Activar audio' : 'Silenciar'}</button>
        <button className="audio-toggle" onClick={onTogglePerformanceMode}>
          Modo Rendimiento: {performanceMode ? 'ON' : 'OFF'}
        </button>
        <label>
          Música {Math.round(musicVolume * 100)}%
          <input type="range" min={0} max={100} value={Math.round(musicVolume * 100)} onPointerDown={unlockAndClick} onChange={(e) => setMusicVolume(Number(e.target.value) / 100)} />
        </label>
        <label>
          Efectos {Math.round(sfxVolume * 100)}%
          <input type="range" min={0} max={100} value={Math.round(sfxVolume * 100)} onPointerDown={unlockAndClick} onChange={(e) => setSfxVolume(Number(e.target.value) / 100)} />
        </label>
      </aside>

      <aside className="right-panel">
        <h2>Mapa del Sector</h2>
        <div className="mini-grid">
          <div className="scanline" />
          <div className="tracker" style={{ left: `${Math.max(4, Math.round(progress * 92))}%` }} />
        </div>
        <div className="progress-row"><span>Progreso de Ruta</span><strong>{Math.round(progress * 100)}%</strong></div>
        <div className="progress-bar"><span style={{ width: `${Math.max(4, progress * 100)}%` }} /></div>
        <p className="lore-inline">Crónicas desbloqueadas: {unlockedCards.length}/10</p>
      </aside>

      {phase === 'menu' && (
        <div className="overlay">
          <h2>Ahiacabo: La Ruta de Diego</h2>
          <p>Solo los valientes llegan al final del camino.</p>
          <button onClick={startGame}>Comenzar Ruta</button>
        </div>
      )}

      {phase === 'gameover' && (
        <div className="overlay gameover">
          <h2>Ruta Interrumpida</h2>
          <p>Puntaje Final: {score}</p>
          <p>Puntaje Máximo: {highScore}</p>
          <button onClick={startGame}>Intentar de Nuevo</button>
        </div>
      )}
    </main>
  )
}

export default App

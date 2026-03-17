import menuLoopUrl from './assets/audio/menu-loop.wav'
import gameplayLoopUrl from './assets/audio/gameplay-loop.wav'
import gameOverStingUrl from './assets/audio/game-over-sting.wav'
import jumpUrl from './assets/audio/sfx-jump.wav'
import hitUrl from './assets/audio/sfx-hit.wav'
import scoreUrl from './assets/audio/sfx-score.wav'
import uiClickUrl from './assets/audio/sfx-ui-click.wav'

type Channel = 'music' | 'sfx'

type SfxName = 'jump' | 'hit' | 'score' | 'uiClick' | 'gameOver'

export class GameAudio {
  private readonly music = {
    menu: new Audio(menuLoopUrl),
    gameplay: new Audio(gameplayLoopUrl),
  }

  private readonly sfxMap: Record<SfxName, string> = {
    jump: jumpUrl,
    hit: hitUrl,
    score: scoreUrl,
    uiClick: uiClickUrl,
    gameOver: gameOverStingUrl,
  }

  private unlocked = false
  private muted = false
  private musicVolume = 0.5
  private sfxVolume = 0.8

  constructor() {
    this.music.menu.loop = true
    this.music.gameplay.loop = true
    this.music.menu.preload = 'auto'
    this.music.gameplay.preload = 'auto'
    this.applyVolumes()
  }

  unlock() {
    if (this.unlocked) return
    this.unlocked = true
    this.music.menu.load()
    this.music.gameplay.load()
  }

  setMuted(next: boolean) {
    this.muted = next
    this.applyVolumes()
    if (this.muted) {
      this.stopMusic()
    }
  }

  setVolume(channel: Channel, volume: number) {
    const clamped = Math.max(0, Math.min(1, volume))
    if (channel === 'music') this.musicVolume = clamped
    if (channel === 'sfx') this.sfxVolume = clamped
    this.applyVolumes()
  }

  playMenuMusic() {
    this.playMusicTrack('menu')
  }

  playGameplayMusic() {
    this.playMusicTrack('gameplay')
  }

  stopMusic() {
    this.music.menu.pause()
    this.music.gameplay.pause()
    this.music.menu.currentTime = 0
    this.music.gameplay.currentTime = 0
  }

  playSfx(name: SfxName) {
    if (!this.unlocked || this.muted || this.sfxVolume <= 0) return

    const audio = new Audio(this.sfxMap[name])
    audio.volume = this.sfxVolume
    audio.preload = 'auto'
    void audio.play().catch(() => undefined)
  }

  private playMusicTrack(target: 'menu' | 'gameplay') {
    if (!this.unlocked || this.muted || this.musicVolume <= 0) return

    const active = this.music[target]
    const inactive = target === 'menu' ? this.music.gameplay : this.music.menu

    inactive.pause()
    inactive.currentTime = 0
    active.volume = this.musicVolume

    if (!active.paused) return
    void active.play().catch(() => undefined)
  }

  private applyVolumes() {
    const musicVolume = this.muted ? 0 : this.musicVolume
    this.music.menu.volume = musicVolume
    this.music.gameplay.volume = musicVolume
  }
}

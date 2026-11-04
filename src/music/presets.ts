// 기본 배경음악: 외부 음원 파일 없이 브라우저(Web Audio)가 직접 연주합니다.
// 코드로 만든 음악이라 저작권 걱정 없이 마음껏 쓸 수 있어요.

export type MusicPresetId = 'calm-forest' | 'happy-day' | 'mystery-night' | 'warm-heart' | 'adventure'

type Instrument = 'musicbox' | 'piano' | 'pluck' | 'bell'

export type MusicPreset = {
  id: MusicPresetId
  emoji: string
  label: string
  description: string
  tempo: number
  // 각 코드: 루트 음 + 코드 구성음 (MIDI 번호). 한 코드는 한 마디(4박) 동안 이어집니다.
  chords: number[][]
  scale: number[]
  lead: Instrument
  arpeggio: boolean
  bass: boolean
  pulse: boolean
  melodyDensity: number
  padVolume: number
  reverb: number
}

const C = (root: number, ...intervals: number[]) => [root, ...intervals.map((interval) => root + interval)]
const MAJOR = [4, 7]
const MINOR = [3, 7]

export const MUSIC_PRESETS: MusicPreset[] = [
  {
    id: 'calm-forest', emoji: '🌿', label: '잔잔한 숲', description: '평화롭고 차분한 이야기',
    tempo: 66, chords: [C(48, ...MAJOR), C(45, ...MINOR), C(41, ...MAJOR), C(43, ...MAJOR)],
    scale: [72, 74, 76, 79, 81, 84], lead: 'musicbox', arpeggio: false, bass: false, pulse: false,
    melodyDensity: 0.45, padVolume: 0.16, reverb: 0.55,
  },
  {
    id: 'happy-day', emoji: '☀️', label: '신나는 하루', description: '밝고 즐거운 이야기',
    tempo: 112, chords: [C(43, ...MAJOR), C(50, ...MAJOR), C(52, ...MINOR), C(48, ...MAJOR)],
    scale: [67, 69, 71, 74, 76, 79], lead: 'pluck', arpeggio: true, bass: true, pulse: true,
    melodyDensity: 0.6, padVolume: 0.08, reverb: 0.25,
  },
  {
    id: 'mystery-night', emoji: '🌙', label: '신비로운 밤', description: '꿈, 마법, 밤하늘 이야기',
    tempo: 58, chords: [C(50, ...MINOR), C(46, ...MAJOR), C(43, ...MINOR), C(45, ...MAJOR)],
    scale: [74, 76, 77, 81, 82, 86], lead: 'bell', arpeggio: true, bass: false, pulse: false,
    melodyDensity: 0.35, padVolume: 0.17, reverb: 0.75,
  },
  {
    id: 'warm-heart', emoji: '💛', label: '따뜻한 마음', description: '가족, 우정, 감동 이야기',
    tempo: 76, chords: [C(41, ...MAJOR), C(48, ...MAJOR), C(50, ...MINOR), C(46, ...MAJOR)],
    scale: [65, 67, 69, 72, 74, 77], lead: 'piano', arpeggio: true, bass: true, pulse: false,
    melodyDensity: 0.5, padVolume: 0.12, reverb: 0.45,
  },
  {
    id: 'adventure', emoji: '🗺️', label: '두근두근 모험', description: '용기, 탐험, 도전 이야기',
    tempo: 100, chords: [C(45, ...MINOR), C(41, ...MAJOR), C(48, ...MAJOR), C(43, ...MAJOR)],
    scale: [69, 71, 72, 76, 79, 81], lead: 'pluck', arpeggio: true, bass: true, pulse: true,
    melodyDensity: 0.55, padVolume: 0.1, reverb: 0.35,
  },
]

export function findPreset(id: string | null | undefined) {
  return MUSIC_PRESETS.find((preset) => preset.id === id) ?? null
}

const midiToFrequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

function createReverb(context: AudioContext, seconds: number) {
  const length = Math.floor(context.sampleRate * seconds)
  const impulse = context.createBuffer(2, length, context.sampleRate)
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel)
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / length, 3)
  }
  const convolver = context.createConvolver()
  convolver.buffer = impulse
  return convolver
}

// 같은 책은 늘 같은 멜로디가 나오도록 간단한 시드 난수 사용
function seededRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

export class GenerativeMusic {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private dry: GainNode | null = null
  private wet: GainNode | null = null
  private timer: number | undefined
  private nextBeatTime = 0
  private beat = 0
  private preset: MusicPreset | null = null
  private random = seededRandom(7)
  private volume = 0.6
  private lastMelodyNote = 0

  async start(presetId: MusicPresetId) {
    const preset = findPreset(presetId)
    if (!preset) return
    this.stopScheduler()
    if (!this.context) {
      const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.context = new AudioContextClass()
    }
    const context = this.context
    if (context.state === 'suspended') await context.resume()

    this.master?.disconnect()
    this.master = context.createGain()
    this.master.gain.setValueAtTime(0, context.currentTime)
    this.master.gain.linearRampToValueAtTime(this.volume, context.currentTime + 2)
    this.master.connect(context.destination)
    this.dry = context.createGain()
    this.dry.gain.value = 1 - preset.reverb * 0.5
    this.dry.connect(this.master)
    this.wet = context.createGain()
    this.wet.gain.value = preset.reverb
    const reverb = createReverb(context, 3.2)
    reverb.connect(this.wet)
    this.wet.connect(this.master)
    this.reverbInput = reverb

    this.preset = preset
    this.random = seededRandom(preset.id.length * 97)
    this.beat = 0
    this.lastMelodyNote = preset.scale[2]
    this.nextBeatTime = context.currentTime + 0.1
    this.timer = window.setInterval(() => this.schedule(), 50)
    this.schedule()
  }

  private reverbInput: ConvolverNode | null = null

  stop() {
    this.stopScheduler()
    if (this.context && this.master) {
      const master = this.master
      const now = this.context.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(master.gain.value, now)
      master.gain.linearRampToValueAtTime(0, now + 0.6)
      window.setTimeout(() => master.disconnect(), 800)
      this.master = null
    }
  }

  setVolume(volume: number) {
    this.volume = volume
    if (this.context && this.master) this.master.gain.setTargetAtTime(volume, this.context.currentTime, 0.1)
  }

  dispose() {
    this.stop()
    const context = this.context
    this.context = null
    window.setTimeout(() => { void context?.close() }, 900)
  }

  private stopScheduler() {
    if (this.timer) window.clearInterval(this.timer)
    this.timer = undefined
  }

  private schedule() {
    const context = this.context
    const preset = this.preset
    if (!context || !preset) return
    const beatLength = 60 / preset.tempo
    while (this.nextBeatTime < context.currentTime + 0.25) {
      this.playBeat(preset, this.beat, this.nextBeatTime, beatLength)
      this.nextBeatTime += beatLength
      this.beat += 1
    }
  }

  private playBeat(preset: MusicPreset, beat: number, time: number, beatLength: number) {
    const bar = Math.floor(beat / 4)
    const beatInBar = beat % 4
    const chord = preset.chords[bar % preset.chords.length]

    if (beatInBar === 0) {
      for (const note of chord) this.pad(note + 12, time, beatLength * 4, preset.padVolume)
    }
    if (preset.bass && (beatInBar === 0 || beatInBar === 2)) this.bass(chord[0] - 12, time, beatLength * 1.6)
    if (preset.pulse && beatInBar % 2 === 0) this.drum(time, beatInBar === 0 ? 0.32 : 0.18)
    if (preset.arpeggio) {
      const arpNotes = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 24]
      const steps = preset.tempo > 90 ? 2 : 1
      for (let step = 0; step < steps; step += 1) {
        const note = arpNotes[(beatInBar * steps + step) % arpNotes.length]
        this.tone(preset.lead === 'bell' ? 'bell' : 'pluck', note, time + step * beatLength / steps, beatLength * 1.2, 0.07)
      }
    }
    // 멜로디: 4마디마다 쉬는 마디를 둬서 단조롭지 않게
    const restingBar = bar % 8 === 7
    if (!restingBar && this.random() < preset.melodyDensity) {
      const chordPitchClasses = chord.map((note) => note % 12)
      const candidates = preset.scale.filter((note) => Math.abs(note - this.lastMelodyNote) <= 7)
      const preferred = beatInBar === 0 ? candidates.filter((note) => chordPitchClasses.includes(note % 12)) : candidates
      const pool = preferred.length > 0 ? preferred : preset.scale
      const note = pool[Math.floor(this.random() * pool.length)]
      this.lastMelodyNote = note
      const length = beatLength * (this.random() < 0.3 ? 2 : 1)
      this.tone(preset.lead, note, time, length * 1.8, 0.13)
    }
  }

  private output(gain: GainNode) {
    if (this.dry) gain.connect(this.dry)
    if (this.reverbInput) gain.connect(this.reverbInput)
  }

  private pad(midi: number, time: number, length: number, volume: number) {
    const context = this.context
    if (!context) return
    const gain = context.createGain()
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(volume / 3, time + length * 0.35)
    gain.gain.linearRampToValueAtTime(0, time + length * 1.05)
    filter.connect(gain)
    this.output(gain)
    for (const detune of [-6, 6]) {
      const oscillator = context.createOscillator()
      oscillator.type = 'triangle'
      oscillator.frequency.value = midiToFrequency(midi)
      oscillator.detune.value = detune
      oscillator.connect(filter)
      oscillator.start(time)
      oscillator.stop(time + length * 1.1)
    }
  }

  private tone(instrument: Instrument, midi: number, time: number, length: number, volume: number) {
    const context = this.context
    if (!context) return
    const gain = context.createGain()
    const decay = instrument === 'bell' ? length * 1.6 : instrument === 'musicbox' ? length * 1.2 : instrument === 'piano' ? length : length * 0.5
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(volume, time + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay)
    this.output(gain)
    const partials = instrument === 'bell' ? [[1, 1], [2.76, 0.35], [5.4, 0.12]] : instrument === 'musicbox' ? [[1, 1], [4, 0.25]] : instrument === 'piano' ? [[1, 1], [2, 0.3], [3, 0.1]] : [[1, 1], [2, 0.2]]
    for (const [ratio, level] of partials) {
      const oscillator = context.createOscillator()
      const partialGain = context.createGain()
      oscillator.type = instrument === 'pluck' ? 'triangle' : 'sine'
      oscillator.frequency.value = midiToFrequency(midi) * ratio
      partialGain.gain.value = level
      oscillator.connect(partialGain)
      partialGain.connect(gain)
      oscillator.start(time)
      oscillator.stop(time + decay + 0.05)
    }
  }

  private bass(midi: number, time: number, length: number) {
    const context = this.context
    if (!context) return
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = midiToFrequency(midi)
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(0.22, time + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length)
    oscillator.connect(gain)
    if (this.dry) gain.connect(this.dry)
    oscillator.start(time)
    oscillator.stop(time + length + 0.05)
  }

  private drum(time: number, volume: number) {
    const context = this.context
    if (!context) return
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(120, time)
    oscillator.frequency.exponentialRampToValueAtTime(45, time + 0.18)
    gain.gain.setValueAtTime(volume, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.25)
    oscillator.connect(gain)
    if (this.dry) gain.connect(this.dry)
    oscillator.start(time)
    oscillator.stop(time + 0.3)
  }
}

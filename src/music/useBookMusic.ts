import { useCallback, useEffect, useRef, useState } from 'react'
import { GenerativeMusic, type MusicPresetId } from './presets'

export type BookMusic =
  | { type: 'none' }
  | { type: 'preset'; presetId: MusicPresetId }
  | { type: 'custom'; url: string; name: string; file: File | null }

export const NO_MUSIC: BookMusic = { type: 'none' }

export const MAX_MUSIC_SIZE = 10 * 1024 * 1024
export const ALLOWED_MUSIC_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/webm'] as const

export function validateMusicFile(file: File): string | null {
  const typeOk = (ALLOWED_MUSIC_TYPES as readonly string[]).includes(file.type) || /\.(mp3|m4a|ogg|wav)$/i.test(file.name)
  if (!typeOk) return 'MP3, M4A, OGG, WAV 음악 파일만 올릴 수 있어요.'
  if (file.size > MAX_MUSIC_SIZE) return '음악 파일은 10MB 이하만 올릴 수 있어요.'
  return null
}

const musicKey = (music: BookMusic) => music.type === 'preset' ? `preset:${music.presetId}` : music.type === 'custom' ? `custom:${music.url}` : 'none'

export function useBookMusic(music: BookMusic) {
  const generatorRef = useRef<GenerativeMusic | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.6)
  const volumeRef = useRef(0.6)
  const key = musicKey(music)
  const musicRef = useRef(music)
  useEffect(() => { musicRef.current = music }, [music])

  const stopAll = useCallback(() => {
    generatorRef.current?.stop()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
  }, [])

  const startedKeyRef = useRef('none')
  const play = useCallback(async (override?: BookMusic) => {
    const current = override ?? musicRef.current
    startedKeyRef.current = musicKey(current)
    stopAll()
    try {
      if (current.type === 'preset') {
        generatorRef.current ??= new GenerativeMusic()
        generatorRef.current.setVolume(volumeRef.current)
        await generatorRef.current.start(current.presetId)
        setIsPlaying(true)
      } else if (current.type === 'custom') {
        const audio = new Audio(current.url)
        audio.loop = true
        audio.volume = volumeRef.current
        audioRef.current = audio
        await audio.play()
        setIsPlaying(true)
      } else {
        setIsPlaying(false)
      }
    } catch (error) {
      // 브라우저가 자동 재생을 막으면 사용자가 버튼을 누를 때 다시 시도합니다.
      console.warn('배경음악을 재생하지 못했습니다.', error)
      setIsPlaying(false)
    }
  }, [stopAll])

  const pause = useCallback(() => { stopAll(); setIsPlaying(false) }, [stopAll])

  const setVolume = useCallback((value: number) => {
    volumeRef.current = value
    setVolumeState(value)
    generatorRef.current?.setVolume(value)
    if (audioRef.current) audioRef.current.volume = value
  }, [])

  // 음악 종류가 바뀌면, 재생 중이었을 때만 새 음악으로 이어서 재생
  const isPlayingRef = useRef(isPlaying)
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => {
    if (isPlayingRef.current && startedKeyRef.current !== key) void play()
  }, [key, play])

  useEffect(() => () => { stopAll(); generatorRef.current?.dispose(); generatorRef.current = null }, [stopAll])

  return { isPlaying, play, pause, toggle: () => (isPlaying ? pause() : void play()), volume, setVolume, hasMusic: music.type !== 'none' }
}

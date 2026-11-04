import { useRef, useState } from 'react'
import { Music, Upload } from 'lucide-react'
import { MUSIC_PRESETS } from '../music/presets'
import { NO_MUSIC, validateMusicFile, type BookMusic } from '../music/useBookMusic'

export default function MusicPicker({ music, onChange, onPicked, disabled = false }: { music: BookMusic; onChange: (music: BookMusic) => void; onPicked: (music: BookMusic) => void; disabled?: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const choose = (next: BookMusic) => {
    setError('')
    if (music.type === 'custom' && music.file && (next.type !== 'custom' || next.url !== music.url)) URL.revokeObjectURL(music.url)
    onChange(next)
    if (next.type !== 'none') onPicked(next)
  }

  const handleFile = (file: File | undefined) => {
    if (!file) return
    const validationError = validateMusicFile(file)
    if (validationError) { setError(validationError); return }
    choose({ type: 'custom', url: URL.createObjectURL(file), name: file.name, file })
  }

  return <section className="music-picker" aria-label="배경음악 고르기">
    <div className="music-picker__title"><Music size={18} /><strong>배경음악</strong><span>책을 읽는 동안 흘러나올 음악을 골라 주세요.</span></div>
    <div className="music-picker__options">
      <button className={music.type === 'none' ? 'is-selected' : ''} onClick={() => choose(NO_MUSIC)} disabled={disabled}><span>🔇</span>음악 없음</button>
      {MUSIC_PRESETS.map((preset) => <button key={preset.id} className={music.type === 'preset' && music.presetId === preset.id ? 'is-selected' : ''} onClick={() => choose({ type: 'preset', presetId: preset.id })} disabled={disabled} title={preset.description}><span>{preset.emoji}</span>{preset.label}<small>{preset.description}</small></button>)}
      <button className={music.type === 'custom' ? 'is-selected' : ''} onClick={() => fileInputRef.current?.click()} disabled={disabled}><span><Upload size={18} /></span>{music.type === 'custom' ? '다른 음악 올리기' : '내 음악 올리기'}<small>{music.type === 'custom' ? music.name : 'MP3·M4A·WAV, 10MB 이하'}</small></button>
    </div>
    <input ref={fileInputRef} className="visually-hidden" type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav" onChange={(event) => { handleFile(event.target.files?.[0]); event.target.value = '' }} />
    {error && <p className="upload-error" role="alert">{error}</p>}
    <p className="music-picker__note">기본 음악은 이 사이트가 직접 연주하는 저작권 걱정 없는 음악이에요. 직접 올리는 음악은 내가 만들었거나 무료로 사용이 허락된 음원만 사용해 주세요.</p>
  </section>
}

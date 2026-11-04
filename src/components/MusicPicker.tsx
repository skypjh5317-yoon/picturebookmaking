import { useRef, useState } from 'react'
import { Music, Upload } from 'lucide-react'
import { MUSIC_PRESETS, findPreset } from '../music/presets'
import { MUSIC_CATEGORIES, MUSIC_TRACKS, findTrack, type MusicCategoryId } from '../music/library'
import { NO_MUSIC, validateMusicFile, type BookMusic } from '../music/useBookMusic'

type TabId = MusicCategoryId | 'sad' | 'musicbox' | 'mine'

function initialTab(music: BookMusic): TabId {
  if (music.type === 'track') return findTrack(music.trackId)?.category ?? 'happy'
  if (music.type === 'preset') return findPreset(music.presetId)?.mood === 'sad' ? 'sad' : 'musicbox'
  if (music.type === 'custom') return 'mine'
  return 'happy'
}

export default function MusicPicker({ music, onChange, onPicked, disabled = false }: { music: BookMusic; onChange: (music: BookMusic) => void; onPicked: (music: BookMusic) => void; disabled?: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<TabId>(() => initialTab(music))

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

  const tabs: { id: TabId; label: string }[] = [
    ...MUSIC_CATEGORIES.map((category) => ({ id: category.id as TabId, label: `${category.emoji} ${category.label}` })),
    { id: 'sad', label: '💧 슬픈·잔잔한' },
    { id: 'musicbox', label: '🎐 오르골' },
    { id: 'mine', label: '📁 내 음악' },
  ]
  const category = MUSIC_CATEGORIES.find((item) => item.id === tab)

  return <section className="music-picker" aria-label="배경음악 고르기">
    <div className="music-picker__title"><Music size={18} /><strong>배경음악</strong><span>분위기를 고르고, 곡을 눌러 들어 보세요.</span><button className={`music-picker__none ${music.type === 'none' ? 'is-selected' : ''}`} onClick={() => choose(NO_MUSIC)} disabled={disabled}>🔇 음악 없음</button></div>
    <div className="music-picker__tabs" role="tablist">{tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'is-active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
    {category && <p className="music-picker__hint">{category.description}에 어울려요.</p>}
    {tab === 'sad' && <p className="music-picker__hint">슬픈 이야기, 이별, 아주 조용한 장면에 어울려요.</p>}
    <div className="music-picker__options">
      {category && MUSIC_TRACKS.filter((track) => track.category === category.id).map((track) => <button key={track.id} className={music.type === 'track' && music.trackId === track.id ? 'is-selected' : ''} onClick={() => choose({ type: 'track', trackId: track.id })} disabled={disabled}><span>{category.emoji}</span>{track.title}<small>{track.artist}</small></button>)}
      {(tab === 'musicbox' || tab === 'sad') && MUSIC_PRESETS.filter((preset) => (preset.mood === 'sad') === (tab === 'sad')).map((preset) => <button key={preset.id} className={music.type === 'preset' && music.presetId === preset.id ? 'is-selected' : ''} onClick={() => choose({ type: 'preset', presetId: preset.id })} disabled={disabled} title={preset.description}><span>{preset.emoji}</span>{preset.label}<small>{preset.description}</small></button>)}
      {tab === 'mine' && <button className={music.type === 'custom' ? 'is-selected' : ''} onClick={() => fileInputRef.current?.click()} disabled={disabled}><span><Upload size={18} /></span>{music.type === 'custom' ? '다른 음악 올리기' : '내 음악 올리기'}<small>{music.type === 'custom' ? music.name : 'MP3·M4A·WAV, 10MB 이하'}</small></button>}
    </div>
    <input ref={fileInputRef} className="visually-hidden" type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav" onChange={(event) => { handleFile(event.target.files?.[0]); event.target.value = '' }} />
    {error && <p className="upload-error" role="alert">{error}</p>}
    <p className="music-picker__note">{tab === 'musicbox' || tab === 'sad' ? '이 음악은 이 사이트가 직접 연주하는 음악이에요.' : tab === 'mine' ? '직접 올리는 음악은 내가 만들었거나 무료로 사용이 허락된 음원만 사용해 주세요.' : '유튜브 오디오 보관함의 무료 음원이에요. 전자책에 곡명과 작곡가가 함께 표시돼요.'}</p>
  </section>
}

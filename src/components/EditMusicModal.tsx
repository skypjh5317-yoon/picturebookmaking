import { useState } from 'react'
import { Music, Pause, Play, X } from 'lucide-react'
import MusicPicker from './MusicPicker'
import { updateBookMusic, type AdminBook } from '../services/adminService'
import { toBookMusic } from '../services/bookService'
import { useBookMusic, type BookMusic } from '../music/useBookMusic'

export default function EditMusicModal({ book, onClose, onSaved }: { book: AdminBook; onClose: () => void; onSaved: () => void }) {
  const [music, setMusic] = useState<BookMusic>(() => toBookMusic(book))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const player = useBookMusic(music)

  const handleSave = async () => {
    setIsSaving(true)
    setError('')
    try {
      player.pause()
      await updateBookMusic(book, music)
      onSaved()
    } catch (saveError) {
      console.error('Admin music save failed', saveError)
      setError(saveError instanceof Error && saveError.message === 'MUSIC_UPLOAD_FAILED' ? '음악 파일을 올리지 못했습니다. 다른 파일로 시도해 주세요.' : '배경음악을 저장하지 못했습니다. 관리자 로그인 상태를 확인해 주세요.')
    } finally {
      setIsSaving(false)
    }
  }

  return <div className="admin-modal-backdrop" role="presentation"><section className="admin-modal admin-music-modal" role="dialog" aria-modal="true" aria-labelledby="edit-music-title">
    <button className="icon-button admin-modal-close" onClick={onClose} disabled={isSaving} aria-label="음악 바꾸기 닫기"><X size={21} /></button>
    <div className="admin-music-icon"><Music size={24} /></div>
    <h2 id="edit-music-title">배경음악 바꾸기</h2>
    <p><strong>{book.title}</strong></p>
    <MusicPicker music={music} onChange={setMusic} onPicked={(next) => void player.play(next)} disabled={isSaving} />
    {player.hasMusic && <button className="text-button admin-music-preview" onClick={player.toggle} disabled={isSaving}>{player.isPlaying ? <><Pause size={17} /> 미리듣기 멈추기</> : <><Play size={17} /> 미리듣기</>}</button>}
    {error && <p className="admin-form-error" role="alert">{error}</p>}
    <div className="admin-modal-actions"><button className="secondary-button" onClick={onClose} disabled={isSaving}>취소</button><button className="primary-button" onClick={() => void handleSave()} disabled={isSaving}><Music size={18} /> {isSaving ? '저장 중...' : '음악 저장하기'}</button></div>
  </section></div>
}

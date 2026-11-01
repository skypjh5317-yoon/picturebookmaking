import { useState } from 'react'
import { Copy, ExternalLink, Save } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/supabase'
import { saveBook, type SaveBookInfo, type SaveBookPage } from '../services/bookService'

export default function SaveBookButton({ book, pages, onSaved }: { book: SaveBookInfo; pages: SaveBookPage[]; onSaved?: (bookId: string) => void }) {
  const [isSaving, setIsSaving] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: pages.length })
  const [shareUrl, setShareUrl] = useState('')
  const [savedBookId, setSavedBookId] = useState('')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSave = async () => {
    if (!isSupabaseConfigured) { setMessage('Supabase 환경변수를 설정해주세요.'); return }
    setIsSaving(true); setMessage(''); setCopied(false); setProgress({ current: 0, total: pages.length })
    try {
      const savedBook = await saveBook(book, pages, (current, total) => setProgress({ current, total }))
      const url = `${window.location.origin}/book/${savedBook.slug}`
      setShareUrl(url); setSavedBookId(savedBook.slug); setMessage('그림책이 저장되었습니다.'); onSaved?.(savedBook.slug)
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      setMessage(code === 'PAGE_UPLOAD_FAILED' ? '페이지 이미지 저장에 실패했습니다.' : code === 'BOOK_SAVE_FAILED' ? '그림책 저장에 실패했습니다.' : '인터넷 연결을 확인해주세요.')
    } finally { setIsSaving(false) }
  }

  const copyLink = async () => { if (!shareUrl) return; await navigator.clipboard.writeText(shareUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }

  return <div className="save-book-area"><button className="primary-button save-book-button" onClick={handleSave} disabled={isSaving || pages.length === 0 || Boolean(savedBookId)}><Save size={20} /> {isSaving ? `그림책을 저장하고 있어요... ${progress.current} / ${progress.total}` : savedBookId ? '저장된 그림책' : '💾 그림책 저장하기'}</button>{message && <p className={`save-book-message ${shareUrl ? 'is-success' : 'is-error'}`} role={shareUrl ? 'status' : 'alert'}>{message}</p>}{shareUrl && <div className="share-book-card"><label htmlFor="share-url">🔗 공유 링크</label><div className="share-book-row"><input id="share-url" readOnly value={shareUrl} /><button className="secondary-button" onClick={copyLink}><Copy size={17} /> {copied ? '복사되었습니다' : '링크 복사'}</button></div><div className="share-book-actions"><a className="text-button" href={shareUrl}><ExternalLink size={18} /> 전자책 보기</a><a className="text-button" href="/">새 그림책 만들기</a></div></div>}</div>
}

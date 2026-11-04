import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import AdminBookList from '../components/AdminBookList'
import AdminLogin from '../components/AdminLogin'
import DeleteBookModal from '../components/DeleteBookModal'
import EditMusicModal from '../components/EditMusicModal'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { deleteBook, getAdminBooks, isAdminUser, signOutAdmin, updateBookPublication, type AdminBook } from '../services/adminService'

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [books, setBooks] = useState<AdminBook[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [selectedBook, setSelectedBook] = useState<AdminBook | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [musicBook, setMusicBook] = useState<AdminBook | null>(null)

  const loadBooks = async () => {
    setIsLoading(true)
    setError('')
    try {
      setBooks(await getAdminBooks())
    } catch (loadError) {
      console.error('Admin book list load failed', loadError)
      setError('그림책 목록을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!supabase) { setIsCheckingSession(false); return }
    let mounted = true
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) console.error('Admin session lookup failed', sessionError)
      if (mounted) { setUser(isAdminUser(data.session?.user ?? null) ? data.session?.user ?? null : null); setIsCheckingSession(false) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(isAdminUser(session?.user ?? null) ? session?.user ?? null : null)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (user) void loadBooks()
    else setBooks([])
  }, [user])

  const handleTogglePublication = async (book: AdminBook) => {
    setActionError('')
    try {
      await updateBookPublication(book.id, !book.is_published)
      await loadBooks()
    } catch (updateError) {
      console.error('Publication toggle failed', updateError)
      setActionError('게시 상태를 변경하는 중 문제가 발생했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!selectedBook) return
    setIsDeleting(true)
    setActionError('')
    try {
      await deleteBook(selectedBook.id)
      setSelectedBook(null)
      await loadBooks()
    } catch (deleteError) {
      console.error('Admin book delete failed', deleteError)
      setActionError(deleteError instanceof Error ? `삭제 실패: ${deleteError.message}` : '그림책을 삭제하지 못했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOutAdmin()
      setUser(null)
    } catch (logoutError) {
      console.error('Admin logout failed', logoutError)
      setActionError('로그아웃 중 문제가 발생했습니다.')
    }
  }

  if (!isSupabaseConfigured) return <main className="admin-shell"><section className="admin-state"><h1>관리자 페이지를 사용할 수 없습니다.</h1><p>Supabase 환경변수를 설정해주세요.</p></section></main>
  if (isCheckingSession) return <main className="admin-shell"><p className="admin-loading">관리자 세션을 확인하는 중...</p></main>
  if (!user) return <AdminLogin />

  return <main className="admin-shell"><header className="admin-header"><div><span className="eyebrow">동강초 그림책 도서관</span><h1>그림책 관리</h1><p>그림책을 관리합니다.</p></div><button className="secondary-button" onClick={handleLogout}>로그아웃</button></header><section className="admin-content"><div className="admin-toolbar"><div><h2>저장된 그림책</h2><span>{books.length}권</span></div><button className="secondary-button" onClick={() => void loadBooks()} disabled={isLoading}><span aria-hidden="true">↻</span> 새로고침</button></div>{actionError && <p className="admin-action-error" role="alert">{actionError}</p>}{error && <p className="admin-action-error" role="alert">{error}</p>}<AdminBookList books={books} isLoading={isLoading} onRefresh={() => void loadBooks()} onTogglePublication={(book) => void handleTogglePublication(book)} onDelete={setSelectedBook} onEditMusic={setMusicBook} /></section>{selectedBook && <DeleteBookModal title={selectedBook.title} isDeleting={isDeleting} onCancel={() => setSelectedBook(null)} onConfirm={() => void handleDelete()} />}{musicBook && <EditMusicModal book={musicBook} onClose={() => setMusicBook(null)} onSaved={() => { setMusicBook(null); void loadBooks() }} />}</main>
}

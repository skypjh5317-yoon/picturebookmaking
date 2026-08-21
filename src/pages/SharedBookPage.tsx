import { useEffect, useState } from 'react'
import EbookViewer from '../components/EbookViewer'
import { isSupabaseConfigured } from '../lib/supabase'
import { getSharedBook, type SharedBook } from '../services/bookService'

export default function SharedBookPage({ slug }: { slug: string }) {
  const [book, setBook] = useState<SharedBook | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'private' | 'no-pages' | 'no-image' | 'error'>('loading')

  useEffect(() => {
    if (!isSupabaseConfigured) { setStatus('error'); return }
    getSharedBook(slug).then((loadedBook) => {
      setBook(loadedBook)
      console.log('book.is_published:', loadedBook.isPublished)
      console.log('page count:', loadedBook.pages.length)
      if (!loadedBook.isPublished) setStatus('private')
      else if (loadedBook.pages.length === 0) setStatus('no-pages')
      else if (loadedBook.pages.some((page) => !page.image_url)) setStatus('no-image')
      else setStatus('ready')
    }).catch((error) => {
      console.error('Shared book load failed', { error, message: error?.message, details: error?.details, hint: error?.hint, code: error?.code, slug })
      setStatus(error instanceof Error && error.message === 'BOOK_NOT_FOUND' ? 'not-found' : 'error')
    })
  }, [slug])

  if (status === 'loading') return <main className="shared-book-state"><p>📖 그림책을 펼치는 중...</p></main>
  if (status === 'not-found') return <main className="shared-book-state"><h1>📚 그림책을 찾을 수 없습니다.</h1></main>
  if (status === 'private') return <main className="shared-book-state"><h1>📚 현재 이 그림책은 공개되지 않았습니다.</h1></main>
  if (status === 'no-pages') return <main className="shared-book-state"><h1>이 그림책에 저장된 페이지가 없습니다.</h1></main>
  if (status === 'no-image') return <main className="shared-book-state"><h1>페이지 이미지 주소를 불러오지 못했습니다.</h1></main>
  if (status === 'error' || !book) return <main className="shared-book-state"><h1>그림책을 불러오지 못했습니다.</h1><p>인터넷 연결과 Supabase 설정을 확인해주세요.</p></main>
  return <EbookViewer book={book} pages={book.pages} readOnly />
}

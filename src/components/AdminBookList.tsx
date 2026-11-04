import { BookOpen, ExternalLink, Eye, EyeOff, Music, RefreshCw, Trash2 } from 'lucide-react'
import type { AdminBook } from '../services/adminService'
import { toBookMusic } from '../services/bookService'
import { describeMusic } from '../music/useBookMusic'

const musicLabel = (book: AdminBook) => describeMusic(toBookMusic(book))

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value))
}

function getEbookUrl(slug: string) {
  const url = `/book/${encodeURIComponent(slug)}`
  console.log('admin ebook URL:', url)
  return url
}

export default function AdminBookList({ books, isLoading, onRefresh, onTogglePublication, onDelete, onEditMusic }: { books: AdminBook[]; isLoading: boolean; onRefresh: () => void; onTogglePublication: (book: AdminBook) => void; onDelete: (book: AdminBook) => void; onEditMusic: (book: AdminBook) => void }) {
  if (isLoading) return <p className="admin-empty-state">그림책 목록을 불러오는 중...</p>
  if (books.length === 0) return <section className="admin-empty-state"><BookOpen size={34} /><p>아직 저장된 그림책이 없습니다.</p><button className="secondary-button" onClick={onRefresh}><RefreshCw size={17} /> 새로고침</button></section>
  return <div className="admin-book-list">{books.map((book) => <article className="admin-book-card" key={book.id}><div className="admin-book-cover">{book.cover_image_url ? <img src={book.cover_image_url} alt={`${book.title} 표지`} /> : <BookOpen size={42} />}</div><div className="admin-book-content"><div className="admin-book-heading"><div><h2>{book.title}</h2><p>{book.author || '작가 미입력'}</p></div><span className={`publish-badge ${book.is_published ? 'is-published' : 'is-private'}`}>{book.is_published ? '🟢 게시 중' : '⚪ 비공개'}</span></div><dl className="admin-book-meta"><div><dt>학년 / 반</dt><dd>{book.grade || '-'} {book.class_name || ''}</dd></div><div><dt>학교</dt><dd>{book.school || '-'}</dd></div><div><dt>제작 연도</dt><dd>{book.year}</dd></div><div><dt>생성일</dt><dd>{formatDate(book.created_at)}</dd></div><div><dt>배경음악</dt><dd>{musicLabel(book)}</dd></div></dl><div className="admin-book-actions"><a className="secondary-button" href={getEbookUrl(book.slug)} target="_blank" rel="noreferrer"><ExternalLink size={17} /> 전자책 보기</a><button className="secondary-button" onClick={() => onEditMusic(book)}><Music size={17} /> 음악 바꾸기</button><button className="secondary-button" onClick={() => onTogglePublication(book)}>{book.is_published ? <><EyeOff size={17} /> 비공개로 전환</> : <><Eye size={17} /> 게시하기</>}</button><button className="danger-button" onClick={() => onDelete(book)}><Trash2 size={17} /> 삭제</button></div></div></article>)}</div>
}

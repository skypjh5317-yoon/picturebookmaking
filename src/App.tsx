import { useEffect, useRef, useState } from 'react'
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { jsPDF } from 'jspdf'
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, FileImage, FileText, GripVertical, ImagePlus, Maximize2, Trash2, Upload, X } from 'lucide-react'
import EbookViewer from './components/EbookViewer'
import SharedBookPage from './pages/SharedBookPage'
import AdminPage from './pages/AdminPage'
import { NO_MUSIC, type BookMusic } from './music/useBookMusic'
import { MAX_PAGES, MAX_PAGES_ERROR, validateImageFile } from './utils/fileValidation'

type Page = { id: string; file: File; previewUrl: string; fileName: string }
type BookInfo = { title: string; author: string; grade: string; className: string; school: string; year: string }
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7
type PdfPageSize = 'original' | 'a4-portrait' | 'a4-landscape'

const welcomeSpines = [
  { label: '우리들의 숲', color: '#157F71', ink: '#ffffff', height: 230, width: 62 },
  { label: '꿈', color: '#F0B429', ink: '#1E2A44', height: 190, width: 52 },
  { label: '나의 이야기', color: '#C94A2B', ink: '#ffffff', height: 250, width: 70 },
  { label: '모험', color: '#6A4C96', ink: '#ffffff', height: 205, width: 56 },
  { label: '그림책', color: '#2F6FB5', ink: '#ffffff', height: 240, width: 64 },
]

const initialBook: BookInfo = { title: '', author: '', grade: '', className: '', school: '동강초등학교', year: String(new Date().getFullYear()) }
const steps = [
  { number: '①', label: '책 정보' },
  { number: '②', label: '페이지 추가' },
  { number: '③', label: '페이지 정리' },
  { number: '④', label: '미리보기' },
  { number: '⑤', label: 'PDF 만들기' },
  { number: '⑥', label: '웹 전자책' },
  { number: '⑦', label: '저장 및 공유' },
]

function Header({ onHome, editing }: { onHome?: () => void; editing?: boolean }) {
  return <header className="site-header">
    {editing ? <button className="back-button" onClick={onHome}><ChevronLeft size={21} /> 처음으로</button> : <div className="brand"><span className="brand-mark"><BookOpen size={25} /></span><div><span className="eyebrow">동강초 그림책 도서관</span><h1>나만의 그림책 만들기</h1></div></div>}
    {editing ? <div className="brand brand--compact"><span className="brand-mark"><BookOpen size={21} /></span><h1>나만의 그림책 만들기</h1></div> : <a className="header-note" href="https://donggang-picturebook-library.vercel.app">그림책 도서관 가기</a>}
  </header>
}

function StepIndicator({ current }: { current: Step }) {
  return <nav className="step-indicator" aria-label="그림책 제작 단계">{steps.map((step, index) => <div className={`step ${current === index + 1 ? 'is-current' : ''} ${current > index + 1 ? 'is-done' : ''}`} key={step.label}><span className="step-number">{step.number}</span><span>{step.label}</span>{index < steps.length - 1 && <ChevronRight className="step-arrow" size={18} />}</div>)}</nav>
}

function SortablePage({ page, index, onDelete, onPreview }: { page: Page; index: number; onDelete: () => void; onPreview: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id })
  return <article ref={setNodeRef} className={`page-card ${isDragging ? 'is-dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
    <div className="page-card__top"><span className="page-number">{index + 1}</span><button className="icon-button drag-handle" aria-label="페이지 순서 변경" {...attributes} {...listeners}><GripVertical size={21} /></button></div>
    <button className="page-image" onClick={onPreview} aria-label={`${page.fileName} 크게 보기`}><img src={page.previewUrl} alt={page.fileName} /><span className="image-overlay"><Maximize2 size={20} /> 크게 보기</span></button>
    <div className="page-card__bottom"><p title={page.fileName}>{page.fileName}</p><button className="icon-button delete-button" onClick={onDelete} aria-label={`${page.fileName} 삭제`}><Trash2 size={18} /></button></div>
  </article>
}

function BookInfoForm({ book, onChange, onNext, onHome }: { book: BookInfo; onChange: (field: keyof BookInfo, value: string) => void; onNext: () => void; onHome: () => void }) {
  const [showError, setShowError] = useState(false)
  const handleNext = () => { if (!book.title.trim()) { setShowError(true); return }; onNext() }
  return <section className="form-card"><div className="section-kicker">1단계 · 책 정보</div><h2>먼저 그림책 정보를 알려주세요.</h2><p className="section-description">책의 표지에 들어갈 내용을 적어 주세요.</p>
    <div className="form-grid"><label className="wide-field">책 제목<input autoFocus value={book.title} onChange={(event) => { onChange('title', event.target.value); setShowError(false) }} placeholder="예: 우리들의 숲 이야기" aria-invalid={showError} />{showError && <span className="field-error">책 제목을 입력해주세요.</span>}</label><label className="wide-field">작가<input value={book.author} onChange={(event) => onChange('author', event.target.value)} placeholder="예: 책벌레 민준" /><span className="field-hint">작가명은 이름 대신 별명이나 필명을 사용해 주세요.</span></label><label>학년<select value={book.grade} onChange={(event) => onChange('grade', event.target.value)}><option value="">학년 선택</option>{[1, 2, 3, 4, 5, 6].map((grade) => <option key={grade}>{grade}학년</option>)}</select></label><label>반<input value={book.className} onChange={(event) => onChange('className', event.target.value)} placeholder="예: 2반" /></label><label className="wide-field">학교<input value={book.school} onChange={(event) => onChange('school', event.target.value)} /></label><label>제작 연도<input value={book.year} onChange={(event) => onChange('year', event.target.value)} /></label></div>
    <div className="navigation-buttons"><button className="secondary-button" onClick={onHome}><ChevronLeft size={20} /> 처음으로</button><button className="primary-button" onClick={handleNext}>다음 단계로 <ChevronRight size={20} /></button></div>
  </section>
}

function PageUploader({ pages, onAdd, onDelete, onReorder, onPreview, onBack, onNext }: { pages: Page[]; onAdd: (files: FileList | File[]) => string | null; onDelete: (id: string) => void; onReorder: (event: DragEndEvent) => void; onPreview: (page: Page) => void; onBack: () => void; onNext: () => void }) {
  const [isDropActive, setIsDropActive] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const handleAdd = (files: FileList | File[]) => { setUploadError(onAdd(files) ?? '') }
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => { event.preventDefault(); setIsDropActive(false); handleAdd(event.dataTransfer.files) }
  return <section className="pages-card"><div className="section-kicker">2단계 · 페이지 추가</div><div className="pages-heading"><div><h2>그림책 페이지를 추가해주세요.</h2><p className="section-description">학생들이 만든 JPG, PNG, WEBP 이미지를 여러 장 선택할 수 있어요.</p></div><button className="secondary-button" onClick={() => fileInputRef.current?.click()}><ImagePlus size={19} /> 파일 선택</button></div>
    <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { if (event.target.files) handleAdd(event.target.files); event.target.value = '' }} />
    <div className={`upload-zone ${isDropActive ? 'is-active' : ''}`} onClick={() => fileInputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setIsDropActive(true) }} onDragLeave={() => setIsDropActive(false)} onDrop={handleDrop} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click() }}><Upload size={34} /><strong>그림책 페이지를 여기에 끌어다 놓으세요</strong><span>또는 <b>파일 선택</b> · JPG / JPEG / PNG / WEBP</span><small>여러 장을 한 번에 선택할 수 있어요. (최대 {MAX_PAGES}페이지, 파일당 10MB)</small></div>
    {uploadError && <p className="upload-error" role="alert">{uploadError}</p>}
    {pages.length > 0 ? <DndContext sensors={sensors} onDragEnd={onReorder}><SortableContext items={pages.map((page) => page.id)} strategy={rectSortingStrategy}><div className="pages-grid">{pages.map((page, index) => <SortablePage key={page.id} page={page} index={index} onDelete={() => onDelete(page.id)} onPreview={() => onPreview(page)} />)}</div></SortableContext></DndContext> : <div className="empty-pages"><FileImage size={31} /><p>아직 추가한 페이지가 없어요.</p><span>아이들의 그림을 한 장씩 올려 보세요.</span></div>}
    <div className="navigation-buttons"><button className="secondary-button" onClick={onBack}><ChevronLeft size={20} /> 이전 단계</button><button className="primary-button" disabled={pages.length === 0} onClick={onNext}>다음 단계로 <ChevronRight size={20} /></button></div>
  </section>
}

function PageOrganizer({ pages, onDelete, onReorder, onPreview, onBack, onNext }: { pages: Page[]; onDelete: (id: string) => void; onReorder: (event: DragEndEvent) => void; onPreview: (page: Page) => void; onBack: () => void; onNext: () => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  return <section className="pages-card"><div className="section-kicker">3단계 · 페이지 정리</div><div className="pages-heading"><div><h2>페이지 순서를 정리해주세요.</h2><p className="section-description">카드를 드래그해서 그림책 페이지 순서를 바꿔보세요.</p></div><span className="page-count">{pages.length}장</span></div>
    <DndContext sensors={sensors} onDragEnd={onReorder}><SortableContext items={pages.map((page) => page.id)} strategy={rectSortingStrategy}><div className="pages-grid">{pages.map((page, index) => <SortablePage key={page.id} page={page} index={index} onDelete={() => onDelete(page.id)} onPreview={() => onPreview(page)} />)}</div></SortableContext></DndContext>
    <div className="navigation-buttons"><button className="secondary-button" onClick={onBack}><ChevronLeft size={20} /> 이전 단계</button><button className="primary-button" disabled={pages.length === 0} onClick={onNext}>다음 단계로 <ChevronRight size={20} /></button></div>
  </section>
}

function PagePreview({ pages, onBack, onPdf }: { pages: Page[]; onBack: () => void; onPdf: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentPage = pages[currentIndex]
  const isFirstPage = currentIndex === 0
  const isLastPage = currentIndex === pages.length - 1

  return <section className="preview-card"><div className="section-kicker">4단계 · 미리보기</div><div className="preview-heading"><div><h2>그림책을 미리 살펴보세요.</h2><p className="section-description">페이지 순서대로 한 장씩 확인할 수 있어요.</p></div><strong className="preview-counter">{currentIndex + 1} / {pages.length}</strong></div>
    {currentPage && <div className="preview-page"><img src={currentPage.previewUrl} alt={`${currentIndex + 1}페이지 ${currentPage.fileName}`} /></div>}
    <div className="preview-navigation"><button className="secondary-button" disabled={isFirstPage} onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}><ChevronLeft size={20} /> 이전 페이지</button><button className="primary-button" disabled={isLastPage} onClick={() => setCurrentIndex((index) => Math.min(pages.length - 1, index + 1))}>다음 페이지 <ChevronRight size={20} /></button></div>
    <div className="preview-actions"><button className="preview-back-button" onClick={onBack}>페이지 순서 다시 정리하기</button><button className="primary-button" onClick={onPdf}><FileText size={20} /> PDF 만들기</button></div>
  </section>
}

function loadPdfImage(page: Page) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`이미지를 불러올 수 없습니다: ${page.fileName}`))
    image.src = page.previewUrl
  })
}

function safePdfFilename(title: string) {
  const safeTitle = title.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').replace(/[. ]+$/g, '')
  return `${safeTitle || '나만의 그림책'}.pdf`
}

function PdfMaker({ book, pages, onBack, onEbook }: { book: BookInfo; pages: Page[]; onBack: () => void; onEbook: () => void }) {
  const [pageSize, setPageSize] = useState<PdfPageSize>('original')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState('')

  const createPdf = async () => {
    if (pages.length === 0) return
    setIsGenerating(true)
    setIsComplete(false)
    setError('')
    try {
      let pdf: jsPDF | null = null
      for (const [index, page] of pages.entries()) {
        const image = await loadPdfImage(page)
        const imageRatio = image.naturalWidth / image.naturalHeight
        const margin = pageSize === 'original' ? 0 : 8
        let pageWidth: number
        let pageHeight: number
        let isOriginalPage = false
        if (pageSize === 'original') {
          const longestSide = 297
          const imageWidth = image.naturalWidth
          const imageHeight = image.naturalHeight
          pageWidth = imageWidth >= imageHeight ? longestSide : longestSide * imageWidth / imageHeight
          pageHeight = imageHeight > imageWidth ? longestSide : longestSide * imageHeight / imageWidth
          const orientation: 'portrait' | 'landscape' = pageWidth >= pageHeight ? 'landscape' : 'portrait'
          if (index === 0) pdf = new jsPDF({ orientation, unit: 'mm', format: [pageWidth, pageHeight] })
          else pdf?.addPage([pageWidth, pageHeight], orientation)
          isOriginalPage = true
        } else {
          const orientation: 'portrait' | 'landscape' = pageSize === 'a4-landscape' ? 'landscape' : 'portrait'
          if (index === 0) pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
          else pdf?.addPage()
          if (!pdf) throw new Error('PDF 문서를 초기화하지 못했습니다.')
          pageWidth = pdf.internal.pageSize.getWidth()
          pageHeight = pdf.internal.pageSize.getHeight()
        }
        if (!pdf) throw new Error('PDF 문서를 초기화하지 못했습니다.')
        if (isOriginalPage) {
          pageWidth = pdf.internal.pageSize.getWidth()
          pageHeight = pdf.internal.pageSize.getHeight()
          const pageAspectRatio = pageWidth / pageHeight
          console.info('PDF 원본 비율 검증', { imageWidth: image.naturalWidth, imageHeight: image.naturalHeight, aspectRatio: imageRatio, pageWidth, pageHeight, pageAspectRatio })
        }
        if (isOriginalPage) {
          const format = page.file.type === 'image/png' ? 'PNG' : page.file.type === 'image/webp' ? 'WEBP' : 'JPEG'
          pdf.addImage(image, format, 0, 0, pageWidth, pageHeight)
          continue
        }
        const availableWidth = pageWidth - margin * 2
        const availableHeight = pageHeight - margin * 2
        const scale = Math.min(availableWidth / imageRatio, availableHeight)
        const imageWidth = scale * imageRatio
        const imageHeight = scale
        const x = (pageWidth - imageWidth) / 2
        const y = (pageHeight - imageHeight) / 2
        const format = page.file.type === 'image/png' ? 'PNG' : page.file.type === 'image/webp' ? 'WEBP' : 'JPEG'
        pdf.addImage(image, format, x, y, imageWidth, imageHeight)
      }
      pdf?.save(safePdfFilename(book.title))
      setIsComplete(true)
    } catch (generationError) {
      console.error('PDF 생성 오류', generationError)
      setError('PDF를 만드는 중 문제가 발생했습니다. 이미지 파일을 확인한 후 다시 시도해주세요.')
    } finally {
      setIsGenerating(false)
    }
  }

  return <section className="pdf-card"><div className="section-kicker">5단계 · PDF 만들기</div><div className="pdf-intro"><CheckCircle2 size={42} /><div><h2>그림책이 완성되었습니다!</h2><p>이제 그림책을 PDF 파일로 저장할 수 있어요.</p></div></div>
    <div className="book-summary"><strong>{book.title || '제목 없는 그림책'}</strong><span>{book.author || '작가 미입력'}</span><span>총 {pages.length}페이지</span></div>
    <fieldset className="pdf-size-options"><legend>PDF 페이지 크기</legend><label className={pageSize === 'original' ? 'is-selected' : ''}><input type="radio" name="pdf-size" value="original" checked={pageSize === 'original'} onChange={() => setPageSize('original')} /><span>원본 비율</span><small>이미지 비율에 맞춰 만들어요</small></label><label className={pageSize === 'a4-portrait' ? 'is-selected' : ''}><input type="radio" name="pdf-size" value="a4-portrait" checked={pageSize === 'a4-portrait'} onChange={() => setPageSize('a4-portrait')} /><span>A4 세로</span><small>210 × 297 mm</small></label><label className={pageSize === 'a4-landscape' ? 'is-selected' : ''}><input type="radio" name="pdf-size" value="a4-landscape" checked={pageSize === 'a4-landscape'} onChange={() => setPageSize('a4-landscape')} /><span>A4 가로</span><small>297 × 210 mm</small></label></fieldset>
    {isGenerating && <p className="pdf-status" role="status">PDF를 만들고 있어요...</p>}{isComplete && <p className="pdf-status is-complete" role="status">PDF가 완성되었습니다!</p>}{error && <p className="pdf-status is-error" role="alert">{error}</p>}
    <div className="navigation-buttons"><button className="secondary-button" onClick={onBack} disabled={isGenerating}><ChevronLeft size={20} /> 미리보기로 돌아가기</button><button className="primary-button pdf-create-button" onClick={createPdf} disabled={isGenerating}>{isComplete ? <><FileText size={20} /> PDF 다시 만들기</> : <><FileText size={20} /> PDF 만들기</>}{isGenerating && ' · 만드는 중'}</button></div><button className="ebook-entry-button" onClick={onEbook} disabled={isGenerating}>📖 웹 전자책 보기</button>
  </section>
}

function App() {
  const [step, setStep] = useState<Step>(1)
  const [isCreating, setIsCreating] = useState(false)
  const [book, setBook] = useState(initialBook)
  const [pages, setPages] = useState<Page[]>([])
  const [preview, setPreview] = useState<Page | null>(null)
  const [music, setMusic] = useState<BookMusic>(NO_MUSIC)
  const sharedBookSlug = window.location.pathname.match(/^\/book\/([^/]+)$/)?.[1]
  const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname === '/admin/'
  const pagesRef = useRef<Page[]>([])
  useEffect(() => { pagesRef.current = pages }, [pages])
  useEffect(() => () => pagesRef.current.forEach((page) => URL.revokeObjectURL(page.previewUrl)), [])
  const updateBook = (field: keyof BookInfo, value: string) => setBook((current) => ({ ...current, [field]: value }))
  const addFiles = (files: FileList | File[]): string | null => {
    if (pages.length >= MAX_PAGES) return MAX_PAGES_ERROR
    const acceptedFiles: File[] = []
    let errorMessage = ''
    for (const file of Array.from(files)) {
      const validationError = validateImageFile(file)
      if (validationError) { errorMessage ||= validationError; continue }
      acceptedFiles.push(file)
    }
    const availableSlots = MAX_PAGES - pages.length
    if (acceptedFiles.length > availableSlots) errorMessage = MAX_PAGES_ERROR
    const filesToAdd = acceptedFiles.slice(0, Math.max(0, availableSlots))
    setPages((current) => [...current, ...filesToAdd.map((file, index) => ({ id: `${file.name}-${file.lastModified}-${Date.now()}-${index}`, file, previewUrl: URL.createObjectURL(file), fileName: file.name }))])
    return errorMessage || null
  }
  const removePage = (pageId: string) => setPages((current) => { const page = current.find((item) => item.id === pageId); if (page) URL.revokeObjectURL(page.previewUrl); return current.filter((item) => item.id !== pageId) })
  const handleReorder = ({ active, over }: DragEndEvent) => { if (!over || active.id === over.id) return; setPages((current) => arrayMove(current, current.findIndex((page) => page.id === active.id), current.findIndex((page) => page.id === over.id))) }
  const startCreating = () => { setIsCreating(true); setStep(1) }
  if (sharedBookSlug) return <SharedBookPage slug={decodeURIComponent(sharedBookSlug)} />
  if (isAdminRoute) return <AdminPage />
  if (!isCreating) return <main className="app-shell"><Header /><section className="welcome"><div className="welcome-copy"><span className="eyebrow">동강초 그림책 도서관</span><h2>우리의 이야기가<br /><em>한 권의 책</em>이 됩니다.</h2><p>학생들이 만든 그림과 이야기를 모아<br />쉽고 재미있게 그림책을 만들어보세요.</p><div className="welcome-actions"><button className="primary-button" onClick={startCreating}><BookOpen size={21} /> 새 그림책 만들기</button><a className="text-button" href="https://donggang-picturebook-library.vercel.app"><BookOpen size={19} /> 그림책 도서관 가기</a></div></div><div className="welcome-shelf" aria-hidden="true"><div className="welcome-shelf__books">{welcomeSpines.map((spine) => <span key={spine.label} className="welcome-spine" style={{ background: spine.color, color: spine.ink, height: spine.height, width: spine.width }}><span>{spine.label}</span></span>)}</div><div className="welcome-shelf__board" /></div></section></main>
  return <main className="app-shell">{step === 6 ? <EbookViewer book={book} pages={pages} onBack={() => setStep(5)} music={music} onMusicChange={setMusic} /> : <><Header editing onHome={() => setIsCreating(false)} /><div className="editor-layout"><StepIndicator current={step} />{step === 1 ? <BookInfoForm book={book} onChange={updateBook} onNext={() => setStep(2)} onHome={() => setIsCreating(false)} /> : step === 2 ? <PageUploader pages={pages} onAdd={addFiles} onDelete={removePage} onReorder={handleReorder} onPreview={setPreview} onBack={() => setStep(1)} onNext={() => setStep(3)} /> : step === 3 ? <PageOrganizer pages={pages} onDelete={removePage} onReorder={handleReorder} onPreview={setPreview} onBack={() => setStep(2)} onNext={() => setStep(4)} /> : step === 4 ? <PagePreview pages={pages} onBack={() => setStep(3)} onPdf={() => setStep(5)} /> : <PdfMaker book={book} pages={pages} onBack={() => setStep(4)} onEbook={() => setStep(6)} />}</div>{preview && <div className="preview-modal" role="dialog" aria-modal="true" aria-label="페이지 미리보기" onClick={() => setPreview(null)}><div className="preview-content" onClick={(event) => event.stopPropagation()}><button className="icon-button close-button" onClick={() => setPreview(null)} aria-label="미리보기 닫기"><X size={24} /></button><img src={preview.previewUrl} alt={preview.fileName} /></div></div>}</>}</main>
}

export default App

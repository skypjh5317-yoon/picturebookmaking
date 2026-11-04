import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Maximize, Minimize, Music, VolumeX, X } from 'lucide-react'
import SaveBookButton from './SaveBookButton'
import MusicPicker from './MusicPicker'
import { NO_MUSIC, describeMusic, useBookMusic, type BookMusic } from '../music/useBookMusic'

export type EbookPage = { id: string; file: File | null; previewUrl: string; fileName: string }
export type EbookBook = { title: string; author: string; grade: string; className: string; school: string; year: string }

type TurnDirection = 'next' | 'previous'

function EbookPageImage({ page }: { page: EbookPage }) {
  return <div className="ebook-page-surface"><img src={page.previewUrl} alt={page.fileName} /></div>
}

export default function EbookViewer({ book, pages, onBack, readOnly = false, music = NO_MUSIC, onMusicChange }: { book: EbookBook; pages: EbookPage[]; onBack?: () => void; readOnly?: boolean; music?: BookMusic; onMusicChange?: (music: BookMusic) => void }) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLElement>(null)
  const touchStartX = useRef<number | null>(null)
  const pointerStartX = useRef<number | null>(null)
  const mouseStartX = useRef<number | null>(null)
  const turnTimer = useRef<number | undefined>(undefined)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [turnDirection, setTurnDirection] = useState<TurnDirection>('next')
  const [isTurning, setIsTurning] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [pageAspectRatios, setPageAspectRatios] = useState<(number | null)[]>([])
  const [bookSize, setBookSize] = useState<{ width: number; height: number } | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const player = useBookMusic(music)
  const userPausedRef = useRef(false)
  const musicLabel = describeMusic(music)
  const toggleMusic = () => { userPausedRef.current = player.isPlaying; player.toggle() }
  // 공유된 책은 처음 화면을 누르거나 책장을 넘길 때 음악이 자동으로 시작됩니다(브라우저 자동재생 정책).
  const startMusicOnFirstTouch = (event: React.PointerEvent) => {
    if (!readOnly || !player.hasMusic || player.isPlaying || userPausedRef.current) return
    if ((event.target as HTMLElement).closest('.ebook-music')) return
    userPausedRef.current = true
    void player.play()
  }

  const revealedIndex = turnDirection === 'next' ? currentIndex + 1 : currentIndex - 1
  const visibleIndexes = isTurning ? [currentIndex, revealedIndex] : [currentIndex]
  const frameAspectRatio = visibleIndexes
    .map((index) => pageAspectRatios[index])
    .filter((ratio): ratio is number => ratio !== null && Number.isFinite(ratio) && ratio > 0)
    .reduce((smallestRatio, ratio) => Math.min(smallestRatio, ratio), Number.POSITIVE_INFINITY)

  const recalculateBookSize = useCallback(() => {
    const stage = stageRef.current
    if (!stage || !Number.isFinite(frameAspectRatio) || frameAspectRatio <= 0) return
    const styles = getComputedStyle(stage)
    const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight)
    const verticalPadding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom)
    const availableWidth = Math.max(0, stage.clientWidth - horizontalPadding)
    const availableHeight = Math.max(0, stage.clientHeight - verticalPadding)
    if (availableWidth <= 0 || availableHeight <= 0) return
    const width = Math.min(availableWidth, availableHeight * frameAspectRatio)
    const height = width / frameAspectRatio
    if (width <= 0 || height <= 0) return
    setBookSize((current) => current && Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1 ? current : { width, height })
  }, [frameAspectRatio])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const observer = new ResizeObserver(recalculateBookSize)
    observer.observe(stage)
    const handleResize = recalculateBookSize
    window.addEventListener('resize', handleResize)
    recalculateBookSize()
    return () => { observer.disconnect(); window.removeEventListener('resize', handleResize) }
  }, [recalculateBookSize])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setPageAspectRatios([])
    Promise.all(pages.map((page) => new Promise<number | null>((resolve) => {
      const image = new Image()
      image.onload = () => resolve(image.naturalWidth > 0 && image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : null)
      image.onerror = () => resolve(null)
      image.src = page.previewUrl
    }))).then((ratios) => {
      if (cancelled) return
      setPageAspectRatios(ratios)
      setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [pages])

  useEffect(() => () => { if (turnTimer.current) window.clearTimeout(turnTimer.current) }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); goTo(currentIndex + 1, 'next') }
      if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(currentIndex - 1, 'previous') }
      if (event.key === 'Home') { event.preventDefault(); goTo(0, 'previous') }
      if (event.key === 'End') { event.preventDefault(); goTo(pages.length - 1, 'next') }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  const goTo = (targetIndex: number, direction: TurnDirection) => {
    if (isTurning || pages.length === 0) return
    const nextIndex = Math.max(0, Math.min(pages.length - 1, targetIndex))
    if (nextIndex === currentIndex) return
    setTurnDirection(direction)
    setIsTurning(true)
    turnTimer.current = window.setTimeout(() => {
      setCurrentIndex(nextIndex)
      setIsTurning(false)
    }, 650)
  }

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await viewerRef.current?.requestFullscreen()
      else await document.exitFullscreen()
    } catch (error) {
      console.error('전체화면을 사용할 수 없습니다.', error)
    }
  }

  useEffect(() => {
    const handleFullscreen = () => {
      const fullscreenActive = Boolean(document.fullscreenElement)
      setIsFullscreen(fullscreenActive)
      requestAnimationFrame(recalculateBookSize)
    }
    document.addEventListener('fullscreenchange', handleFullscreen)
    return () => document.removeEventListener('fullscreenchange', handleFullscreen)
  }, [recalculateBookSize])

  const handleTouchStart = (event: React.TouchEvent) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null }
  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = event.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 45) return
    if (delta < 0) goTo(currentIndex + 1, 'next')
    else goTo(currentIndex - 1, 'previous')
  }
  const handlePointerDown = (event: React.PointerEvent) => { if (event.pointerType === 'mouse') pointerStartX.current = event.clientX }
  const handlePointerUp = (event: React.PointerEvent) => {
    if (pointerStartX.current === null) return
    const delta = event.clientX - pointerStartX.current
    pointerStartX.current = null
    if (Math.abs(delta) < 55) return
    if (delta < 0) goTo(currentIndex + 1, 'next')
    else goTo(currentIndex - 1, 'previous')
  }
  const handleMouseDown = (event: React.MouseEvent) => { mouseStartX.current = event.clientX }
  const handleMouseUp = (event: React.MouseEvent) => {
    if (mouseStartX.current === null) return
    const delta = event.clientX - mouseStartX.current
    mouseStartX.current = null
    if (Math.abs(delta) < 55) return
    if (delta < 0) goTo(currentIndex + 1, 'next')
    else goTo(currentIndex - 1, 'previous')
  }
  const handleStageClick = (event: React.MouseEvent<HTMLElement>) => {
    if (Math.abs((event.clientX - window.innerWidth / 2)) < 50) return
    if ((event.target as HTMLElement).closest('button')) return
    if (event.clientX < window.innerWidth / 2) goTo(currentIndex - 1, 'previous')
    else goTo(currentIndex + 1, 'next')
  }

  const currentPage = pages[currentIndex]
  const revealedPage = isTurning && revealedIndex >= 0 && revealedIndex < pages.length ? pages[revealedIndex] : currentPage
  const pageLabel = `${currentIndex + 1} / ${pages.length}`

  return <main ref={viewerRef} className={`ebook-viewer ${isFullscreen ? 'is-fullscreen' : ''}`} onPointerDownCapture={startMusicOnFirstTouch}>
    <header className="ebook-header">{!readOnly && onBack ? <button className="ebook-back" onClick={onBack}><ArrowLeft size={20} /> 제작 화면으로</button> : <span aria-hidden="true" />}<div className="ebook-heading"><span>동강초 그림책 도서관</span><strong>{book.title || '제목 없는 그림책'}</strong><small>{book.author || '작가 미입력'}</small></div><div className="ebook-header-actions">{player.hasMusic && <div className={`ebook-music ${player.isPlaying ? 'is-playing' : ''}`}><button className="ebook-music__toggle" onClick={toggleMusic} aria-label={player.isPlaying ? '음악 끄기' : '음악 켜기'} title={musicLabel}>{player.isPlaying ? <Music size={20} /> : <VolumeX size={20} />}<span>{player.isPlaying ? '음악 끄기' : '🎵 음악 켜기'}</span></button>{player.isPlaying && <input className="ebook-music__volume" type="range" min="0" max="1" step="0.05" value={player.volume} onChange={(event) => player.setVolume(Number(event.target.value))} aria-label="음악 소리 크기" />}</div>}<button className="ebook-fullscreen" onClick={toggleFullscreen} aria-label="전체 화면" title="전체 화면">{isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}<span>{isFullscreen ? '전체화면 종료' : '전체화면'}</span></button></div></header>
    <section ref={stageRef} className="ebook-stage" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onClick={handleStageClick} aria-label="웹 전자책">
      {isLoading ? <div className="ebook-loading">📖 그림책을 펼치는 중...</div> : currentPage && <div className="ebook-book is-single" style={bookSize ? { width: bookSize.width, height: bookSize.height } : { visibility: 'hidden' }}>
        <div className="ebook-under-page">{revealedPage && <EbookPageImage page={revealedPage} />}</div>
        <div className={`ebook-turning-page ${isTurning ? `is-turning-${turnDirection}` : ''}`}><EbookPageImage page={currentPage} /></div>
      </div>}
    </section>
    <footer className="ebook-controls"><div className="ebook-navigation"><button className="ebook-nav-button" onClick={() => goTo(currentIndex - 1, 'previous')} disabled={currentIndex === 0 || isTurning} aria-label="이전 페이지">‹ 이전</button><strong>{pageLabel}</strong><button className="ebook-nav-button" onClick={() => goTo(currentIndex + 1, 'next')} disabled={currentIndex === pages.length - 1 || isTurning} aria-label="다음 페이지">다음 ›</button></div>{player.isPlaying && music.type === 'track' && <p className="ebook-music-credit">배경음악 {musicLabel} (YouTube 오디오 보관함)</p>}<div className="ebook-thumbnails" aria-label="페이지 선택">{pages.map((page, index) => <button key={page.id} className={index === currentIndex ? 'is-current' : ''} onClick={() => goTo(index, index > currentIndex ? 'next' : 'previous')} aria-label={`${index + 1}페이지`} title={`${index + 1}페이지`}><span>{index + 1}</span></button>)}</div>{!readOnly && onMusicChange && !isFullscreen && <MusicPicker music={music} onChange={onMusicChange} onPicked={(next) => { userPausedRef.current = false; void player.play(next) }} disabled={isSaved} />}{!readOnly && pages.length > 0 && pages.every((page) => page.file instanceof File) && <SaveBookButton book={book} pages={pages.map((page) => ({ file: page.file as File, fileName: page.fileName }))} music={music} onSaved={() => setIsSaved(true)} />}{readOnly && <div className="ebook-copyright"><p>ⓒ 작가 {book.author || '미상'} · 무단 복제·배포 금지</p><p>이 도서관의 그림책은 동강초등학교 학생 작가들의 창작물로, 저작권은 각 작가에게 있습니다. 개인 감상 외에 글과 그림을 복제·배포·수정하거나 다른 곳에 게시할 수 없습니다.</p></div>}</footer>
    {isFullscreen && <button className="ebook-exit" onClick={toggleFullscreen} aria-label="전체화면 닫기"><X size={22} /></button>}
  </main>
}

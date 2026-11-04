import { supabase } from '../lib/supabase'
import { validateImageFile } from '../utils/fileValidation'
import { findPreset } from '../music/presets'
import { NO_MUSIC, validateMusicFile, type BookMusic } from '../music/useBookMusic'

export type SaveBookInfo = { title: string; author: string; grade: string; className: string; school: string; year: string }
export type SaveBookPage = { file: File; fileName: string }
export type SharedBookPage = { id: string; pageNumber: number; image_url: string; previewUrl: string; fileName: string; file: File | null }
export type SharedBook = { id: string; title: string; author: string; grade: string; className: string; school: string; year: string; isPublished: boolean; pages: SharedBookPage[]; music: BookMusic }

const MUSIC_BUCKET = 'book-music'

function musicExtension(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && ['mp3', 'm4a', 'ogg', 'wav'].includes(fromName)) return fromName
  return file.type.includes('mp4') || file.type.includes('m4a') || file.type.includes('aac') ? 'm4a' : file.type.includes('ogg') ? 'ogg' : file.type.includes('wav') ? 'wav' : 'mp3'
}

function musicContentType(file: File) {
  const extension = musicExtension(file)
  return extension === 'm4a' ? 'audio/mp4' : extension === 'ogg' ? 'audio/ogg' : extension === 'wav' ? 'audio/wav' : 'audio/mpeg'
}

async function uploadMusic(client: NonNullable<typeof supabase>, music: BookMusic) {
  if (music.type === 'preset') return { music_preset: music.presetId, music_url: null, music_path: null, music_name: null }
  if (music.type !== 'custom' || !music.file) return { music_preset: null, music_url: null, music_path: null, music_name: null }
  if (validateMusicFile(music.file)) throw new Error('MUSIC_UPLOAD_FAILED')
  const path = `music/${crypto.randomUUID()}.${musicExtension(music.file)}`
  const { error } = await client.storage.from(MUSIC_BUCKET).upload(path, music.file, { contentType: musicContentType(music.file), upsert: false })
  if (error) { console.error('Music upload failed', error); throw new Error('MUSIC_UPLOAD_FAILED') }
  const { data } = client.storage.from(MUSIC_BUCKET).getPublicUrl(path)
  return { music_preset: null, music_url: data.publicUrl, music_path: path, music_name: music.name }
}

function toBookMusic(row: { music_preset?: string | null; music_url?: string | null; music_name?: string | null }): BookMusic {
  const preset = findPreset(row.music_preset)
  if (preset) return { type: 'preset', presetId: preset.id }
  if (row.music_url) return { type: 'custom', url: row.music_url, name: row.music_name || '배경음악', file: null }
  return NO_MUSIC
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function saveBook(book: SaveBookInfo, pages: SaveBookPage[], onProgress?: (current: number, total: number) => void, music: BookMusic = NO_MUSIC) {
  const client = requireClient()
  for (const page of pages) {
    if (validateImageFile(page.file)) throw new Error('PAGE_UPLOAD_FAILED')
  }
  const musicFields = await uploadMusic(client, music)
  const slug = crypto.randomUUID()
  const { data: savedBook, error: bookError } = await client.from('books').insert({ slug, title: book.title, author: book.author, grade: book.grade, class_name: book.className, school: book.school, year: Number(book.year) || new Date().getFullYear(), ...musicFields }).select('id, slug').single()
  if (bookError || !savedBook) { console.error('Book insert failed', bookError); throw new Error('BOOK_SAVE_FAILED') }

  const pageRows: Array<{ book_id: string; page_number: number; image_path: string; image_url: string; original_filename: string }> = []
  try {
    for (const [index, page] of pages.entries()) {
      const extension = page.file.type === 'image/png' ? 'png' : page.file.type === 'image/webp' ? 'webp' : 'jpg'
      const path = `books/${savedBook.id}/${index + 1}-${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await client.storage.from('book-pages').upload(path, page.file, { contentType: page.file.type, upsert: false })
      if (uploadError) { console.error('Page upload failed', uploadError); throw new Error('PAGE_UPLOAD_FAILED') }
      const { data: publicUrl } = client.storage.from('book-pages').getPublicUrl(path)
      pageRows.push({ book_id: savedBook.id, page_number: index + 1, image_path: path, image_url: publicUrl.publicUrl, original_filename: page.fileName })
      onProgress?.(index + 1, pages.length)
    }
    const { error: pagesError } = await client.from('book_pages').insert(pageRows)
    if (pagesError) { console.error('Page rows insert failed', pagesError); throw new Error('PAGE_SAVE_FAILED') }
    const { error: coverError } = await client.from('books').update({ cover_image_url: pageRows[0]?.image_url ?? null }).eq('id', savedBook.id)
    if (coverError) console.error('Cover update failed', coverError)
    return savedBook
  } catch (error) {
    console.error('Book page save failed', error)
    throw error
  }
}

export async function getBookBySlug(slug: string) {
  const client = requireClient()
  const { data, error } = await client.from('books').select('*').eq('slug', slug).single()
  if (error || !data) {
    console.error('Shared book query failed:', {
      slug,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code
    })
    throw new Error('BOOK_NOT_FOUND')
  }
  console.log('URL slug:', slug)
  console.log('shared book:', data)
  console.log('book.id:', data.id)
  console.log('book.slug:', data.slug)
  console.log('book.is_published:', data.is_published)
  return { ...data, is_published: data.is_published ?? true }
}

export async function getBookPages(bookId: string): Promise<SharedBookPage[]> {
  const client = requireClient()
  const { data, error } = await client.from('book_pages').select('*').eq('book_id', bookId).order('page_number', { ascending: true })
  if (error) {
    console.error('Shared pages query failed:', {
      bookId,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    throw new Error('PAGES_QUERY_FAILED')
  }
  console.log('shared pages:', data)
  console.log('shared page count:', data?.length)
  const pages = (data ?? []).map((page) => ({ id: page.id, pageNumber: page.page_number, image_url: page.image_url ?? '', previewUrl: page.image_url ?? '', fileName: page.original_filename, file: null }))
  console.log('page count:', pages.length)
  return pages
}

export async function getSharedBook(slug: string): Promise<SharedBook> {
  console.log('shared route param:', slug)
  const book = await getBookBySlug(slug)
  console.log('loaded book id:', book.id)
  const pages = await getBookPages(book.id)
  return { id: book.id, title: book.title, author: book.author, grade: book.grade, className: book.class_name, school: book.school, year: String(book.year), isPublished: book.is_published, pages, music: toBookMusic(book) }
}

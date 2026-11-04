import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { MUSIC_BUCKET, uploadMusic } from './bookService'
import type { BookMusic } from '../music/useBookMusic'

export type AdminBook = {
  id: string
  slug: string
  title: string
  author: string
  grade: string
  class_name: string
  school: string
  year: number
  cover_image_url: string | null
  is_published: boolean
  created_at: string
  music_preset?: string | null
  music_url?: string | null
  music_path?: string | null
  music_name?: string | null
}

export const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL ?? '').trim().toLowerCase()

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

function logSupabaseError(label: string, error: { message?: string; details?: string; hint?: string; code?: string } | null) {
  console.error(label, { error, message: error?.message, details: error?.details, hint: error?.hint, code: error?.code })
}

function logDeleteError(step: string, error: { message?: string; details?: string | null; hint?: string | null; code?: string | null } | null) {
  console.error('DELETE BOOK ERROR', {
    step,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code
  })
}

export function isAdminUser(user: User | null) {
  return Boolean(user?.email && adminEmail && user.email.toLowerCase() === adminEmail)
}

async function requireAdminUser() {
  const client = requireClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error) logSupabaseError('Admin user lookup failed', error)
  console.log('admin user:', user)
  if (error || !isAdminUser(user)) throw new Error('ADMIN_NOT_ALLOWED')
  return user
}

export async function signInAdmin(email: string, password: string) {
  const client = requireClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    logSupabaseError('Admin sign-in failed', error)
    throw new Error('LOGIN_FAILED')
  }
  if (!isAdminUser(data.user)) {
    await client.auth.signOut()
    throw new Error('ADMIN_NOT_ALLOWED')
  }
  return data.user
}

export async function signOutAdmin() {
  const client = requireClient()
  const { error } = await client.auth.signOut()
  if (error) {
    logSupabaseError('Admin sign-out failed', error)
    throw new Error('LOGOUT_FAILED')
  }
}

export async function getAdminBooks(): Promise<AdminBook[]> {
  await requireAdminUser()
  const client = requireClient()
  const { data, error } = await client.from('books').select('*').order('created_at', { ascending: false })
  if (error) {
    console.error('Admin books query error:', {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code
    })
    throw new Error('BOOKS_QUERY_FAILED')
  }
  console.log('Admin books:', data)
  console.log('Admin books count:', data?.length)
  return (data ?? []).map((book) => ({ ...book, is_published: book.is_published ?? true })) as AdminBook[]
}

export async function updateBookPublication(bookId: string, isPublished: boolean) {
  await requireAdminUser()
  const client = requireClient()
  const { error } = await client.from('books').update({ is_published: isPublished, updated_at: new Date().toISOString() }).eq('id', bookId)
  if (error) {
    logSupabaseError('Book publication update failed', error)
    throw new Error('BOOK_UPDATE_FAILED')
  }
}

export async function updateBookMusic(book: AdminBook, music: BookMusic) {
  await requireAdminUser()
  const client = requireClient()
  // 바꾸지 않은 '내 음악'은 그대로 두고, 새로 고른 음악만 저장소에 올립니다.
  const keepCurrentFile = music.type === 'custom' && !music.file && music.url === book.music_url
  const musicFields = keepCurrentFile
    ? { music_preset: null, music_url: book.music_url ?? null, music_path: book.music_path ?? null, music_name: book.music_name ?? null }
    : await uploadMusic(client, music)
  const { data, error } = await client.from('books').update({ ...musicFields, updated_at: new Date().toISOString() }).eq('id', book.id).select('id')
  if (error || !data?.length) {
    logSupabaseError('Book music update failed', error)
    if (musicFields.music_path && musicFields.music_path !== book.music_path) await client.storage.from(MUSIC_BUCKET).remove([musicFields.music_path])
    throw new Error('MUSIC_UPDATE_FAILED')
  }
  // 예전에 올렸던 음악 파일은 더 이상 쓰지 않으니 정리합니다(실패해도 음악 변경은 완료).
  if (book.music_path && book.music_path !== musicFields.music_path) {
    const { error: removeError } = await client.storage.from(MUSIC_BUCKET).remove([book.music_path])
    if (removeError) console.warn('Old music file cleanup failed', removeError)
  }
}

export async function deleteBook(bookId: string) {
  const client = requireClient()
  if (!bookId) throw new Error('삭제할 책 ID가 없습니다.')
  console.log('[DELETE] bookId:', bookId)
  const { data: { user }, error: authError } = await client.auth.getUser()
  console.log('[DELETE] current user:', user)
  console.log('[DELETE] auth error:', authError)
  if (authError) logDeleteError('auth', authError)
  if (authError || !isAdminUser(user)) throw new Error('관리자 삭제 권한을 확인해주세요.')

  const { data: pages, error: pageError } = await client.from('book_pages').select('image_path').eq('book_id', bookId)
  console.log('[DELETE] pages loaded:', pages)
  if (pageError) {
    logDeleteError('load-pages', pageError)
    throw new Error(pageError.message || '페이지 정보를 불러오지 못했습니다.')
  }

  const paths = (pages ?? []).map((page) => page.image_path).filter((path): path is string => Boolean(path))
  console.log('[DELETE] storage paths:', paths)
  let storageData: unknown = []
  if (paths.length > 0) {
    const { data: removedFiles, error: storageError } = await client.storage.from('book-pages').remove(paths)
    storageData = removedFiles
    console.log('[DELETE] storage data:', removedFiles)
    console.log('[DELETE] storage error:', storageError)
    if (storageError) {
      const storageDetails = storageError as typeof storageError & { details?: string; hint?: string; code?: string }
      logDeleteError('delete-storage', storageDetails)
      throw new Error(storageDetails.message || '페이지 이미지 삭제에 실패했습니다.')
    }
  }
  console.log('[DELETE] storage result:', storageData)

  const { data: deletedBooks, error: bookDeleteError } = await client.from('books').delete().eq('id', bookId).select('id')
  console.log('[DELETE] books delete result:', deletedBooks)
  console.error('[DELETE] books delete error:', bookDeleteError)
  if (bookDeleteError) {
    logDeleteError('delete-book', bookDeleteError)
    throw new Error(bookDeleteError.message || '그림책 삭제에 실패했습니다.')
  }
  if (!deletedBooks?.some((book) => book.id === bookId)) {
    const noRowsError = { message: '삭제된 책이 없습니다. book.id 또는 books DELETE RLS 정책을 확인해주세요.', details: null, hint: null, code: 'BOOK_DELETE_NO_ROWS' }
    logDeleteError('delete-book', noRowsError)
    throw new Error(noRowsError.message)
  }
  console.log('[DELETE] book deleted:', bookId)
  console.log('[DELETE] book_pages cleanup:', 'ON DELETE CASCADE')
}

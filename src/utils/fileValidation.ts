export const MAX_IMAGE_SIZE = 10 * 1024 * 1024
export const MAX_PAGES = 20
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const IMAGE_TYPE_ERROR =
  'JPG, PNG, WEBP 형식의 이미지만 업로드할 수 있어요.'

export const IMAGE_SIZE_ERROR =
  '이미지 크기는 10MB 이하만 업로드할 수 있어요.'

export const MAX_PAGES_ERROR =
  '그림책은 최대 20페이지까지 만들 수 있어요.'

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) return IMAGE_TYPE_ERROR
  if (file.size > MAX_IMAGE_SIZE) return IMAGE_SIZE_ERROR
  return null
}

// 기본 배경음악 곡 목록 (public/music 폴더의 mp3 파일)
// 출처: 유튜브 오디오 보관함 무료 음원. 전자책에서 재생할 때 곡명과 작곡가를 함께 표시합니다.

export type MusicCategoryId = 'energy' | 'happy' | 'cute' | 'comic' | 'calm' | 'groove'

export type MusicCategory = { id: MusicCategoryId; emoji: string; label: string; description: string }

export type MusicTrack = { id: string; category: MusicCategoryId; title: string; artist: string }

export const MUSIC_CATEGORIES: MusicCategory[] = [
  { id: 'energy', emoji: '⚡', label: '신나는', description: '모험, 운동회, 신나는 장면' },
  { id: 'happy', emoji: '😊', label: '행복한', description: '가족, 여행, 즐거운 하루' },
  { id: 'cute', emoji: '🐣', label: '귀여운', description: '동물, 아기, 아기자기한 이야기' },
  { id: 'comic', emoji: '🤪', label: '장난스러운', description: '실수, 반전, 웃긴 장면' },
  { id: 'calm', emoji: '🌿', label: '여유로운', description: '산책, 자연, 잔잔한 이야기' },
  { id: 'groove', emoji: '🌧️', label: '감성적인', description: '비 오는 날, 생각에 잠기는 장면' },
]

export const MUSIC_TRACKS: MusicTrack[] = [
  { id: 'splashing-around', category: 'energy', title: 'Splashing Around', artist: 'The Green Orbs' },
  { id: 'sabana-havana', category: 'energy', title: 'Sabana Havana', artist: 'Jimmy Fontanez' },
  { id: 'invisible', category: 'energy', title: 'Invisible', artist: 'Vibe Tracks' },
  { id: 'sand-castles', category: 'happy', title: 'Sand Castles', artist: 'The Green Orbs' },
  { id: 'spring-in-my-step', category: 'happy', title: 'Spring In My Step', artist: 'Silent Partner' },
  { id: 'springtime-family-band', category: 'happy', title: 'Springtime Family Band', artist: 'The Green Orbs' },
  { id: 'vacation-uke', category: 'happy', title: 'Vacation Uke', artist: 'ALBIS' },
  { id: 'jigsaw-puzzle', category: 'cute', title: 'Jigsaw Puzzle', artist: 'The Green Orbs' },
  { id: 'snack-time', category: 'cute', title: 'Snack Time', artist: 'The Green Orbs' },
  { id: 'bike-rides', category: 'cute', title: 'Bike Rides', artist: 'The Green Orbs' },
  { id: 'cuckoo-clock', category: 'cute', title: 'Cuckoo Clock', artist: 'Quincas Moreira' },
  { id: 'mr-turtle', category: 'comic', title: 'Mr. Turtle', artist: 'The Green Orbs' },
  { id: 'rainy-day-games', category: 'comic', title: 'Rainy Day Games', artist: 'The Green Orbs' },
  { id: 'jack-in-the-box', category: 'comic', title: 'Jack in the Box', artist: 'Silent Partner' },
  { id: 'if-i-had-a-chicken', category: 'comic', title: 'If I Had a Chicken', artist: 'Kevin MacLeod' },
  { id: 'ponies-and-balloons', category: 'calm', title: 'Ponies and Balloons', artist: 'The Green Orbs' },
  { id: 'whistling-down-the-road', category: 'calm', title: 'Whistling Down the Road', artist: 'Silent Partner' },
  { id: 'morning-stroll', category: 'calm', title: 'Morning Stroll', artist: 'Josh Kirsch' },
  { id: 'how-it-began', category: 'calm', title: 'How it Began', artist: 'Silent Partner' },
  { id: 'osaka-rain', category: 'groove', title: 'Osaka Rain', artist: 'ALBIS' },
  { id: 'da-jazz-blues', category: 'groove', title: 'Da Jazz Blues', artist: 'Doug Maxwell' },
  { id: 'about-that-oldie', category: 'groove', title: 'About That Oldie', artist: 'Vibe Tracks' },
]

export function findTrack(id: string | null | undefined) {
  return MUSIC_TRACKS.find((track) => track.id === id) ?? null
}

export const trackUrl = (track: MusicTrack) => `/music/${track.id}.mp3`

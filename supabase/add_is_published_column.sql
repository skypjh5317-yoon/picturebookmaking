-- 관리자 화면의 '비공개로 전환 / 게시하기' 버튼이 쓰는 칸입니다.
-- 기존 그림책은 모두 '게시 중(true)'으로 시작하므로 지금 보이는 상태와 같습니다.
alter table public.books add column if not exists is_published boolean not null default true;

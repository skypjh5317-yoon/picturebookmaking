import { Trash2, X } from 'lucide-react'

export default function DeleteBookModal({ title, isDeleting, onCancel, onConfirm }: { title: string; isDeleting: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="admin-modal-backdrop" role="presentation"><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="delete-book-title"><button className="icon-button admin-modal-close" onClick={onCancel} disabled={isDeleting} aria-label="삭제 확인 닫기"><X size={21} /></button><div className="admin-danger-icon"><Trash2 size={24} /></div><h2 id="delete-book-title">이 그림책을 삭제할까요?</h2><p><strong>{title}</strong></p><p>삭제하면 그림책 정보와 페이지 이미지가 영구적으로 삭제됩니다.</p><div className="admin-modal-actions"><button className="secondary-button" onClick={onCancel} disabled={isDeleting}>취소</button><button className="danger-button" onClick={onConfirm} disabled={isDeleting}><Trash2 size={18} /> {isDeleting ? '삭제 중...' : '영구 삭제'}</button></div></section></div>
}

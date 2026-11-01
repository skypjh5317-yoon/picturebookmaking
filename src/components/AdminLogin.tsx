import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { signInAdmin } from '../services/adminService'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await signInAdmin(email.trim(), password)
    } catch (loginError) {
      setError(loginError instanceof Error && loginError.message === 'ADMIN_NOT_ALLOWED' ? '관리자 계정으로만 로그인할 수 있습니다.' : '이메일 또는 비밀번호를 확인해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <main className="admin-shell"><section className="admin-login-card"><div className="admin-login-icon"><LockKeyhole size={28} /></div><span className="eyebrow">동강초 그림책 도서관</span><h1>그림책 관리자</h1><p>관리자 계정으로 로그인해주세요.</p><form onSubmit={handleSubmit}><label>이메일<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label>비밀번호<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p className="admin-form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={isSubmitting}><LockKeyhole size={19} /> {isSubmitting ? '로그인 중...' : '로그인'}</button></form></section></main>
}

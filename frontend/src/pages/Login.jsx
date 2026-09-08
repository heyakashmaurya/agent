import { useState } from 'react';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import { DEMO_MODE } from '../utils/constants';

export default function Login({ onSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(e) { e.preventDefault(); setError(''); setBusy(true); try { await login({ email: email.trim(), password }); onSuccess(); } catch (err) { setError(err.message || 'Unable to sign in.'); } finally { setBusy(false); } }
  function demoLogin() { if (DEMO_MODE) { window.localStorage.setItem('restaurant_ai_demo_auth', 'true'); window.history.replaceState({}, '', '/dashboard'); window.dispatchEvent(new PopStateEvent('popstate')); } }
  return <AuthLayout><div className="auth-heading"><span className="eyebrow">STAFF PORTAL</span><h2>Welcome back</h2><p>Sign in to manage reservations, tables and your AI receptionist.</p></div><form className="form-stack" onSubmit={submit}><label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@restaurant.com" required/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}/></label>{error && <div className="alert alert--danger">{error}</div>}<button className="primary-button primary-button--full" disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in'}<span>→</span></button></form>{DEMO_MODE && <div className="demo-access"><span>Demo mode is enabled.</span><button type="button" onClick={demoLogin}>Enter demo dashboard</button></div>}<p className="form-note">Authentication uses your backend <code>/api/auth/login</code> endpoint. Never put API secrets in Vite variables.</p></AuthLayout>;
}

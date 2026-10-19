import React, { useEffect, useState } from 'react';
import { hasLegacyWorkspace, importLegacyWorkspace } from '../utils/accountStorage';
import { ArrowRight, Check, LogOut, ShieldCheck } from 'lucide-react';
import './account-security.css';

type Security = { emailVerified: boolean; mfaEnabled: boolean; mfaRequired: boolean; mfaAuthenticated: boolean; mailConfigured: boolean; mailSender?: string; mailPublicUrl?: string };
async function api(path: string, body?: unknown) {
 const response = await fetch('/api/auth/' + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin' });
 const data = await response.json();
 if (!response.ok) throw Error(data.message || 'Die Anfrage konnte nicht ausgeführt werden.');
 return data;
}
export function AccountSecurity({ onReady }: { onReady?: () => void }) {
 const [state, setState] = useState<Security | null>(null), [error, setError] = useState('');
 const [message, setMessage] = useState(''), [password, setPassword] = useState(''), [code, setCode] = useState('');
 const [secret, setSecret] = useState(''), [recovery, setRecovery] = useState<string[]>([]), [busy, setBusy] = useState(false);
 const [sessions, setSessions] = useState<any[]>([]);
 const [mailEmail, setMailEmail] = useState(''), [mailPassword, setMailPassword] = useState(''), [publicUrl, setPublicUrl] = useState(location.origin);
 const [newPassword, setNewPassword] = useState(''), [confirmPassword, setConfirmPassword] = useState(''), [invite, setInvite] = useState('');
 const [legacyConsent, setLegacyConsent] = useState(false);
 const load = async () => { const data = await api('security'); setState(data); const list = await api('sessions'); setSessions(list.sessions); };
 useEffect(() => { load().catch(e => setError(e.message)); }, []);
 async function run(action: () => Promise<void>) {
  setBusy(true); setError(''); setMessage('');
  try { await action(); await load(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
 }
 const button = 'security-button';
 const field = 'security-input';
 return <section className={`security-panel ${onReady ? 'security-panel-onboarding' : ''}`} aria-label="Kontosicherheit">
  <div className="security-panel-heading"><span className="security-shield"><ShieldCheck size={22} aria-hidden="true" /></span><div><span className="security-eyebrow">DEIN PAPAYAOS-KONTO</span><h2>{onReady ? 'Sicher weiter.' : 'Konto & Sicherheit'}</h2></div></div>
  {error && <p role="alert" className="text-red-300">{error}</p>}
  {message && <p role="status" className="text-emerald-300">{message}</p>}
  {!state && !error && <p>Sicherheitsstatus wird geladen …</p>}
  {state && <>
   {onReady && <ol className="security-steps" aria-label="Einrichtung"><li className={state.emailVerified ? 'is-complete' : 'is-current'}><span>{state.emailVerified ? <Check size={14} /> : '1'}</span>E-Mail</li><li className={state.mfaAuthenticated ? 'is-complete' : state.emailVerified ? 'is-current' : ''}><span>{state.mfaAuthenticated ? <Check size={14} /> : '2'}</span>Authenticator</li><li className={state.emailVerified && (!(state.mfaEnabled || state.mfaRequired) || state.mfaAuthenticated) && !recovery.length ? 'is-complete' : ''}><span>3</span>Workspace</li></ol>}
   <div className={`security-section space-y-2 ${onReady && state.emailVerified ? 'security-verified-email' : ''}`}><h3 className="font-semibold">E-Mail-Adresse</h3><p>{state.emailVerified ? <><Check size={14} aria-hidden="true" /> Bestätigt</> : 'Bestätige deine E-Mail-Adresse, um deinen Workspace freizuschalten.'}</p>
    {!state.emailVerified && <button className={button} disabled={busy || !state.mailConfigured} onClick={() => run(async () => { const d = await api('resend-verification', {}); setMessage(d.message); })}>Bestätigungslink senden</button>}
    {!state.mailConfigured && !state.emailVerified && <p className="text-sm text-amber-200">Bestätigungs-Mails sind noch nicht verfügbar. Der Betreiber muss den Versand einrichten.</p>}
   </div>
   {!onReady && state.mfaRequired && state.mfaAuthenticated && hasLegacyWorkspace() && <div className="security-section space-y-2 rounded-lg border border-amber-200/30 p-3"><h3 className="font-semibold">Alte lokale Workspace-Daten</h3><p className="text-sm">Auf diesem Browser liegen noch Daten aus der bisherigen Version ohne Kontozuordnung. Sie werden nicht automatisch geteilt oder gelöscht.</p><label className="flex gap-2 text-sm"><input type="checkbox" checked={legacyConsent} onChange={e => setLegacyConsent(e.target.checked)} />Ich bestätige, dass diese bisherigen lokalen Chats und Einstellungen zu meinem Konto gehören.</label><button className={button} disabled={!legacyConsent || busy} onClick={() => { importLegacyWorkspace(); location.reload(); }}>Meine bisherigen Daten übernehmen</button></div>}
   {!onReady && state.mfaRequired && state.mfaAuthenticated && <div className="security-section space-y-2 rounded-lg border border-white/20 p-3"><h3 className="font-semibold">STRATO · Konto-E-Mails</h3>
    <p className="text-sm">{state.mailConfigured ? `Versand eingerichtet (${state.mailSender || 'SMTP'}).` : 'Bestätigungs- und Reset-Mails benötigen dein Postfach.'}</p>
    <label className="block text-sm">Postfach-Adresse<input className={field} type="email" autoComplete="off" placeholder={state.mailSender || 'adresse@papayaos.net'} value={mailEmail} onChange={e => setMailEmail(e.target.value)} /></label>
    <label className="block text-sm">STRATO-Postfach-Passwort<input className={field} type="password" autoComplete="off" value={mailPassword} onChange={e => setMailPassword(e.target.value)} /></label>
    <label className="block text-sm">Website-Adresse für E-Mail-Links<input className={field} type="url" value={publicUrl} onChange={e => setPublicUrl(e.target.value)} /></label>
    <p className="text-sm">Lokal funktioniert die lokale Adresse nur auf diesem Rechner. Vor Veröffentlichung die öffentliche HTTPS-Adresse eintragen.</p>
    <button className={button} disabled={busy || !mailEmail || !mailPassword} onClick={() => run(async () => { const d = await api('mail-settings', { email: mailEmail, password: mailPassword, publicUrl }); setMailPassword(''); setMessage(d.message); })}>STRATO verbinden & speichern</button>
   </div>}
   {!onReady && state.emailVerified && (!(state.mfaEnabled || state.mfaRequired) || state.mfaAuthenticated) && <div className="security-section space-y-2"><h3 className="font-semibold">Passwort ändern</h3>
    <label className="block text-sm">Aktuelles Passwort<input className={field} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
    <label className="block text-sm">Neues Passwort · mindestens 12 Zeichen<input className={field} type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label>
    <label className="block text-sm">Neues Passwort wiederholen<input className={field} type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></label>
    <button className={button} disabled={busy || !password || newPassword.length < 12 || newPassword !== confirmPassword} onClick={() => run(async () => { const response = await fetch('/api/user/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: password, newPassword }) }); const d = await response.json(); if (!response.ok) throw Error(d.message || 'Passwort konnte nicht geändert werden.'); setPassword(''); setNewPassword(''); setConfirmPassword(''); location.reload(); })}>Passwort ändern & andere Sitzungen beenden</button>
   </div>}
   {!onReady && state.emailVerified && (!(state.mfaEnabled || state.mfaRequired) || state.mfaAuthenticated) && !state.mfaRequired && <div className="security-section space-y-2"><h3 className="font-semibold">Beta-Einladung</h3><input className={field} aria-label="Beta-Key" value={invite} onChange={e => setInvite(e.target.value)} /><button className={button} disabled={busy || !invite.trim()} onClick={() => run(async () => { const response = await fetch('/api/access-keys/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: invite }) }); const d = await response.json(); if (!response.ok || !d.valid) throw Error(d.message || 'Einladung ungültig.'); setInvite(''); setMessage('Einladung diesem Konto zugeordnet.'); })}>Einladung einlösen</button></div>}
   <div className="security-section space-y-2"><div className="security-section-title"><h3 className="font-semibold">{state.mfaAuthenticated ? 'Dein Zugang ist bereit' : state.mfaEnabled ? 'Anmeldung bestätigen' : 'Dein zweiter Sicherheitsschlüssel'}</h3><span className="security-tag">{state.mfaRequired ? 'Admin-Schutz' : 'Optional'}</span></div>
    <p>{state.mfaEnabled ? (state.mfaAuthenticated ? 'Zweiter Faktor bestätigt. Du kannst zurück zu deinem Team.' : 'Gib den aktuellen Code aus deiner Authenticator-App ein.') : 'Verbinde eine Authenticator-App mit deinem Konto. Bestätige dafür zuerst dein Passwort.'}</p>
    {!state.mfaEnabled && !secret && <><label className="block text-sm">Aktuelles Passwort<input className={field} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
     <button className={`${button} security-primary`} disabled={busy || !password} onClick={() => run(async () => { const d = await api('mfa/setup', { password }); setPassword(''); setSecret(d.secret); })}>{busy ? 'Wird eingerichtet …' : 'Authenticator einrichten'}<ArrowRight size={17} aria-hidden="true" /></button></>}
    {secret && <><p className="text-sm">In deiner Authenticator-App manuell als zeitbasierten Schlüssel hinzufügen:</p><code className="block break-all rounded bg-black/30 p-3 select-all">{secret}</code></>}
    {(secret || (state.mfaEnabled && !state.mfaAuthenticated)) && <><label className="block text-sm">Authenticator- oder Wiederherstellungscode<input className={field} autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value.trim())} /></label>
     <button className={`${button} security-primary`} disabled={busy || !code} onClick={() => run(async () => { const d = await api(secret ? 'mfa/confirm' : 'mfa/verify', { code }); setCode(''); setSecret(''); if (d.recoveryCodes) setRecovery(d.recoveryCodes); else setMessage('Anmeldung bestätigt.'); })}>{busy ? 'Wird geprüft …' : 'Code bestätigen'}<ArrowRight size={17} aria-hidden="true" /></button></>}
    {recovery.length > 0 && <div className="space-y-2 rounded-lg border border-amber-300/40 p-3"><p>Diese Wiederherstellungscodes werden nur jetzt angezeigt. Sicher außerhalb von PapayaOS aufbewahren.</p><pre className="select-all whitespace-pre-wrap text-sm">{recovery.join('\n')}</pre><button className={button} onClick={() => setRecovery([])}>Codes sicher gespeichert</button></div>}
    {state.mfaEnabled && state.mfaAuthenticated && !state.mfaRequired && <><label className="block text-sm">Aktuelles Passwort<input className={field} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label><label className="block text-sm">Aktueller Authenticator-Code<input className={field} autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value.trim())} /></label><button className={button} disabled={busy || !password || !code} onClick={() => run(async () => { await api('mfa/disable', { password, code }); setPassword(''); setCode(''); })}>Zweiten Faktor deaktivieren</button></>}
   </div>
   {!onReady && <details className="security-section security-devices"><summary>Angemeldete Geräte <span>{sessions.length}</span></summary><div className="space-y-2">{sessions.map(s => <div key={s.id} className="rounded-lg border border-white/15 p-3 text-sm"><p className="break-words">{s.device}{s.current ? ' · Dieses Gerät' : ''}</p><p>Zuletzt aktiv: {s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : 'Nicht erfasst'}</p><button className={button} disabled={busy} onClick={() => run(async () => { await api('sessions/revoke', { id: s.id }); if (s.current) location.assign('/login.html'); })}>Abmelden</button></div>)}
    <button className={button} disabled={busy} onClick={() => run(async () => { await api('sessions/revoke', { all: true }); location.assign('/login.html'); })}>Alle Geräte abmelden</button>
   </div></details>}
   {onReady && state.emailVerified && (!state.mfaRequired && !state.mfaEnabled || state.mfaAuthenticated) && recovery.length === 0 && <button className={`${button} security-primary`} onClick={onReady}>Zurück zu meinem Team<ArrowRight size={17} aria-hidden="true" /></button>}
  </>}
 </section>;
}
export function AccountSecurityBoundary({ children }: { children: React.ReactNode }) {
 const accountPage = location.pathname === '/account-security.html' && new URLSearchParams(location.search).get('view') === 'setup';
 const [gated, setGated] = useState<boolean | null>(null), [error, setError] = useState('');
 const [needsLogin, setNeedsLogin] = useState(false);
 useEffect(() => {
  fetch('/api/auth/me', { credentials: 'same-origin' }).then(async response => {
   if (response.status === 401) { setNeedsLogin(true); setGated(true); return; }
   if (!response.ok) throw Error('Sitzung konnte nicht geprüft werden.');
   const s = await api('security'); setGated(!s.emailVerified || ((s.mfaRequired || s.mfaEnabled) && !s.mfaAuthenticated));
  }).catch(e => setError(e.message));
 }, []);
 if (gated === false && !error && !needsLogin && !accountPage) return <>{children}</>;
 return <main className="security-page">
  <header className="security-topbar"><a className="security-logo" href="/" aria-label="PapayaOS Startseite"><img src="/mascots/papaya-avatar.png" alt="" />PapayaOS</a>{needsLogin ? <a className="security-logout" href="/">Zur Startseite</a> : <button className="security-logout" onClick={async () => { try { await api('logout', {}); location.assign('/login.html'); } catch (e: any) { setError(e.message); } }}><LogOut size={15} aria-hidden="true" />Abmelden</button>}</header>
  <div className="security-layout">
   <aside className="security-brand" aria-label="Dein PapayaOS-Team">
    <div className="security-mascot-scene"><span className="security-orbit security-orbit-one" /><span className="security-orbit security-orbit-two" /><span className="security-spark security-spark-one" /><span className="security-spark security-spark-two" /><img className="security-main-dot" src="/mascots/papaya.png" alt="Papaya" /><span className="security-dot-badge"><ShieldCheck size={23} aria-hidden="true" /></span></div>
    <span className="security-eyebrow">DEIN TEAM. DEIN WORKSPACE.</span><h1>Dein Team wartet.<br /><em>Sicher weiter.</em></h1><p>Ein kurzer Sicherheitscheck, dann zurück zu Papaya, Mango und Kiwi.</p>
    <div className="security-team"><div><img src="/mascots/papaya-avatar.png" alt="" /><span>Papaya</span></div><div><img src="/mascots/mango-avatar.png" alt="" /><span>Mango</span></div><div><img src="/mascots/kiwi-avatar.png" alt="" /><span>Kiwi</span></div></div>
   </aside>
   <div className="security-card">{error ? <div className="security-panel" role="alert"><h2>Das hat gerade nicht geklappt.</h2><p>{error}</p><button className="security-button security-primary" onClick={() => location.reload()}>Erneut versuchen<ArrowRight size={17} /></button></div> : gated === null ? <div className="security-panel security-loading" role="status"><ShieldCheck size={28} /><h2>Ein kurzer Moment.</h2><p>Dein Konto wird geprüft …</p></div> : needsLogin ? <div className="security-panel"><div className="security-panel-heading"><span className="security-shield"><ShieldCheck size={22} /></span><div><span className="security-eyebrow">DEIN PAPAYAOS-KONTO</span><h2>Willkommen zurück.</h2></div></div><p>Melde dich an, um deinen Workspace und deine Kontoeinstellungen zu öffnen.</p><a className="security-button security-primary" href="/login.html">Jetzt anmelden<ArrowRight size={17} aria-hidden="true" /></a></div> : <AccountSecurity onReady={() => location.assign('/?app=true')} />}</div>
  </div><footer className="security-footer"><ShieldCheck size={14} aria-hidden="true" />Deine Anmeldung. Ein zusätzlicher Schutz.</footer>
 </main>;
}

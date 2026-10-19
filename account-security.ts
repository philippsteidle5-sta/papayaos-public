import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Express, Request, Response, NextFunction } from 'express';

type Account = { id: string; email: string; name: string; isFullCoreAdmin: boolean; passwordHash: string; status: string; emailVerifiedAt?: string };
type Session = { userId: string; expiresAt: number; createdAt?: number; lastSeenAt?: number; userAgent?: string; mfaAt?: number };
type Factor = { secret?: string; pending?: string; pendingUntil?: number; recovery?: string[]; lastStep?: number };
type Ticket = { userId: string; purpose: 'verify' | 'reset'; expiresAt: number };
type Options = {
 app: Express; directory: string; read: <T>(key: string, fallback: T) => T;
 write: (key: string, value: unknown) => void; accounts: () => Account[]; saveAccounts: () => void;
 sessions: Map<string, Session>; saveSessions: () => void; getUser: (req: Request) => Account | undefined;
 hashPassword: (password: string) => string; verifyPassword: (password: string, hash: string) => boolean;
};
const digest = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
export const PUBLIC_ACCOUNT_PATHS = new Set(['/api/health','/api/status','/api/slots/status','/api/beta-waitlist','/api/auth/login','/api/auth/register','/api/auth/forgot-password','/api/auth/reset-password','/api/auth/verify-email','/api/telemetry/ping','/api/telemetry/event']);
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(bytes: Buffer) {
 let bits = ''; for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
 let output = ''; for (let i = 0; i < bits.length; i += 5) output += alphabet[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
 return output;
}
function unbase32(value: string) {
 let bits = ''; for (const c of value) bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
 const bytes: number[] = []; for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
 return Buffer.from(bytes);
}
function totp(secret: string, step: number) {
 const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
 const h = crypto.createHmac('sha1', unbase32(secret)).update(counter).digest();
 return String((h.readUInt32BE(h[19] & 15) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}
export function installAccountSecurity(o: Options) {
 const tickets = o.read<Record<string, Ticket>>('security-tickets', {});
 const factors = o.read<Record<string, Factor>>('security-factors', {});
 const limits = new Map<string, { count: number; until: number }>();
 const keyFile = path.join(o.directory, 'account-security.key');
 if (!fs.existsSync(keyFile) && (Object.values(factors).some(f => f.secret || f.pending) || o.read<any>('security-mail', {}).password)) throw Error('Existing encrypted account data requires its original account-security.key backup.');
 if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, crypto.randomBytes(32), { mode: 0o600, flag: 'wx' });
 const key = fs.readFileSync(keyFile);
 if (key.length !== 32) throw Error('Invalid account-security encryption key');
 const encrypt = (value: string) => {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  return Buffer.concat([iv, cipher.update(value), cipher.final(), cipher.getAuthTag()]).toString('base64');
 };
 const decrypt = (value: string) => {
  const bytes = Buffer.from(value, 'base64'), decipher = crypto.createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(-16)); return Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]).toString();
 };
 const saveFactors = () => o.write('security-factors', factors);
 const sessionId = (req: Request) => {
  const cookie = String(req.headers.cookie || '').split(';').map(p => p.trim()).find(p => p.startsWith('papaya_session='));
  return cookie ? digest(cookie.slice('papaya_session='.length)) : '';
 };
 const currentSession = (req: Request) => o.sessions.get(sessionId(req));
 function limited(req: Request, category: string, max = 8, duration = 15 * 60_000) {
  const k = digest(`${category}:${req.ip}`), now = Date.now();
  let item = limits.get(k); if (!item || item.until <= now) item = { count: 0, until: now + duration };
  item.count++; limits.set(k, item);
  if (limits.size > 10_000) for (const [id, entry] of limits) if (entry.until < now) limits.delete(id);
  return item.count > max;
 }
 function audit(req: Request, action: string, target?: string) {
  const entries = o.read<any[]>('security-audit', []);
  entries.push({ at: new Date().toISOString(), actor: o.getUser(req)?.id, action, target, method: req.method, path: req.path });
  o.write('security-audit', entries.slice(-5000));
 }
 function verifyFactor(user: Account, supplied: unknown) {
  const factor = factors[user.id]; if (!factor?.secret || typeof supplied !== 'string') return false;
  const recovery = digest(supplied.trim().toUpperCase());
  const index = factor.recovery?.indexOf(recovery) ?? -1;
  if (index >= 0) { factor.recovery!.splice(index, 1); saveFactors(); return true; }
  if (!/^\d{6}$/.test(supplied)) return false;
  const step = Math.floor(Date.now() / 30_000), secret = decrypt(factor.secret);
  for (const candidate of [step - 1, step, step + 1]) {
   if (candidate <= (factor.lastStep ?? -1)) continue;
   if (crypto.timingSafeEqual(Buffer.from(totp(secret, candidate)), Buffer.from(supplied))) {
    factor.lastStep = candidate; saveFactors(); return true;
   }
  }
  return false;
 }
 let savedMail = o.read<{ email?: string; password?: string; publicUrl?: string }>('security-mail', {});
 function mailConfig() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.MAIL_FROM && process.env.PAPAYA_PUBLIC_URL) return {
   host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465), secure: process.env.SMTP_SECURE !== 'false',
   user: process.env.SMTP_USER, password: process.env.SMTP_PASSWORD, from: process.env.MAIL_FROM, publicUrl: process.env.PAPAYA_PUBLIC_URL,
  };
  return { host: 'smtp.strato.de', port: 465, secure: true, user: savedMail.email || '', password: savedMail.password ? decrypt(savedMail.password) : '', from: savedMail.email || '', publicUrl: savedMail.publicUrl || '' };
 }
 const mailConfigured = () => { const c = mailConfig(); return Boolean(c.user && c.password && c.from && c.publicUrl); };
 function transportFor(c: ReturnType<typeof mailConfig>) {
  const require = createRequire(import.meta.url), mailer = require('nodemailer');
  return mailer.createTransport({ host: c.host, port: c.port, secure: c.secure, requireTLS: !c.secure, auth: { user: c.user, pass: c.password }, connectionTimeout: 10_000, socketTimeout: 15_000 });
 }
 async function sendMail(user: Account, purpose: 'verify' | 'reset') {
  if (!mailConfigured()) throw Error('MAIL_NOT_CONFIGURED');
  const raw = crypto.randomBytes(32).toString('base64url');
  const tokenHash = digest(raw), now = Date.now();
  for (const [id, ticket] of Object.entries(tickets)) if (ticket.expiresAt < now || (ticket.userId === user.id && ticket.purpose === purpose)) delete tickets[id];
  tickets[tokenHash] = { userId: user.id, purpose, expiresAt: now + (purpose === 'verify' ? 24 * 60 * 60_000 : 30 * 60_000) };
  o.write('security-tickets', tickets);
  try {
   const c = mailConfig(), transport = transportFor(c);
   const url = new URL('/account-security.html', c.publicUrl);
   if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw Error('HTTPS_REQUIRED');
   url.hash = new URLSearchParams({ purpose, token: raw }).toString();
   await transport.sendMail({ from: c.from, to: user.email, subject: purpose === 'verify' ? 'PapayaOS: E-Mail bestätigen' : 'PapayaOS: Passwort zurücksetzen', text: `Öffne diesen einmal verwendbaren Link:\n${url}\n\nWenn du diese Anfrage nicht gestellt hast, ignoriere diese Nachricht.` });
  } catch (error) { delete tickets[tokenHash]; o.write('security-tickets', tickets); throw error; }
 }
 function state(user: Account, req: Request) {
  const factor = factors[user.id];
  return { emailVerified: Boolean(user.emailVerifiedAt), mfaEnabled: Boolean(factor?.secret), mfaRequired: user.isFullCoreAdmin, mfaAuthenticated: Boolean(currentSession(req)?.mfaAt), mailConfigured: mailConfigured(), ...(user.isFullCoreAdmin && currentSession(req)?.mfaAt ? { mailSender: mailConfig().user, mailPublicUrl: mailConfig().publicUrl } : {}) };
 }
 function guard(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/api/')) return next();
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (process.env.NODE_ENV === 'production' && !req.secure && !['localhost','127.0.0.1','::1'].includes(req.hostname)) return res.status(400).json({ ok: false, error: 'HTTPS_REQUIRED' });
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
   const origin = req.get('Origin');
   const allowed = new Set([`${req.protocol}://${req.get('host')}`, process.env.PAPAYA_PUBLIC_URL].filter(Boolean));
   if (req.get('Sec-Fetch-Site') === 'cross-site' || (origin && !allowed.has(origin))) return res.status(403).json({ ok: false, error: 'CROSS_ORIGIN_REQUEST' });
  }
  if (PUBLIC_ACCOUNT_PATHS.has(req.path)) {
   if ((req.path.startsWith('/api/auth/') || req.path === '/api/beta-waitlist') && limited(req, req.path, req.path === '/api/auth/login' ? 30 : 8)) return res.status(429).json({ ok: false, message: 'Zu viele Anfragen. Bitte versuche es später erneut.' });
   return next();
  }
  const user = o.getUser(req);
  if (!user) { res.setHeader('X-Papaya-Session-Expired', 'true'); return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED', message: 'Bitte melde dich an.' }); }
  if (req.get('X-Papaya-Account') && req.get('X-Papaya-Account') !== user.id) {
   res.setHeader('X-Papaya-Account-Changed', 'true');
   return res.status(409).json({ ok: false, error: 'ACCOUNT_CHANGED' });
  }
  const session = currentSession(req);
  if (req.path === '/api/user/change-password' && limited(req, 'change-password', 5)) return res.status(429).json({ ok: false, message: 'Zu viele Passwortversuche. Bitte später erneut versuchen.' });
  if (session && (!session.lastSeenAt || Date.now() - session.lastSeenAt > 60_000)) { session.lastSeenAt = Date.now(); o.saveSessions(); }
  const accountPaths = req.path.startsWith('/api/auth/');
  if (!accountPaths) {
   if (!user.emailVerifiedAt) return res.status(403).json({ ok: false, error: 'EMAIL_VERIFICATION_REQUIRED', message: 'Bitte bestätige zuerst deine E-Mail-Adresse.' });
   if ((user.isFullCoreAdmin || factors[user.id]?.secret) && !session?.mfaAt) return res.status(403).json({ ok: false, error: 'MFA_REQUIRED', message: 'Bitte bestätige die Zwei-Faktor-Anmeldung.' });
  }
  const adminRoute = req.path.startsWith('/api/admin/') || req.path === '/api/auth/users' || req.path === '/api/telemetry/live-sessions' || ['/api/auth/update-user','/api/auth/delete-user','/api/auth/mail-settings'].includes(req.path) || req.path === '/api/leads' || (req.path.startsWith('/api/leads/') && req.path !== '/api/leads/check-access') || (req.path.startsWith('/api/access-keys') && req.path !== '/api/access-keys/validate');
  if (adminRoute) {
   if (!user.isFullCoreAdmin || !session?.mfaAt) return res.status(403).json({ ok: false, error: 'ADMIN_REQUIRED' });
   audit(req, 'admin-access');
  }
  if (req.path.startsWith('/api/user/') || req.path === '/api/leads/check-access') {
   const email = String(req.query.email || req.body?.email || '').trim().toLowerCase();
   if (email && email !== user.email.toLowerCase()) return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
   if (req.method === 'GET') req.query.email = user.email;
   else req.body = { ...req.body, email: user.email };
  }
  return next();
 }
 o.app.get('/api/auth/security', (req, res) => res.json({ ok: true, ...state(o.getUser(req)!, req) }));
 o.app.post('/api/auth/mail-settings', async (req, res) => {
  if (limited(req, 'mail-settings', 5)) return res.status(429).json({ ok: false, message: 'Zu viele Verbindungsversuche.' });
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.MAIL_FROM && process.env.PAPAYA_PUBLIC_URL) return res.status(409).json({ ok: false, message: 'Der Versand ist über Server-Umgebungsvariablen konfiguriert. Änderungen bitte dort vornehmen.' });
  const email = String(req.body?.email || '').trim().toLowerCase(), password = String(req.body?.password || ''), publicUrl = String(req.body?.publicUrl || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 512) return res.status(400).json({ ok: false, message: 'STRATO-Postfach und Postfach-Passwort eingeben.' });
  try {
   const url = new URL(publicUrl);
   if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(['localhost','127.0.0.1'].includes(url.hostname) && url.protocol === 'http:'))) throw Error('INVALID_URL');
   const next = { host: 'smtp.strato.de', port: 465, secure: true, user: email, password, from: email, publicUrl: url.origin };
   await transportFor(next).verify();
   savedMail = { email, password: encrypt(password), publicUrl: url.origin }; o.write('security-mail', savedMail); audit(req, 'mail-settings-updated');
   return res.json({ ok: true, message: 'STRATO-Zugang bestätigt und verschlüsselt gespeichert.' });
  } catch { return res.status(400).json({ ok: false, message: 'STRATO-Verbindung oder Website-Adresse konnte nicht bestätigt werden. Bitte Zugangsdaten und HTTPS-Adresse prüfen.' }); }
 });
 o.app.post('/api/auth/forgot-password', async (req, res) => {
  if (!mailConfigured()) return res.status(503).json({ ok: false, message: 'Der E-Mail-Versand ist noch nicht eingerichtet.' });
  const email = String(req.body?.email || '').trim().toLowerCase(), user = o.accounts().find(u => u.email.toLowerCase() === email && u.status !== 'REVOKED');
  if (user) { try { await sendMail(user, 'reset'); } catch { console.error('[AUTH MAIL] Reset delivery failed'); } }
  return res.json({ ok: true, message: 'Falls ein passendes Konto existiert, erhältst du einen Link per E-Mail.' });
 });
 o.app.post('/api/auth/resend-verification', async (req, res) => {
  if (limited(req, 'resend', 3)) return res.status(429).json({ ok: false, message: 'Bitte warte vor einer weiteren Anfrage.' });
  const user = o.getUser(req)!;
  if (user.emailVerifiedAt) return res.json({ ok: true, message: 'E-Mail bereits bestätigt.' });
  try { await sendMail(user, 'verify'); return res.json({ ok: true, message: 'Bestätigungslink versendet.' }); }
  catch { return res.status(503).json({ ok: false, message: 'Der E-Mail-Versand ist derzeit nicht verfügbar.' }); }
 });
 for (const purpose of ['verify', 'reset'] as const) o.app.post(purpose === 'verify' ? '/api/auth/verify-email' : '/api/auth/reset-password', (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '', id = digest(token), ticket = tickets[id];
  const user = ticket && o.accounts().find(u => u.id === ticket.userId && u.status !== 'REVOKED');
  if (!user || ticket.purpose !== purpose || ticket.expiresAt <= Date.now()) return res.status(400).json({ ok: false, message: 'Der Link ist ungültig oder abgelaufen.' });
  if (purpose === 'reset') {
   const password = req.body?.password;
   if (typeof password !== 'string' || password.length < 12 || password.length > 256) return res.status(400).json({ ok: false, message: 'Verwende 12 bis 256 Zeichen.' });
   // Resetting the password must not bypass an enrolled second factor.
   if (factors[user.id]?.secret && !verifyFactor(user, req.body?.code)) return res.status(403).json({ ok: false, message: 'Authenticator- oder Wiederherstellungscode erforderlich.' });
   user.passwordHash = o.hashPassword(password);
   for (const [sid, session] of o.sessions) if (session.userId === user.id) o.sessions.delete(sid);
   o.saveSessions();
  }
  user.emailVerifiedAt ||= new Date().toISOString();
  delete tickets[id]; o.write('security-tickets', tickets); o.saveAccounts();
  audit(req, purpose === 'reset' ? 'password-reset' : 'email-verified', user.id);
  return res.json({ ok: true, message: purpose === 'reset' ? 'Passwort geändert. Bitte neu anmelden.' : 'E-Mail bestätigt. Du kannst deinen Workspace öffnen.' });
 });
 o.app.post('/api/auth/mfa/setup', (req, res) => {
  const user = o.getUser(req)!;
  if (factors[user.id]?.secret) return res.status(409).json({ ok: false, message: 'Zwei-Faktor-Anmeldung ist bereits eingerichtet.' });
  if (limited(req, 'mfa-setup', 5)) return res.status(429).json({ ok: false });
  if (!o.verifyPassword(String(req.body?.password || ''), user.passwordHash)) return res.status(403).json({ ok: false, message: 'Bitte bestätige dein aktuelles Passwort.' });
  const secret = base32(crypto.randomBytes(20));
  factors[user.id] = { pending: encrypt(secret), pendingUntil: Date.now() + 10 * 60_000 }; saveFactors();
  return res.json({ ok: true, secret, uri: `otpauth://totp/${encodeURIComponent('PapayaOS:' + user.email)}?secret=${secret}&issuer=PapayaOS&algorithm=SHA1&digits=6&period=30` });
 });
 o.app.post('/api/auth/mfa/confirm', (req, res) => {
  const user = o.getUser(req)!, factor = factors[user.id];
  if (limited(req, 'mfa-confirm', 8)) return res.status(429).json({ ok: false });
  if (!factor?.pending || !factor.pendingUntil || factor.pendingUntil < Date.now() || factor.secret) return res.status(400).json({ ok: false, message: 'Einrichtung bitte neu starten.' });
  const code = String(req.body?.code || ''), step = Math.floor(Date.now() / 30_000), secret = decrypt(factor.pending);
  const accepted = /^\d{6}$/.test(code) ? [step - 1, step, step + 1].find(s => totp(secret, s) === code) : undefined;
  if (accepted === undefined) return res.status(400).json({ ok: false, message: 'Der Code ist ungültig.' });
  const codes = Array.from({ length: 8 }, () => crypto.randomBytes(8).toString('hex').toUpperCase());
  factors[user.id] = { secret: factor.pending, recovery: codes.map(digest), lastStep: accepted }; saveFactors();
  for (const [id, session] of o.sessions) if (session.userId === user.id && id !== sessionId(req)) o.sessions.delete(id);
  const session = currentSession(req); if (session) session.mfaAt = Date.now(); o.saveSessions(); audit(req, 'mfa-enabled');
  return res.json({ ok: true, recoveryCodes: codes });
 });
 o.app.post('/api/auth/mfa/verify', (req, res) => {
  if (limited(req, 'mfa-verify', 8)) return res.status(429).json({ ok: false, message: 'Zu viele Versuche. Bitte später erneut versuchen.' });
  if (!verifyFactor(o.getUser(req)!, req.body?.code)) return res.status(403).json({ ok: false, message: 'Der Code ist ungültig oder wurde bereits verwendet.' });
  const session = currentSession(req); if (session) session.mfaAt = Date.now(); o.saveSessions(); audit(req, 'mfa-verified');
  return res.json({ ok: true });
 });
 o.app.post('/api/auth/mfa/disable', (req, res) => {
  const user = o.getUser(req)!;
  if (user.isFullCoreAdmin) return res.status(403).json({ ok: false, message: 'Admins benötigen die Zwei-Faktor-Anmeldung.' });
  if (limited(req, 'mfa-disable', 5) || !o.verifyPassword(String(req.body?.password || ''), user.passwordHash) || !verifyFactor(user, req.body?.code)) return res.status(403).json({ ok: false, message: 'Passwort und gültiger zweiter Faktor erforderlich.' });
  delete factors[user.id]; saveFactors(); audit(req, 'mfa-disabled'); return res.json({ ok: true });
 });
 o.app.get('/api/auth/sessions', (req, res) => {
  const user = o.getUser(req)!;
  const sessions = Array.from(o.sessions).filter(([,s]) => s.userId === user.id && s.expiresAt > Date.now()).map(([id,s]) => ({ id, current: id === sessionId(req), createdAt: s.createdAt, lastSeenAt: s.lastSeenAt, expiresAt: s.expiresAt, device: s.userAgent || 'Ältere Sitzung' }));
  return res.json({ ok: true, sessions });
 });
 o.app.post('/api/auth/sessions/revoke', (req, res) => {
  const user = o.getUser(req)!, id = String(req.body?.id || '');
  if (req.body?.all === true) { for (const [sid, s] of o.sessions) if (s.userId === user.id) o.sessions.delete(sid); }
  else { if (o.sessions.get(id)?.userId !== user.id) return res.status(404).json({ ok: false }); o.sessions.delete(id); }
  o.saveSessions(); audit(req, 'sessions-revoked'); return res.json({ ok: true });
 });
 return { guard, state, sendVerification: (user: Account) => sendMail(user, 'verify'), mailConfigured };
}

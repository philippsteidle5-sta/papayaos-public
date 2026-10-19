import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './utils/safeCanvas.ts';
import { installAccountStorage } from './utils/accountStorage';
import './index.css';

async function start() {
  const response = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok && response.status !== 401) throw Error('Kontostatus derzeit nicht verfügbar.');
  const data = response.ok ? await response.json() : null;
  installAccountStorage(data?.user?.id || null, data?.user?.isFullCoreAdmin === true);
  // Browser flags are presentation hints, never a source of authorization.
  if (data?.user) {
    const user = data.user;
    localStorage.setItem('syntax_current_user_email', user.email);
    localStorage.setItem('maze_current_user_email', user.email);
    localStorage.setItem('syntax_admin_authenticated_session', String(user.isFullCoreAdmin === true));
    localStorage.setItem('maze_registered_vip_user', JSON.stringify({ name: user.name, email: user.email, slot: user.slot, plan: user.plan, role: user.role }));
  } else {
    for (const key of ['syntax_current_user_email','maze_current_user_email','maze_registered_vip_user','syntax_admin_authenticated_session']) localStorage.removeItem(key);
  }
  const [{ default: App }, { ErrorBoundary }, { ThemeProvider }, { AccountSecurityBoundary }] = await Promise.all([
    import('./App.tsx'), import('./components/ErrorBoundary.tsx'), import('./utils/themeStore.ts'), import('./components/AccountSecurity.tsx'),
  ]);
  createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><ThemeProvider><AccountSecurityBoundary><App /></AccountSecurityBoundary></ThemeProvider></ErrorBoundary></StrictMode>);
}
start().catch(() => {
  const root = document.getElementById('root');
  if (root) { root.textContent = 'PapayaOS konnte dein Konto nicht prüfen. Bitte lade die Seite erneut.'; root.setAttribute('role', 'alert'); }
});




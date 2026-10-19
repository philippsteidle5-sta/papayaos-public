// Private browser data is namespaced by the server-confirmed account ID.
// Unassigned legacy data stays untouched; it is never silently given to the
// next person who happens to sign in on this browser.
let importLegacy: (() => number) | undefined;
let legacyAvailable: (() => boolean) | undefined;
export const hasLegacyWorkspace = () => legacyAvailable?.() || false;
export const importLegacyWorkspace = () => importLegacy?.() || 0;
export function installAccountStorage(accountId: string | null, allowLegacyImport = false) {
 const storage = window.localStorage, proto = Storage.prototype;
 const get = proto.getItem, set = proto.setItem, remove = proto.removeItem, nativeKey = proto.key;
 const lengthDescriptor = Object.getOwnPropertyDescriptor(proto, 'length')!;
 const prefix = `papaya-account:${accountId || 'anonymous'}:`;
 const shared = new Set(['papayaos-lang','maze_lang','syntax_current_user_email','maze_current_user_email','maze_registered_vip_user','syntax_admin_authenticated_session','syntax_entered_matrix_session']);
 const resolve = (key: string) => shared.has(key) ? key : prefix + key;
 const legacyKeys = ['jarvis_agent_chats_v2', 'syntax_agent_persistent_memory_v1', 'syntax_agent_app_links_v2', 'papaya_agent_workflows_v1', 'papaya_agent_workflow_graphs_v1', 'papaya_installed_plugins'];
 if (accountId && allowLegacyImport) {
  legacyAvailable = () => !get.call(storage, prefix + 'legacy_imported') && legacyKeys.some(key => get.call(storage, key));
  importLegacy = () => {
   let count = 0;
   for (const key of legacyKeys) {
    const source = get.call(storage, key); if (!source) continue;
    const target = get.call(storage, prefix + key);
    if (key === 'jarvis_agent_chats_v2') {
     try {
      const old = JSON.parse(source), current = JSON.parse(target || '{}');
      for (const agent of Object.keys(old)) {
       if (!Array.isArray(old[agent])) continue;
       const messages = [...old[agent], ...(Array.isArray(current[agent]) ? current[agent] : [])];
       const seen = new Set<string>();
       current[agent] = messages.filter(message => { const id = String(message.id || JSON.stringify(message)); if (seen.has(id)) return false; seen.add(id); return true; });
      }
      set.call(storage, prefix + key, JSON.stringify(current)); count++;
     } catch { /* Malformed old data remains untouched. */ }
    } else if (!target || target === '{}' || target === '[]') { set.call(storage, prefix + key, source); count++; }
   }
   set.call(storage, prefix + 'legacy_imported', 'true');
   return count;
  };
 }
 const keys = () => {
  const result: string[] = [];
  for (let i = 0; i < lengthDescriptor.get!.call(storage); i++) {
   const key = nativeKey.call(storage, i);
   if (key?.startsWith(prefix)) result.push(key.slice(prefix.length));
   else if (key && shared.has(key)) result.push(key);
  }
  return result;
 };
 proto.getItem = function(key: string) { return get.call(this, this === storage ? resolve(String(key)) : key); };
 proto.setItem = function(key: string, value: string) { set.call(this, this === storage ? resolve(String(key)) : key, value); };
 proto.removeItem = function(key: string) { remove.call(this, this === storage ? resolve(String(key)) : key); };
 proto.key = function(index: number) { return this === storage ? keys()[index] ?? null : nativeKey.call(this, index); };
 const clear = proto.clear;
 proto.clear = function() { if (this !== storage) return clear.call(this); for (const key of keys()) remove.call(storage, resolve(key)); };
 Object.defineProperty(proto, 'length', { ...lengthDescriptor, get() { return this === storage ? keys().length : lengthDescriptor.get!.call(this); } });
 // Cookie changes in another tab must not send this tab's private context
 // into a different account. The server checks this against its own session.
 const fetch = window.fetch.bind(window);
 window.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), location.href);
  if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return fetch(input, init);
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
  if (accountId) headers.set('X-Papaya-Account', accountId);
  const response = await fetch(input, { ...init, headers });
  if (response.status === 409 && response.headers.get('X-Papaya-Account-Changed') === 'true') location.reload();
  if (accountId && response.status === 401 && response.headers.get('X-Papaya-Session-Expired') === 'true') location.reload();
  return response;
 };
 window.addEventListener('storage', event => {
  if (accountId && ['maze_registered_vip_user','syntax_current_user_email'].includes(event.key || '')) {
   // The request header lets the server detect a changed account without
   // trusting the value written by a different window.
   window.fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' }).catch(() => {});
  }
 });
}

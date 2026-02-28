// Local PostgreSQL client — replaces Supabase cloud
// All data goes to http://localhost:3001 → Docker PostgreSQL

const API = import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:3001';
const SESSION_KEY = 'local_session';

// ── Session helpers ───────────────────────────────────────────
function saveSession(session: any) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
function getToken() { return loadSession()?.access_token || null; }

// ── Auth state listeners ──────────────────────────────────────
type AuthEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT';
type AuthListener = (event: AuthEvent, session: any) => void;
const listeners: AuthListener[] = [];
function emit(event: AuthEvent, session: any) {
  listeners.forEach(fn => fn(event, session));
}

// ── Query builder ─────────────────────────────────────────────
class QueryBuilder {
  private _table: string;
  private _select = '*';
  private _filters: [string, string, any][] = [];
  private _order: [string, string][] = [];
  private _limit?: number;
  private _offset?: number;
  private _single = false;
  private _maybeSingle = false;

  constructor(table: string) { this._table = table; }

  select(cols = '*') { this._select = cols; return this; }
  eq(col: string, val: any) { this._filters.push([col, 'eq', val]); return this; }
  neq(col: string, val: any) { this._filters.push([col, 'neq', val]); return this; }
  gt(col: string, val: any) { this._filters.push([col, 'gt', val]); return this; }
  gte(col: string, val: any) { this._filters.push([col, 'gte', val]); return this; }
  lt(col: string, val: any) { this._filters.push([col, 'lt', val]); return this; }
  lte(col: string, val: any) { this._filters.push([col, 'lte', val]); return this; }
  like(col: string, val: any) { this._filters.push([col, 'like', val]); return this; }
  ilike(col: string, val: any) { this._filters.push([col, 'ilike', val]); return this; }
  is(col: string, val: any) { this._filters.push([col, 'is', val]); return this; }
  in(col: string, vals: any[]) { this._filters.push([col, 'in', vals]); return this; }
  order(col: string, opts?: { ascending?: boolean }) {
    this._order.push([col, opts?.ascending === false ? 'desc' : 'asc']);
    return this;
  }
  limit(n: number) { this._limit = n; return this; }
  offset(n: number) { this._offset = n; return this; }
  single() { this._single = true; return this; }
  maybeSingle() { this._maybeSingle = true; return this; }

  // Terminal: INSERT
  async insert(data: any) {
    try {
      const rows = Array.isArray(data) ? data : [data];
      const res = await fetch(`${API}/rest/v1/${this._table}`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(rows),
      });
      return await res.json();
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  }

  // Terminal: UPSERT
  async upsert(data: any, opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    try {
      const rows = Array.isArray(data) ? data : [data];
      const conflict = opts?.onConflict || 'id';
      const res = await fetch(`${API}/rest/v1/${this._table}?upsert=true&onConflict=${conflict}`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(rows),
      });
      return await res.json();
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  }

  // Terminal: UPDATE  (must NOT be async — callers chain .eq()/.match() synchronously)
  update(data: any) {
    const self = this;
    return {
      eq: (col: string, val: any) => {
        self._filters.push([col, 'eq', val]);
        return self._executeUpdate(data);
      },
      match: (obj: Record<string, any>) => {
        Object.entries(obj).forEach(([k, v]) => self._filters.push([k, 'eq', v]));
        return self._executeUpdate(data);
      },
    };
  }

  async _executeUpdate(data: any) {
    try {
      const params = new URLSearchParams();
      if (this._filters.length) params.set('filters', JSON.stringify(this._filters));
      const res = await fetch(`${API}/rest/v1/${this._table}?${params}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  }

  // Terminal: DELETE
  delete() {
    const self = this;
    return {
      eq: async (col: string, val: any) => {
        self._filters.push([col, 'eq', val]);
        try {
          const params = new URLSearchParams();
          if (self._filters.length) params.set('filters', JSON.stringify(self._filters));
          const res = await fetch(`${API}/rest/v1/${self._table}?${params}`, {
            method: 'DELETE',
            headers: headers(),
          });
          return await res.json();
        } catch (e: any) {
          return { data: null, error: { message: e.message } };
        }
      },
      match: async (obj: Record<string, any>) => {
        Object.entries(obj).forEach(([k, v]) => self._filters.push([k, 'eq', v]));
        try {
          const params = new URLSearchParams();
          if (self._filters.length) params.set('filters', JSON.stringify(self._filters));
          const res = await fetch(`${API}/rest/v1/${self._table}?${params}`, {
            method: 'DELETE',
            headers: headers(),
          });
          return await res.json();
        } catch (e: any) {
          return { data: null, error: { message: e.message } };
        }
      },
    };
  }

  // Execute SELECT (called by awaiting the builder or chaining .then)
  then(resolve: (v: any) => any, reject?: (e: any) => any): Promise<any> {
    return this._execute().then(resolve, reject);
  }
  catch(fn: (e: any) => any) { return this._execute().catch(fn); }

  async _execute() {
    try {
      const params = new URLSearchParams({ select: this._select });
      if (this._filters.length)  params.set('filters', JSON.stringify(this._filters));
      if (this._order.length)    params.set('order',   JSON.stringify(this._order));
      if (this._limit != null)   params.set('limit',   String(this._limit));
      if (this._offset != null)  params.set('offset',  String(this._offset));
      if (this._single || this._maybeSingle) params.set('single', 'true');

      const res = await fetch(`${API}/rest/v1/${this._table}?${params}`, {
        headers: headers(),
      });
      return await res.json();
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  }
}

// ── Auth object ───────────────────────────────────────────────
const auth = {
  async signUp({ email, password, options }: any) {
    try {
      const res = await fetch(`${API}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, options }),
      });
      const json = await res.json();
      if (!json.error && json.data?.session) {
        saveSession(json.data.session);
        emit('SIGNED_IN', json.data.session);
      }
      return json;
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  },

  async signInWithPassword({ email, password }: any) {
    try {
      const res = await fetch(`${API}/auth/v1/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.error && json.data?.session) {
        saveSession(json.data.session);
        emit('SIGNED_IN', json.data.session);
      }
      return json;
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  },

  async signOut() {
    try {
      await fetch(`${API}/auth/v1/logout`, { method: 'POST', headers: headers() });
    } catch { /* ignore */ }
    saveSession(null);
    emit('SIGNED_OUT', null);
    return { error: null };
  },

  async getSession() {
    const session = loadSession();
    return { data: { session }, error: null };
  },

  async getUser() {
    const token = getToken();
    if (!token) return { data: { user: null }, error: null };
    try {
      const res = await fetch(`${API}/auth/v1/user`, { headers: headers() });
      return await res.json();
    } catch (e: any) {
      return { data: { user: null }, error: { message: e.message } };
    }
  },

  onAuthStateChange(callback: AuthListener) {
    listeners.push(callback);
    // Fire INITIAL_SESSION immediately
    const session = loadSession();
    setTimeout(() => callback('INITIAL_SESSION', session), 0);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const idx = listeners.indexOf(callback);
            if (idx !== -1) listeners.splice(idx, 1);
          },
        },
      },
    };
  },
};

// ── Storage stub (no-op for local dev) ───────────────────────
const storage = {
  from: (_bucket: string) => ({
    upload: async (_path: string, _file: any) => ({ data: { path: _path }, error: null }),
    getPublicUrl: (_path: string) => ({ data: { publicUrl: '' } }),
  }),
};

// ── Realtime stub (no-op for local dev — no WebSocket needed) ─
function channel(_name: string) {
  const sub = {
    on: (_event: string, _opts: any, _cb?: any) => sub,
    subscribe: (_cb?: any) => sub,
    unsubscribe: () => Promise.resolve(),
  };
  return sub;
}

// ── Functions stub — routes to local Express server ──────────
const functions = {
  invoke: async (name: string, opts?: { body?: any }) => {
    try {
      const res = await fetch(`${API}/functions/v1/${name}`, {
        method: 'POST',
        headers: headers(),
        body: opts?.body ? JSON.stringify(opts.body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) return { data: null, error: { message: json.error || json.message || 'Function error' } };
      return { data: json, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  },
};

// ── Main export — same shape as supabase-js ──────────────────
function headers() {
  const token = getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export const supabase = {
  auth,
  storage,
  functions,
  from: (table: string) => new QueryBuilder(table),
  channel,
  removeChannel: (_ch: any) => Promise.resolve(),
};
export default supabase;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, FolderOpen, Search, Sparkles, X } from "lucide-react";
import { getImageUrl } from "@/lib/imageUrl";
import { cn } from "@/lib/utils";

interface Suggestion { text: string; path: string }
interface CategoryHit { path: string; name: string; type: string; count: number }
interface ItemHit {
  item_id: string; name: string; brand: string; price: number | null; in_stock: boolean;
  url_path: string; main_image: string | null;
}
interface SearchResponse {
  q: string; corrected: string | null; suggestions: Suggestion[]; categories: CategoryHit[]; items: ItemHit[]; total: number;
}
type Row =
  | { kind: "recent"; text: string }
  | { kind: "suggestion"; text: string; path: string }
  | { kind: "category"; hit: CategoryHit }
  | { kind: "item"; hit: ItemHit }
  | { kind: "corrected"; text: string }
  | { kind: "all"; text: string; total: number };

const RECENT_KEY = "ats_recent_searches";
const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } };
const pushRecent = (q: string) => {
  try {
    const list = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch { /* private mode etc. */ }
};

/** Bold the parts of `text` that the typed words start. */
function Highlight({ text, q }: { text: string; q: string }) {
  const words = q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 2);
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return <>{text.split(re).map((part, i) => (re.test(part) ? <mark key={i} className="bg-transparent text-primary font-semibold">{part}</mark> : part))}</>;
}

const fmtPrice = (p: number | null) => (p == null ? "" : `Rs. ${p.toLocaleString()}`);

interface SmartSearchProps {
  size?: "lg" | "md";
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  initialQuery?: string;
}

export function SmartSearch({ size = "md", className, placeholder, autoFocus, initialQuery = "" }: SmartSearchProps) {
  const navigate = useNavigate();
  const [q, setQ] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [res, setRes] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timer = useRef<number>();

  useEffect(() => { setQ(initialQuery); }, [initialQuery]);

  // Debounced typeahead fetch; the previous request is cancelled so results never arrive out of order
  useEffect(() => {
    window.clearTimeout(timer.current);
    const query = q.trim();
    if (!query) { setRes(null); setLoading(false); return; }
    setLoading(true);
    timer.current = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const r = await fetch(`/api/catalog/search?q=${encodeURIComponent(query)}&limit=6`, { signal: ctrl.signal });
        if (!r.ok) throw new Error("search");
        const data = (await r.json()) as SearchResponse;
        if (!ctrl.signal.aborted) { setRes(data); setActive(-1); }
      } catch (e: any) {
        if (e?.name !== "AbortError") setRes(null);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 120);
    return () => window.clearTimeout(timer.current);
  }, [q]);

  // Close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const rows = useMemo<Row[]>(() => {
    const query = q.trim();
    if (!query) return recent.map((text) => ({ kind: "recent", text }));
    if (!res) return [];
    const out: Row[] = [];
    if (res.corrected && res.corrected !== query.toLowerCase()) out.push({ kind: "corrected", text: res.corrected });
    res.suggestions.forEach((s) => out.push({ kind: "suggestion", text: s.text, path: s.path }));
    res.categories.slice(0, 4).forEach((hit) => out.push({ kind: "category", hit }));
    res.items.forEach((hit) => out.push({ kind: "item", hit }));
    if (res.total > 0) out.push({ kind: "all", text: query, total: res.total });
    return out;
  }, [q, res, recent]);

  const goSearch = useCallback((text: string) => {
    const query = text.trim();
    if (!query) return;
    pushRecent(query);
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }, [navigate]);

  const choose = useCallback((row: Row) => {
    setOpen(false);
    switch (row.kind) {
      case "recent": setQ(row.text); goSearch(row.text); break;
      case "corrected": setQ(row.text); goSearch(row.text); break;
      case "all": goSearch(row.text); break;
      case "suggestion": pushRecent(q.trim()); navigate(row.path); break;
      case "category": pushRecent(q.trim()); navigate(row.hit.path); break;
      case "item": pushRecent(q.trim()); navigate(row.hit.url_path); break;
    }
  }, [goSearch, navigate, q]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => (rows.length ? (a + 1) % rows.length : -1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (rows.length ? (a - 1 + rows.length) % rows.length : -1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (active >= 0 && rows[active]) choose(rows[active]); else goSearch(q); }
    else if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  };

  const showPanel = open && (rows.length > 0 || loading || (q.trim() && res && res.total === 0));
  const big = size === "lg";

  return (
    <div ref={boxRef} className={cn("relative w-full", className)}>
      <div className={cn(
        "flex items-center rounded-xl border bg-background transition-shadow",
        "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
        big ? "h-12 md:h-14 shadow-sm" : "h-10"
      )}>
        <Search className={cn("shrink-0 text-muted-foreground ml-3", big ? "h-5 w-5" : "h-4 w-4")} />
        <input
          ref={inputRef}
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => { setRecent(readRecent()); setOpen(true); }}
          onKeyDown={onKeyDown}
          placeholder={placeholder || "Search phones, parts, brands, models… e.g. iPhone 13 battery"}
          aria-label="Search the store"
          aria-expanded={showPanel ? true : false}
          aria-autocomplete="list"
          role="combobox"
          className={cn("flex-1 min-w-0 bg-transparent outline-none px-3 text-foreground placeholder:text-muted-foreground",
            big ? "text-base" : "text-sm")}
        />
        {q && (
          <button type="button" aria-label="Clear" onClick={() => { setQ(""); inputRef.current?.focus(); }}
            className="p-1.5 mr-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={() => goSearch(q)}
          className={cn("shrink-0 rounded-lg bg-primary text-primary-foreground font-medium mr-1.5 hover:bg-primary/90",
            big ? "h-9 md:h-11 px-4 md:px-6 text-sm" : "h-8 px-3 text-xs")}>
          Search
        </button>
      </div>

      {showPanel && (
        <div role="listbox"
          className="absolute left-0 right-0 top-full mt-2 z-[70] rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto">
          {!q.trim() && rows.length > 0 && (
            <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Recent searches</div>
          )}
          {rows.map((row, i) => {
            const isActive = i === active;
            const base = cn("flex items-center gap-3 px-3 py-2 cursor-pointer text-sm", isActive ? "bg-primary/10" : "hover:bg-muted/60");
            const common = { role: "option" as const, "aria-selected": isActive, onMouseEnter: () => setActive(i), onMouseDown: (e: React.MouseEvent) => e.preventDefault(), onClick: () => choose(row) };
            if (row.kind === "recent") return (
              <div key={`r${i}`} {...common} className={base}><Clock className="h-4 w-4 text-muted-foreground" /><span>{row.text}</span></div>
            );
            if (row.kind === "corrected") return (
              <div key="c" {...common} className={cn(base, "border-b border-border/60")}>
                <Sparkles className="h-4 w-4 text-primary" /><span>Did you mean <b className="text-primary">{row.text}</b>?</span>
              </div>
            );
            if (row.kind === "suggestion") return (
              <div key={`s${i}`} {...common} className={base}><Search className="h-4 w-4 text-muted-foreground" /><span><Highlight text={row.text} q={q} /></span></div>
            );
            if (row.kind === "category") return (
              <div key={row.hit.path} {...common} className={base}>
                <FolderOpen className="h-4 w-4 text-primary" />
                <span className="flex-1"><Highlight text={row.hit.name} q={q} /></span>
                <span className="text-xs text-muted-foreground">{row.hit.count.toLocaleString()} products</span>
              </div>
            );
            if (row.kind === "item") return (
              <div key={row.hit.item_id + row.hit.url_path} {...common} className={base}>
                <img src={getImageUrl(row.hit.main_image)} alt="" loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                  className="h-10 w-10 rounded-md object-cover bg-muted shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block truncate"><Highlight text={row.hit.name} q={q} /></span>
                  <span className="block text-xs text-muted-foreground">
                    {fmtPrice(row.hit.price)}{row.hit.price != null && " · "}
                    <span className={row.hit.in_stock ? "text-green-600" : "text-red-500"}>{row.hit.in_stock ? "In stock" : "Out of stock"}</span>
                  </span>
                </span>
              </div>
            );
            return (
              <div key="all" {...common} className={cn(base, "border-t border-border/60 text-primary font-medium")}>
                <ArrowRight className="h-4 w-4" /><span>See all {row.total.toLocaleString()} results for “{row.text}”</span>
              </div>
            );
          })}
          {q.trim() && !loading && res && res.total === 0 && rows.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              No matches for “{q.trim()}”. Try a brand, model or part name — e.g. “Samsung A52 battery”.
            </div>
          )}
          {loading && rows.length === 0 && <div className="px-3 py-3 text-sm text-muted-foreground">Searching…</div>}
        </div>
      )}
    </div>
  );
}

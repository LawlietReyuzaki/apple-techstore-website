import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageOff, Upload, CheckCircle2, Loader2, Package, Smartphone, RefreshCw } from "lucide-react";

const API = import.meta.env.VITE_LOCAL_API_URL || "";

interface Item { id: string; name: string; brand?: string; }
type Tab = "products" | "spare_parts";

const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1]);
    r.onerror = () => reject(new Error("Could not read the image file"));
    r.readAsDataURL(file);
  });

function ItemCard({ item, table, onDone }: { item: Item; table: Tab; onDone: (id: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [doneUrl, setDoneUrl] = useState<string | null>(null);

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp)$/.test(file.type)) {
      toast.error("Please choose a JPG, PNG, or WEBP image");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image is too large — please use one under 15 MB");
      return;
    }
    setUploading(true);
    try {
      const base64 = await readAsBase64(file);
      const res = await fetch(`${API}/api/admin/upload-image-gcs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, fileName: file.name, table, id: item.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setDoneUrl(json.url);
      toast.success("Image saved", { description: item.name });
      setTimeout(() => onDone(item.id), 1200);
    } catch (e: any) {
      toast.error("Upload failed", { description: e.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden flex flex-col">
      <button
        type="button"
        onClick={() => !uploading && !doneUrl && inputRef.current?.click()}
        className="relative aspect-square bg-muted/40 grid place-items-center border-b group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        disabled={uploading || !!doneUrl}
      >
        {doneUrl ? (
          <img src={doneUrl} alt={item.name} className="w-full h-full object-contain p-3" />
        ) : uploading ? (
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
            <ImageOff className="h-9 w-9" />
            <span className="text-xs font-medium">Click to upload</span>
          </div>
        )}
        {doneUrl && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[11px] font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/60 px-2 py-1 rounded-full">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </button>
      <div className="p-3 flex-1 flex flex-col gap-2">
        <p className="text-sm font-semibold leading-snug line-clamp-2">{item.name}</p>
        {item.brand && <p className="text-xs text-muted-foreground">{item.brand}</p>}
        <Button
          size="sm"
          variant={doneUrl ? "secondary" : "default"}
          className="mt-auto w-full gap-2"
          disabled={uploading || !!doneUrl}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : doneUrl ? <CheckCircle2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading…" : doneUrl ? "Done" : "Upload image"}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

export default function MissingImages() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Item[]>([]);
  const [spareParts, setSpareParts] = useState<Item[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/missing-images`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setProducts(json.products || []);
      setSpareParts(json.spare_parts || []);
    } catch (e: any) {
      toast.error("Could not load missing images", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const removeFrom = (table: Tab) => (id: string) => {
    if (table === "products") setProducts((p) => p.filter((i) => i.id !== id));
    else setSpareParts((p) => p.filter((i) => i.id !== id));
  };

  const list = tab === "products" ? products : spareParts;
  const tabs: { key: Tab; label: string; icon: any; count: number }[] = [
    { key: "products", label: "Products", icon: Package, count: products.length },
    { key: "spare_parts", label: "Spare Parts", icon: Smartphone, count: spareParts.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ImageOff className="h-6 w-6 text-primary" /> Missing Images
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Items with no photo. Upload one and it's saved permanently to storage and reused everywhere.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              tab === key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === key ? "bg-primary-foreground/20" : "bg-muted"}`}>{count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-20 bg-card border rounded-xl">
          <CheckCircle2 className="h-14 w-14 mx-auto mb-4 text-green-600" />
          <h3 className="text-lg font-bold">All done — no missing images here</h3>
          <p className="text-muted-foreground text-sm mt-1">Every {tab === "products" ? "product" : "spare part"} in this list has a photo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {list.map((item) => (
            <ItemCard key={item.id} item={item} table={tab} onDone={removeFrom(tab)} />
          ))}
        </div>
      )}
    </div>
  );
}

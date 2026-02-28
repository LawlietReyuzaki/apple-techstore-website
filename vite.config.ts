import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// MIME type lookup for images
function getImageMimeType(ext: string): string {
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".avif": "image/avif",
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Serve the local images/ directory directly from Vite dev server.
    // This avoids depending on the Express server for static image files.
    {
      name: "serve-local-images",
      configureServer(server) {
        const imagesDir = path.resolve(process.cwd(), "images");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        server.middlewares.use("/images", (req: any, res: any, next: any) => {
          // req.url is the path after the /images prefix, e.g. /foo/bar.jpg
          // Strip query string (?v=...) and leading slashes
          const urlPath = (req.url || "").split("?")[0].replace(/^\/+/, "");
          const filePath = path.join(imagesDir, urlPath);
          // Security: prevent path traversal
          if (!filePath.startsWith(imagesDir)) {
            next();
            return;
          }
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader("Content-Type", getImageMimeType(path.extname(filePath)));
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            fs.createReadStream(filePath).pipe(res);
          } else {
            next();
          }
        });
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

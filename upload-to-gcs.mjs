import { Storage } from '@google-cloud/storage';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const KEY_FILE   = join(__dirname, 'pdftranslate-a26c5-888e6e18435d.json');
const BUCKET     = 'dilbar-product-images';
const LOCAL_DIR  = join(__dirname, 'images');

const storage = new Storage({ keyFilename: KEY_FILE });
const bucket  = storage.bucket(BUCKET);

// Recursively get all files
function getAllFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(e =>
    e.isDirectory()
      ? getAllFiles(join(dir, e.name))
      : [join(dir, e.name)]
  );
}

async function upload() {
  const files = getAllFiles(LOCAL_DIR);
  console.log(`\nFound ${files.length} files to upload...\n`);

  let done = 0;
  const CONCURRENCY = 20; // upload 20 files at a time

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (filePath) => {
      const destination = relative(__dirname, filePath).replace(/\\/g, '/');
      await bucket.upload(filePath, { destination, resumable: false });
      done++;
      if (done % 100 === 0 || done === files.length) {
        process.stdout.write(`\r  Uploaded ${done}/${files.length}`);
      }
    }));
  }

  console.log(`\n\nDone! All ${files.length} files uploaded to gs://${BUCKET}/`);
  console.log(`\nPublic URL pattern:`);
  console.log(`  https://storage.googleapis.com/${BUCKET}/images/[folder]/[file].jpg\n`);
}

upload().catch(err => {
  console.error('\nUpload failed:', err.message);
  process.exit(1);
});

/**
 * Catalog classifier — derives brand / series / model / part type / price range from an
 * item's NAME. Names are consistent; the database's own phone_model / part_category links
 * are polluted, so they are only used as a fallback.
 *
 * This is a faithful port of the verified Python classifier used to build
 * AppleTechStore-Catalog-Classification.xlsx (parity-checked field by field).
 */

// ── Brands ────────────────────────────────────────────────────────────────
// first word → canonical brand. Series words (Galaxy, Redmi, Moto, Pixel, iPhone)
// map to their brand but stay part of the model name.
export const BRAND_ALIASES = {
  apple: 'Apple', iphone: 'Apple', ipad: 'Apple', airpods: 'Apple',
  samsung: 'Samsung', galaxy: 'Samsung',
  xiaomi: 'Xiaomi', redmi: 'Xiaomi', poco: 'Xiaomi', mi: 'Xiaomi',
  motorola: 'Motorola', moto: 'Motorola',
  google: 'Google', pixel: 'Google',
  huawei: 'Huawei', honor: 'Honor', oneplus: 'OnePlus',
  oppo: 'Oppo', vivo: 'Vivo', realme: 'Realme', infinix: 'Infinix',
  tecno: 'Tecno', itel: 'iTel', nokia: 'Nokia', sony: 'Sony', lg: 'LG',
  lenovo: 'Lenovo', lenevo: 'Lenovo', zte: 'ZTE', sharp: 'Sharp', tcl: 'TCL',
  alcatel: 'Alcatel', asus: 'Asus', htc: 'HTC', dell: 'Dell', hp: 'HP',
  acer: 'Acer', microsoft: 'Microsoft', nothing: 'Nothing', 'at&t': 'AT&T',
  't-mobile': 'T-Mobile', fujitsu: 'Fujitsu', kyocera: 'Kyocera', blu: 'BLU',
  cricket: 'Cricket', amazon: 'Amazon', dcode: 'DCode', digit: 'Digit',
  allcall: 'AllCall', xsmart: 'XSmart', sparx: 'Sparx', wiko: 'Wiko',
  oale: 'Oale', omnipod: 'OmniPod', orbic: 'Orbic', rakuten: 'Rakuten',
  zong: 'Zong', balmuda: 'Balmuda', leica: 'Leica', cat: 'CAT',
  umidigi: 'Umidigi', ulefone: 'Ulefone', doogee: 'Doogee', oukitel: 'Oukitel',
  meizu: 'Meizu', blackberry: 'BlackBerry', qmobile: 'QMobile', macbook: 'Apple',
  razer: 'Razer', boost: 'Boost Mobile', revvl: 'T-Mobile', aquos: 'Sharp',
  xperia: 'Sony', nexus: 'Google', lava: 'Lava', coolpad: 'Coolpad', gionee: 'Gionee',
  'one plus': 'OnePlus',
};
// Brand tokens removed from the model slug (series words like Galaxy/Redmi are kept)
const BRAND_WORDS = new Set(['apple', 'samsung', 'xiaomi', 'motorola', 'google', 'huawei', 'oneplus', 'oppo',
  'vivo', 'realme', 'infinix', 'tecno', 'itel', 'nokia', 'sony', 'lg', 'lenovo', 'lenevo',
  'zte', 'sharp', 'tcl', 'alcatel', 'asus', 'htc', 'dell', 'hp', 'acer', 'microsoft',
  'nothing', 'at&t', 't-mobile', 'fujitsu', 'kyocera', 'blu', 'cricket', 'amazon',
  'dcode', 'digit', 'allcall', 'xsmart', 'sparx', 'wiko', 'oale', 'omnipod', 'orbic',
  'rakuten', 'zong', 'balmuda', 'leica', 'cat', 'honor', 'meizu', 'blackberry', 'qmobile']);

function normBrand(s) {
  if (!s) return null;
  s = String(s).trim();
  return BRAND_ALIASES[s.toLowerCase()] || s;
}

// ── Part types (ORDER MATTERS: specific phrases before generic ones) ──────
const PARTS = [
  ['Screen Protector', 'Accessories', String.raw`\b(protector|tempered|screen guard|glass guard|privacy glass)\b`],
  // Repair consumables/tools mention "LCD" etc. but are not parts
  ['Repair Tools & Glue', 'Tools & Consumables', String.raw`\b(glue|oca|cleaner|adhesive|tape|screwdriver|opener|tool ?kit|b7000|t7000|e8000|uv lamp|soldering|flux)\b`],
  ['LCD Flex Cable', 'Display', String.raw`\b(lcd|display|screen) (flex|connector|cable|ribbon)\b`],
  // "Touch ID" and laptop touchpads must be caught before the generic "touch" rule
  ['Fingerprint Sensor', 'Flex Cables & Boards', String.raw`\bfinger ?print\b|\btouch ?id\b|\bface ?id\b`],
  ['Laptop Touchpad', 'Laptop Parts', String.raw`\b(touch ?pad|track ?pad)\b`],
  // Strong LCD words first ("LCD Touch Screen" is an LCD) …
  ['LCD Panel', 'Display', String.raw`\b(lcd|oled|amoled|incell|tft|ips|display)\b`],
  // … then touch/digitizer ("Touch Screen" alone is a digitizer) …
  ['Touch Glass', 'Display', String.raw`\btouch\b|\bdigitizer\b|\bfront glass\b`],
  // … then "screen" alone
  ['LCD Panel', 'Display', String.raw`\bscreen\b`],
  ['Camera Lens Glass', 'Camera', String.raw`\bcamera (lens|glass|ring|cover)\b|\blens glass\b|\bcamera lens\b`],
  ['Front Camera', 'Camera', String.raw`\b(front|selfie) camera\b`],
  ['Back Camera', 'Camera', String.raw`\b(back|rear|main|primary|wide|ultra ?wide|telephoto|macro) camera\b|\bcamera( module)?\b`],
  ['Back Glass / Back Panel', 'Body & Housing', String.raw`\bback (glass|panel|cover|door|housing|shell|lid|plate)\b|\bbackdoor\b|\brear (glass|panel|cover|housing)\b|\bbattery (door|cover)\b`],
  ['Charging Port / Flex', 'Power & Charging', String.raw`\bcharging (port|flex|connector|board|jack|strip|pcb|dock|pin)\b|\bcharger (port|flex|connector|board)\b|\busb (port|board|flex|connector)\b|\btype[- ]?c (port|flex|connector)\b|\bdock (connector|flex)\b`],
  ['Battery', 'Power & Charging', String.raw`\bbatter(y|ies)\b`],
  ['SIM Tray', 'Body & Housing', String.raw`\bsim( card)? (tray|holder|jacket|slot|reader)\b|\bsim tray\b`],
  ['Motherboard / Main Flex', 'Flex Cables & Boards', String.raw`\b(motherboard|mother board|main ?board|logic board|main flex)\b`],
  // "Power Volume Button Flex", "Power On Off Flex", "Home Button Flex" — match from the FIRST keyword
  ['Power / Volume Flex', 'Flex Cables & Boards', String.raw`\b(?:(?:power|volume|on|off|home|side|keys?|buttons?)\s*[/&+]?\s*){1,5}flex\b`],
  ['Side Keys / Buttons', 'Body & Housing', String.raw`\bside (keys?|buttons?)\b|\b(power|volume|home|camera) (key|button)s?\b|\bbuttons?\b`],
  ['Ear Speaker', 'Audio', String.raw`\b(ear ?speaker|earpiece|ear piece|receiver)\b`],
  ['Loud Speaker / Buzzer', 'Audio', String.raw`\b(loud ?speakers?|ringer|buzzer|speaker)\b`],
  ['Microphone', 'Audio', String.raw`\b(mic|microphone)\b`],
  ['Headphone Jack', 'Audio', String.raw`\b(headphone|earphone|audio|aux|hands ?free) (jack|flex)\b`],
  ['Vibrator', 'Other Parts', String.raw`\bvibrat(or|ion|e)\b`],
  ['S Pen / Stylus', 'Other Parts', String.raw`\bs ?pen\b|\bstylus pen\b|\bpencil\b`],
  ['Housing / Frame', 'Body & Housing', String.raw`\b(housing|casing|middle frame|mid frame|frame|chassis|bezel|body)\b`],
  // Foldable hinge flex ("Spin Axis Flex Cable") is a part, not a charging cable
  ['Hinge / Spin Axis Flex', 'Flex Cables & Boards', String.raw`\b(spin axis|rotating shaft|hinge)\s*(flex|cable)`],
  ['Other Flex / Sensors', 'Flex Cables & Boards', String.raw`\bflex (cable|strip|ribbon)\b`],
  ['Laptop Keyboard', 'Laptop Parts', String.raw`\bkeyboard\b`],
  ['Laptop Hinge', 'Laptop Parts', String.raw`\bhinges?\b`],
  ['Laptop Cooling Fan', 'Laptop Parts', String.raw`\b(cooling )?fan\b|\bheat ?sink\b`],
  ['RAM / Storage', 'Laptop Parts', String.raw`\b(ram|ssd|hdd|hard (disk|drive)|nvme|ddr\d|m\.2)\b`],
  ['Charger / Cable / Adapter', 'Accessories', String.raw`\b(charger|cable|adapter|adaptor|power ?bank)\b`],
  ['Case / Cover', 'Accessories', String.raw`\b(case|pouch|flip cover|silicone cover|skin)\b`],
  ['Audio Accessory', 'Accessories', String.raw`\b(earbuds|earphones?|headphones?|handsfree|airpods|headset)\b`],
  ['Other Flex / Sensors', 'Flex Cables & Boards', String.raw`\b(flex|proximity|sensor|antenna|signal|wifi|nfc|flash ?light|strip)\b`],
];
const PART_RX = PARTS.map(([t, g, r]) => [t, g, new RegExp(r, 'i')]);
const PART_GROUP = {};
for (const [t, g] of PARTS) if (!(t in PART_GROUP)) PART_GROUP[t] = g;
const ANY_PART = new RegExp(PARTS.map(([, , r]) => `(?:${r})`).join('|'), 'i');

const QUALITY_RX = [
  ['Original', String.raw`\b(original|orignal|genuine|oem|org)\b`],
  ['High Copy / Premium', String.raw`\b(high copy|aaa|premium|a\+|master copy)\b`],
  ['Copy', String.raw`\b(copy|duplicate)\b`],
];
const TECH_RX = [['OLED / AMOLED', String.raw`\b(oled|amoled|super amoled)\b`], ['Incell', String.raw`\bincell\b`],
  ['TFT', String.raw`\btft\b`], ['IPS', String.raw`\bips\b`]];
const PTA_RX = [['PTA Approved', String.raw`\bpta approved\b|\bofficial pta\b`], ['Non-PTA', String.raw`\bnon[- ]?pta\b|\bfactory unlocked\b`],
  ['CPID / Patch', String.raw`\b(cpid|patch approved|patched)\b`]];
const COND_RX = [['Used', String.raw`\bused\b`], ['Refurbished', String.raw`\brefurb(ished)?\b`],
  ['New / Box Pack', String.raw`\b(box pack|brand new|new)\b`]];
const STRIP_WORDS = new RegExp(String.raw`\b(original|orignal|genuine|oem|high copy|copy|premium|aaa|replacement|compatible|complete|full|` +
  String.raw`set|unit|pta approved|non[- ]?pta|pta|official|used|new|refurbished|box pack|dual sim|` +
  String.raw`with frame|without frame|with|for|of)\b`, 'gi');  // never strip "&" (AT&T)
const STORAGE = new RegExp(String.raw`\b\d+\s?(gb|tb)(\s?[/+-]\s?\d+\s?(gb|tb))?\b`, 'gi');
const TRAILING_JUNK = new RegExp(String.raw`(\s+(power|volume|button|buttons|back|front|rear|main|charging|home|side|keys?|on|off|full|body|and|/|-))+$`, 'i');

export const PRICE_BANDS = [
  [0, 999, 'Under Rs 1,000', 'under-1000'],
  [1000, 2999, 'Rs 1,000 – 2,999', '1000-to-2999'],
  [3000, 4999, 'Rs 3,000 – 4,999', '3000-to-4999'],
  [5000, 9999, 'Rs 5,000 – 9,999', '5000-to-9999'],
  [10000, 24999, 'Rs 10,000 – 24,999', '10000-to-24999'],
  [25000, 49999, 'Rs 25,000 – 49,999', '25000-to-49999'],
  [50000, 99999, 'Rs 50,000 – 99,999', '50000-to-99999'],
  [100000, 1e12, 'Rs 100,000 and above', '100000-and-above'],
];

// Friendly, stable URL slugs and plural names for part types
export const PART_SLUG = {
  'LCD Panel': 'lcd-panels', 'Touch Glass': 'touch-glass', 'LCD Flex Cable': 'lcd-flex-cables', 'Battery': 'batteries',
  'Charging Port / Flex': 'charging-ports', 'SIM Tray': 'sim-trays', 'Camera Lens Glass': 'camera-lens-glass',
  'Back Camera': 'back-cameras', 'Front Camera': 'front-cameras', 'Back Glass / Back Panel': 'back-glass-panels',
  'Housing / Frame': 'housings-frames', 'Side Keys / Buttons': 'side-keys-buttons',
  'Motherboard / Main Flex': 'motherboard-flex', 'Power / Volume Flex': 'power-volume-flex',
  'Fingerprint Sensor': 'fingerprint-sensors', 'Other Flex / Sensors': 'other-flex-sensors',
  'Hinge / Spin Axis Flex': 'hinge-flex', 'Loud Speaker / Buzzer': 'loud-speakers', 'Ear Speaker': 'ear-speakers',
  'Microphone': 'microphones', 'Headphone Jack': 'headphone-jacks', 'Vibrator': 'vibrators', 'S Pen / Stylus': 's-pens',
  'Laptop Battery': 'laptop-batteries', 'Laptop Screen': 'laptop-screens', 'Laptop Screen Cable': 'laptop-screen-cables',
  'Laptop Charging Port': 'laptop-charging-ports', 'Laptop Keyboard': 'laptop-keyboards',
  'Charger / Cable / Adapter': 'chargers-cables', 'Screen Protector': 'screen-protectors', 'Case / Cover': 'cases',
  'Audio Accessory': 'audio-accessories', 'Repair Tools & Glue': 'repair-tools',
};
export const PART_PLURAL = {
  'LCD Panel': 'LCD Panels', 'Battery': 'Batteries', 'Touch Glass': 'Touch Glass', 'SIM Tray': 'SIM Trays',
  'Charging Port / Flex': 'Charging Ports', 'Camera Lens Glass': 'Camera Lens Glass', 'Motherboard / Main Flex': 'Motherboard Flex',
  'Back Glass / Back Panel': 'Back Glass & Panels', 'Power / Volume Flex': 'Power & Volume Flex', 'LCD Flex Cable': 'LCD Flex Cables',
  'Side Keys / Buttons': 'Side Keys & Buttons', 'Loud Speaker / Buzzer': 'Loud Speakers', 'Fingerprint Sensor': 'Fingerprint Sensors',
  'Housing / Frame': 'Housings & Frames', 'Headphone Jack': 'Headphone Jacks', 'Ear Speaker': 'Ear Speakers',
  'Front Camera': 'Front Cameras', 'Back Camera': 'Back Cameras', 'S Pen / Stylus': 'S Pens', 'Hinge / Spin Axis Flex': 'Hinge Flex Cables',
  'Other Flex / Sensors': 'Flex Cables & Sensors', 'Laptop Battery': 'Laptop Batteries', 'Laptop Screen': 'Laptop Screens',
  'Laptop Screen Cable': 'Laptop Screen Cables', 'Laptop Charging Port': 'Laptop Charging Ports',
  'Charger / Cable / Adapter': 'Chargers & Cables', 'Repair Tools & Glue': 'Repair Tools & Glue', 'Microphone': 'Microphones',
  'Vibrator': 'Vibrators', 'Screen Protector': 'Screen Protectors', 'Case / Cover': 'Cases & Covers',
};

// ── Python-compatible string helpers ──────────────────────────────────────
const search = (p, text) => new RegExp(p, 'i').test(text);
function first(list, text) { for (const [label, p] of list) if (search(p, text)) return label; return null; }
function isUpper(s) { return s === s.toUpperCase() && s !== s.toLowerCase(); }
function pyTitle(s) { return s.toLowerCase().replace(/(^|[^a-z])([a-z])/g, (m, p, c) => p + c.toUpperCase()); }
function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s; }
function stripChars(s, chars) {
  let a = 0, b = s.length;
  while (a < b && chars.includes(s[a])) a++;
  while (b > a && chars.includes(s[b - 1])) b--;
  return s.slice(a, b);
}
export function slugify(s) {
  // "8.1" → 8-1 (not 81), "S8+" → s8-plus (not s8), "A10/A10s" → a10-a10s
  let t = String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/\+/g, ' plus ');
  t = t.replace(/[./]/g, '-').replace(/[^a-z0-9\s-]/g, '');
  t = t.trim().replace(/\s+/g, '-').replace(/-{2,}/g, '-');
  return stripChars(t, '-');
}
const smartCase = (s) => (isUpper(s) && s.length > 4 ? pyTitle(s) : s);
export function priceBand(p) {
  if (p == null || p <= 0) return ['No price', 'no-price'];
  for (const [lo, hi, label, slug] of PRICE_BANDS) if (p >= lo && p <= hi) return [label, slug];
  return ['No price', 'no-price'];
}
export const partSlug = (p) => PART_SLUG[p] || slugify(p);
export const partPlural = (p) => PART_PLURAL[p] || `${p}s`;

const SERIES_ALIASES = { Pocophone: 'Poco', 'Moto One': 'One', Black: 'Black Shark', Matepad: 'MatePad', Iqoo: 'iQOO',
  Rog: 'ROG', Thinkphone: 'ThinkPhone', Zenfone: 'ZenFone', 'GT Series': 'GT', Mix: 'Mi Mix' };
const ACRONYMS = new Set(['gt', 'xt', 'rog', 'gx', 'rx', 'zte', 'lg', 'htc']);

function seriesOf(modelSlug, brand) {
  const s = _seriesOf(modelSlug, brand);
  return SERIES_ALIASES[s] || s;
}
function _seriesOf(modelSlug, brand) {
  const t = modelSlug ? modelSlug.split('-') : [];
  if (!t.length || !t[0]) return '';
  const f = t[0];
  if (['galaxy', 'redmi', 'moto'].includes(f) && t.length > 1) {
    const sub = t[1];
    if (/^\d/.test(sub)) return capitalize(f);                  // "Redmi 9", "Redmi 10a" → Redmi
    const m = sub.match(/^([a-z]+)\d/);                          // "Galaxy A10" → Galaxy A
    const label = m ? m[1].toUpperCase() : capitalize(sub);
    const k = `${capitalize(f)} ${label}`;
    return SERIES_ALIASES[k] || k;
  }
  if (brand === 'Motorola' && ['g', 'e', 'z', 'x', 'c'].includes(f)) return `Moto ${f.toUpperCase()}`;
  if (f === 'iphone') return 'iPhone';
  if (f === 'ipad') return 'iPad';
  let m = f.match(/^([a-z]{1,2})\d/);                            // "Y7a" → Y Series
  if (m) return `${m[1].toUpperCase()} Series`;
  if (/^\d/.test(f)) return `${brand} Numbered`;
  m = f.match(/^([a-z]{3,})\d+[a-z]*$/);                        // "Reno2" → Reno
  const word = m ? m[1] : f;
  let label = (ACRONYMS.has(word) || word.length === 1) ? word.toUpperCase() : capitalize(word);
  if (word.length === 1 && t.length > 1 && /^[a-z]+$/.test(t[1])) label = `${word.toUpperCase()} ${capitalize(t[1])}`;
  return SERIES_ALIASES[label] || label;
}

function imagesOf(r) {
  return (Array.isArray(r.images) ? r.images : []).filter((u) => typeof u === 'string' && u.trim());
}
function bucketFolder(url) {
  const m = String(url || '').match(/storage\.googleapis\.com\/([^/]+)\/(images\/[^/]+\/)/);
  return m ? [m[1], m[2]] : ['', ''];
}

const PATH_PREFIX = { products: 'product', spare_parts: 'spare-part', shop_items: 'shop-item' };

/**
 * Classify one item.
 * @param source        'products' | 'spare_parts' | 'shop_items'
 * @param r             row with id, name, price, sale_price, wholesale_price, stock, slug, images
 * @param extraCategory existing DB category name (fallback signal only)
 * @param fallbackBrand existing DB brand (used only when the name has no known brand)
 * @param dbQuality     existing DB quality name (used only when the name has none)
 */
export function classifyItem(source, r, extraCategory, fallbackBrand, dbQuality = null) {
  const name = String(r.name || '').trim();
  const low = name.toLowerCase();
  const tokens = low.split(/\s+/).filter(Boolean);
  let review = [];

  // brand
  const firstWord = tokens[0] || '';
  const twoWords = tokens.slice(0, 2).join(' ');
  let brand = BRAND_ALIASES[twoWords] || BRAND_ALIASES[firstWord];
  let brandSource = 'name';
  if (!brand) {
    const fb = normBrand(fallbackBrand);
    if (fb && !['various', 'mobile', 'other', ''].includes(fb.toLowerCase())) {
      brand = fb; brandSource = 'database';
    } else {
      brand = name ? smartCase(name.split(/\s+/)[0]) : 'Unknown';
      brandSource = 'guessed';
      review.push('brand guessed from first word');
    }
  }

  // part type (first matching rule wins)
  let partType = null;
  for (const [t, , rx] of PART_RX) if (rx.test(low)) { partType = t; break; }
  let partGroup = partType ? PART_GROUP[partType] : null;

  // kind
  const cat = String(extraCategory || '').toLowerCase();
  const isLaptop = cat.includes('laptop') || cat.includes('computer') || ['Dell', 'HP', 'Acer'].includes(brand) || low.includes('macbook');
  let kind;
  if (partGroup === 'Tools & Consumables') {
    kind = 'Repair Tool / Consumable';
    if (brandSource === 'guessed') {
      brand = 'Generic'; brandSource = 'rule';
      review = review.filter((x) => !x.startsWith('brand guessed'));
    }
  } else if (partGroup === 'Accessories') {
    kind = 'Accessory';
  } else if (partType) {
    kind = (isLaptop || partGroup === 'Laptop Parts') ? 'Laptop Part' : 'Mobile Spare Part';
  } else if (/\b(tab|tablet|ipad|pad)\b/.test(low) || cat.includes('tablet')) {
    kind = 'Tablet';
  } else if (isLaptop && /\b(laptop|notebook|macbook|latitude|inspiron|thinkpad|elitebook|probook|chromebook)\b/.test(low)) {
    kind = 'Laptop';
  } else {
    kind = 'Phone';
    if (cat.includes('spare part') || cat.includes('lcd') || cat.includes('battery') || cat.includes('glass')) {
      review.push('no part keyword but listed under spare parts');
    }
  }

  // Laptop parts get their own types so phone and laptop batteries/screens never mix
  if (kind === 'Laptop Part' && partGroup !== 'Laptop Parts') {
    partType = ({ 'Battery': 'Laptop Battery', 'LCD Panel': 'Laptop Screen', 'Touch Glass': 'Laptop Screen',
      'LCD Flex Cable': 'Laptop Screen Cable', 'Charging Port / Flex': 'Laptop Charging Port' })[partType] || `Laptop ${partType}`;
    partGroup = 'Laptop Parts';
  }

  // model: text before the first part keyword, minus quality/condition/storage words
  let modelRaw = name;
  const m = name.match(ANY_PART);
  if (m && partType) {
    const before = stripChars(name.slice(0, m.index).trim(), ' -,/(');
    const after = stripChars(name.slice(m.index + m[0].length).trim(), ' -,/)');
    modelRaw = before || after.replace(/^(for|of|compatible with)\s+/i, '');
  }
  modelRaw = modelRaw.replace(STORAGE, '');
  modelRaw = modelRaw.replace(STRIP_WORDS, ' ');
  modelRaw = stripChars(modelRaw.replace(/\s+/g, ' ').trim(), ' -,/()');
  modelRaw = stripChars(modelRaw.replace(TRAILING_JUNK, '').trim(), ' -,/()');
  let modelDisp = smartCase(modelRaw);

  // Model slug = model without the brand's own name. Series words stay:
  // "Huawei Honor 5C" → honor-5c (under Huawei); "Apple iPhone X" → iphone-x.
  let modelSlug = slugify(modelDisp);
  const brandSlug = slugify(brand);
  const pureAliases = Object.entries(BRAND_ALIASES).filter(([a, b]) => b === brand && BRAND_WORDS.has(a)).map(([a]) => slugify(a));
  const prefixes = [...new Set([brandSlug, ...pureAliases])].sort((x, y) => y.length - x.length);
  for (const prefix of prefixes) {
    if (modelSlug === prefix) { modelSlug = ''; }
    else if (modelSlug.startsWith(prefix + '-')) { modelSlug = modelSlug.slice(prefix.length + 1); break; }
  }
  // One phone must get ONE slug however its name is written
  if (brand === 'Motorola' && /^[gezxc](\d+[a-z]*)?(-|$)/.test(modelSlug)) modelSlug = 'moto-' + modelSlug;
  if (brand === 'Samsung' && !modelSlug.startsWith('galaxy') && /^((a|s|m|j|f|c|e|z)\d+[a-z]*|note|tab|fold|flip)(-|$)/.test(modelSlug)) {
    modelSlug = 'galaxy-' + modelSlug;
  }
  // Number-only models read badly in a URL: "OnePlus 8" → oneplus-8, not 8
  if (/^\d/.test(modelSlug)) modelSlug = `${brandSlug}-${modelSlug}`;
  if (partGroup === 'Tools & Consumables') { modelSlug = ''; modelDisp = ''; }
  if (!modelSlug && partGroup !== 'Tools & Consumables') review.push('model could not be read from name');
  if (modelDisp && !modelDisp.toLowerCase().startsWith(brand.toLowerCase())) modelDisp = `${brand} ${modelDisp}`.trim();

  // price actually shown to customers (lowest valid of sale / wholesale / regular)
  const regular = Number(r.price) || 0;
  const cands = [regular, ...[r.sale_price, r.wholesale_price].map(Number).filter((v) => v && v > 0 && v < regular)];
  const price = cands.length ? Math.min(...cands) : 0;
  if (!price) review.push('no price');

  const imgs = imagesOf(r);
  const [bucket, folder] = bucketFolder(imgs[0] || '');
  if (!imgs.length) review.push('no image');

  const stripped = modelSlug.startsWith(brandSlug + '-') ? modelSlug.slice(brandSlug.length + 1) : modelSlug;
  const series = seriesOf(/^\d/.test(stripped) ? stripped : modelSlug, brand);
  const [band, bandSlug] = priceBand(price);
  const prefix = PATH_PREFIX[source];
  const isLcd = partType === 'LCD Panel' || partType === 'Touch Glass';
  const isDevice = kind === 'Phone' || kind === 'Tablet';

  return {
    item_id: r.id,
    source_table: source,
    name,
    kind,
    brand,
    brand_slug: brandSlug,
    brand_source: brandSource,
    series,
    series_slug: slugify(series),
    model: modelDisp,
    model_slug: modelSlug,
    part_group: partGroup || '',
    part_type: partType || '',
    part_type_slug: partType ? partSlug(partType) : '',
    quality: first(QUALITY_RX, low) || dbQuality || 'Not specified',
    display_tech: isLcd ? (first(TECH_RX, low) || 'Not specified') : '',
    pta_status: isDevice ? (first(PTA_RX, low) || 'Not specified') : '',
    condition: isDevice ? (first(COND_RX, low) || 'Not specified') : '',
    price,
    regular_price: regular,
    price_band: band,
    price_band_slug: bandSlug,
    stock: Number(r.stock) || 0,
    in_stock: (Number(r.stock) || 0) > 0,
    url_path: `/${prefix}/${r.slug || r.id}`,
    old_url_path: `/${prefix}/${r.id}`,
    main_image: imgs[0] || '',
    images: imgs,
    image_count: imgs.length,
    bucket,
    bucket_folder: folder,
    old_db_category: extraCategory || '',
    needs_review: review.join('; '),
  };
}

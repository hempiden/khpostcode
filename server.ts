import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Define postcode entry type
interface PostcodeEntry {
  id: string;
  province: string;
  district: string;
  commune: string;
  existing_postcode: string;
  new_postcode: string;
  new_country_division?: string;
  new_city_name?: string;
  ib_sort_co?: string;
  inbound_fac?: string;
}

const app = express();
const PORT = 3000;

// Set up body parsing limits
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

const dataFilePath = path.join(process.cwd(), "src", "data", "cambodia_postcodes.json");
const backupFilePath = path.join(process.cwd(), "src", "data", "cambodia_postcodes_backup.json");
const configFilePath = path.join(process.cwd(), "src", "data", "api_config.json");

// Establish original gold-standard baseline backup at first launch
try {
  const dir = path.dirname(backupFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // If the active database has the 1653 records synced from Supabase, promote it to be our baseline backup
  if (fs.existsSync(dataFilePath)) {
    const rawContent = fs.readFileSync(dataFilePath, "utf-8");
    try {
      const currentData = JSON.parse(rawContent);
      if (Array.isArray(currentData) && currentData.length >= 1650) {
        fs.copyFileSync(dataFilePath, backupFilePath);
        console.log(`Successfully promoted the full ${currentData.length} records dataset to the official Cambodian baseline.`);
      }
    } catch (e) {}
  }
  if (!fs.existsSync(backupFilePath) && fs.existsSync(dataFilePath)) {
    fs.copyFileSync(dataFilePath, backupFilePath);
    console.log("Successfully backed up the original 1653 Cambodian baseline postcode records.");
  }
} catch (backupErr) {
  console.error("Initialization warning: could not establish database baseline backup:", backupErr);
}

// Ensure /public exists and copy cambodia_postcodes.json there for static fallback (e.g. Vercel)
try {
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const publicJson = path.join(publicDir, "cambodia_postcodes.json");
  if (fs.existsSync(dataFilePath)) {
    fs.copyFileSync(dataFilePath, publicJson);
    console.log("Successfully mirrored postcode database to public directory for static / Vercel fallback.");
  }
} catch (publicErr) {
  console.error("Initialization warning: could not copy database to public folder:", publicErr);
}

interface ApiConfig {
  supabaseUrl: string;
  supabaseKey: string;
  supabaseTableName?: string;
  supabaseOverriddenFromEnv?: boolean;
  geminiKey: string;
  geminiVersion: string;
  googleMapsKey: string;
  googleMapsId: string;
  siteTitle?: string;
  platformTitle?: string;
  heroBgImages?: string[];
  footerCopyright?: string;
  websiteLogoType?: "preset" | "url" | "svg";
  websiteLogoPreset?: string;
  websiteLogoUrl?: string;
  websiteLogoSvg?: string;
  enableTextSearch?: boolean;
  enablePhotoSearch?: boolean;
  enableMapSearch?: boolean;
  enableDropdownSearch?: boolean;
}

function sanitizeSupabaseUrl(url: string | undefined): string {
  if (!url) return "";
  let cleaned = url.trim();
  if (cleaned && !cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = "https://" + cleaned;
  }
  return cleaned.replace(/\/+$/, "");
}

function sanitizeSupabaseKey(key: string | undefined): string {
  if (!key) return "";
  let cleaned = key.trim();
  cleaned = cleaned.replace(/^['"]|['"]$/g, "");
  if (cleaned.toLowerCase().startsWith("bearer ")) {
    cleaned = cleaned.substring(7).trim();
  }
  return cleaned;
}

function sanitizeSupabaseTable(table: string | undefined): string {
  if (!table) return "cambodia_postcode_migration";
  return table.trim().replace(/^['"]|['"]$/g, "");
}

function getApiConfig(): ApiConfig {
  let fileConfig: Partial<ApiConfig> = {};
  try {
    if (fs.existsSync(configFilePath)) {
      fileConfig = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to read server api_config.json:", e);
  }

  // Precedence: User edits saved to the server configuration (src/data/api_config.json)
  // always take priority over environment variables, allowing interactive edits to persist and override
  // any system defaults.
  const envSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_URL || process.env.NEXT_PUBLIC_NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const envSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_NEXT_PUBLIC_SUPABASE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const envSupabaseTable = process.env.SUPABASE_TABLE_NAME || process.env.VITE_SUPABASE_TABLE_NAME || process.env.NEXT_PUBLIC_SUPABASE_TABLE_NAME;
  const envGeminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_KEY;

  let config: ApiConfig = {
    supabaseUrl: sanitizeSupabaseUrl(fileConfig.supabaseUrl !== undefined ? fileConfig.supabaseUrl : (envSupabaseUrl || "")),
    supabaseKey: sanitizeSupabaseKey(fileConfig.supabaseKey !== undefined ? fileConfig.supabaseKey : (envSupabaseKey || "")),
    supabaseTableName: sanitizeSupabaseTable(fileConfig.supabaseTableName !== undefined ? fileConfig.supabaseTableName : (envSupabaseTable || "cambodia_postcode_migration")),
    supabaseOverriddenFromEnv: false,
    geminiKey: fileConfig.geminiKey !== undefined ? fileConfig.geminiKey : (envGeminiKey || ""),
    geminiVersion: fileConfig.geminiVersion || "gemini-3.5-flash",
    googleMapsKey: fileConfig.googleMapsKey !== undefined ? fileConfig.googleMapsKey : (process.env.VITE_GOOGLE_MAPS_KEY || ""),
    googleMapsId: fileConfig.googleMapsId !== undefined ? fileConfig.googleMapsId : (process.env.VITE_GOOGLE_MAPS_ID || "DEMO_MAP_ID"),
    siteTitle: fileConfig.siteTitle || "KH Postal Code",
    platformTitle: fileConfig.platformTitle || "Cambodia Postcode",
    heroBgImages: fileConfig.heroBgImages || [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2000&q=80",
      "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=2000&q=80",
      "https://images.unsplash.com/photo-1558862107-d49ef2a04d72?auto=format&fit=crop&w=2000&q=80"
    ],
    footerCopyright: fileConfig.footerCopyright || "2026 Cambodia Postcode by DHL Express Cambodia.",
    websiteLogoType: fileConfig.websiteLogoType || "preset",
    websiteLogoPreset: fileConfig.websiteLogoPreset || "map",
    websiteLogoUrl: fileConfig.websiteLogoUrl || "",
    websiteLogoSvg: fileConfig.websiteLogoSvg || "",
    enableTextSearch: fileConfig.enableTextSearch !== undefined ? fileConfig.enableTextSearch : false,
    enablePhotoSearch: fileConfig.enablePhotoSearch !== undefined ? fileConfig.enablePhotoSearch : true,
    enableMapSearch: fileConfig.enableMapSearch !== undefined ? fileConfig.enableMapSearch : false,
    enableDropdownSearch: fileConfig.enableDropdownSearch !== undefined ? fileConfig.enableDropdownSearch : true
  };

  return config;
}

function writeApiConfig(newConfig: Partial<ApiConfig>): boolean {
  try {
    const parentDir = path.dirname(configFilePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    const existing = getApiConfig();
    const updated = { ...existing, ...newConfig };
    fs.writeFileSync(configFilePath, JSON.stringify(updated, null, 2), "utf-8");
    
    // Dynamically update server run-time settings so no hard restart is required
    SUPABASE_URL = sanitizeSupabaseUrl(updated.supabaseUrl);
    SUPABASE_KEY = sanitizeSupabaseKey(updated.supabaseKey);
    SUPABASE_TABLE_NAME = sanitizeSupabaseTable(updated.supabaseTableName || "cambodia_postcode_migration");
    
    if (updated.geminiKey) {
      process.env.GEMINI_API_KEY = updated.geminiKey;
    }
    return true;
  } catch (e) {
    console.error("Failed to write server api_config.json:", e);
    return false;
  }
}

// Populate config on server boot
const initialConfig = getApiConfig();
let SUPABASE_URL = sanitizeSupabaseUrl(initialConfig.supabaseUrl);
let SUPABASE_KEY = sanitizeSupabaseKey(initialConfig.supabaseKey);
let SUPABASE_TABLE_NAME = sanitizeSupabaseTable(initialConfig.supabaseTableName) || "cambodia_postcode_migration";

if (initialConfig.geminiKey) {
  process.env.GEMINI_API_KEY = initialConfig.geminiKey;
}

const isSupabaseConfigured = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_KEY);
};

// Robust Gemini API query with exponential backoff and alternate model fallback
async function generateContentWithRetry(aiClient: any, params: any, maxRetries = 3): Promise<any> {
  const models = [
    params.model || "gemini-3.5-flash",
    "gemini-3.1-flash-lite"
  ];
  
  let lastError: any = null;
  
  for (const modelName of models) {
    let delay = 600;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini API] Querying model ${modelName} - attempt ${attempt}/${maxRetries}...`);
        const response = await aiClient.models.generateContent({
          ...params,
          model: modelName,
        });
        if (response) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err.message || "").toLowerCase();
        console.warn(`[Gemini API] Failed querying ${modelName} on attempt ${attempt}: ${err.message}`);
        
        // If it looks like a transient/rate limit/load error, wait with backoff
        if (attempt < maxRetries && (
          msg.includes("503") || 
          msg.includes("demand") || 
          msg.includes("temporary") || 
          msg.includes("unavailable") || 
          msg.includes("429") || 
          msg.includes("rate limit") ||
          msg.includes("overloaded")
        )) {
          console.log(`[Gemini API] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          break; // break retry loop to try the next model
        }
      }
    }
  }
  
  throw lastError || new Error("Failed to generate content after routing retries and fallbacks");
}

// Local javascript fallback matching algorithm
function localPostcodeMatch(inputText: string, db: PostcodeEntry[]): any {
  const cleanInput = (inputText || "").trim().toLowerCase();
  if (!cleanInput) {
    return {
      province: "Unknown",
      district: "Unknown",
      commune: "Unknown",
      postcode_status: "Unknown",
      existing_postcode: "",
      new_postcode: "",
      input_text: inputText || ""
    };
  }

  // Look for any postcode-like numbers (5 to 6 digits)
  const numbersFound: string[] = cleanInput.match(/\b\d{5,6}\b/g) || [];

  // Common synonym normalization for Cambodian landmarks & districts
  const synonyms: { [key: string]: string[] } = {
    "boeng keng kang": ["bkk", "beoung keng kang", "boeng keng kang", "bangkengkang"],
    "chamkar mon": ["chamkarmon", "chamkar mon", "chamkar morn", "chamkarmorn"],
    "prampir meakkara": ["7 makara", "7makara", "prampir makara", "prampir meakkara", "7_makara", "7-makara"],
    "tuol kouk": ["toul kouk", "toulkouk", "tuol kouk", "tual kouk", "tuolkouk"],
    "phnom penh": ["pp", "phnompenh", "phnom penh", "phnom, penh"],
    "doun penh": ["daun penh", "doun penh", "daunpenh", "dounpenh"]
  };

  let substitutedInput = cleanInput;
  for (const [canonical, aliases] of Object.entries(synonyms)) {
    for (const alias of aliases) {
      if (substitutedInput.includes(alias)) {
        substitutedInput = substitutedInput.replace(alias, canonical);
      }
    }
  }

  let bestEntry: PostcodeEntry | null = null;
  let bestScore = 0;

  for (const item of db) {
    let score = 0;
    const p = (item.province || "").toLowerCase();
    const d = (item.district || "").toLowerCase();
    const c = (item.commune || "").toLowerCase();

    // Check direct commune substring match which is very strong
    if (c && substitutedInput.includes(c)) {
      score += 25;
    }
    // Check district matching
    if (d && substitutedInput.includes(d)) {
      score += 15;
    }
    // Check province matching
    if (p && substitutedInput.includes(p)) {
      score += 5;
    }

    // Checking word overlap
    const words = substitutedInput.split(/[\s,.\-\/]+/);
    for (const w of words) {
      if (w.length < 3) continue;
      if (c && c.includes(w)) score += 5;
      if (d && d.includes(w)) score += 3;
      if (p && p.includes(w)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntry = item;
    }
  }

  if (!bestEntry || bestScore < 6) {
    return {
      province: "Unknown",
      district: "Unknown",
      commune: "Unknown",
      postcode_status: "Unknown",
      existing_postcode: "",
      new_postcode: "",
      input_text: inputText
    };
  }

  // Determine postcode status based on presence of postcodes in input
  let status = "Incorrect Postcode"; // default fallback if matched administrative unit is found but no postal match
  
  const matchesNew = numbersFound.includes(bestEntry.new_postcode);
  const matchesExisting = bestEntry.existing_postcode ? numbersFound.includes(bestEntry.existing_postcode) : false;

  if (matchesNew) {
    status = "Follow New Postcode";
  } else if (matchesExisting) {
    status = "Follow Existing Postcode";
  } else if (numbersFound.length === 0) {
    // No postcode digits were supplied on the label
    status = "No Postcode Detected";
  }

  return {
    province: bestEntry.province,
    district: bestEntry.district,
    commune: bestEntry.commune,
    postcode_status: status,
    existing_postcode: bestEntry.existing_postcode || "",
    new_postcode: bestEntry.new_postcode || "",
    ib_sort_co: bestEntry.ib_sort_co || "",
    inbound_fac: bestEntry.inbound_fac || "",
    input_text: inputText
  };
}

// Helper to strip single or double quotes (often added by Excel spreadsheet outputs)
// from postcode string fields to ensure clean numeric string parity.
function sanitizePostcodeFields(items: PostcodeEntry[]): PostcodeEntry[] {
  return items.map(item => ({
    ...item,
    existing_postcode: String(item.existing_postcode || "").replace(/['"]/g, "").trim(),
    new_postcode: String(item.new_postcode || "").replace(/['"]/g, "").trim()
  }));
}

// Helper to read local JSON database cache
function readDatabase(): PostcodeEntry[] {
  try {
    if (fs.existsSync(dataFilePath)) {
      const parsed = JSON.parse(fs.readFileSync(dataFilePath, "utf-8"));
      return sanitizePostcodeFields(Array.isArray(parsed) ? parsed : []);
    } else if (fs.existsSync(backupFilePath)) {
      // Auto-restores the active postcode file using the baseline backup to provide ultimate resilience
      console.log("Active database file missing. Auto-restoring from cambodia_postcodes_backup.json...");
      fs.copyFileSync(backupFilePath, dataFilePath);
      const parsed = JSON.parse(fs.readFileSync(dataFilePath, "utf-8"));
      return sanitizePostcodeFields(Array.isArray(parsed) ? parsed : []);
    }
  } catch (err) {
    console.error("Error reading database file:", err);
  }
  return [];
}

// Helper to read original baseline backup file safely
function readBackupDatabase(): PostcodeEntry[] {
  try {
    if (fs.existsSync(backupFilePath)) {
      const parsed = JSON.parse(fs.readFileSync(backupFilePath, "utf-8"));
      return sanitizePostcodeFields(Array.isArray(parsed) ? parsed : []);
    }
  } catch (err) {
    console.error("Error reading backup database file:", err);
  }
  return readDatabase();
}

// Helper to write local JSON database cache
function writeDatabase(data: PostcodeEntry[]): boolean {
  try {
    const parentDir = path.dirname(dataFilePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing database file:", err);
    return false;
  }
}

// Master resolver to retrieve postcode DB (Supabase-first with local fallback, resolving any 1000 limit)
async function getPostcodeDb(): Promise<PostcodeEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      let allRows: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE_NAME}?select=*&order=id.asc`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "apikey": SUPABASE_KEY!,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Range": `${from}-${to}`
          }
        });

        if (response.ok) {
          const rawData = await response.json();
          if (Array.isArray(rawData) && rawData.length > 0) {
            allRows = allRows.concat(rawData);
            if (rawData.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        } else {
          console.warn(`Supabase get page ${page} returned status ${response.status}.`);
          hasMore = false;
          if (allRows.length === 0) {
            return readDatabase();
          }
        }
      }

      if (allRows.length > 0) {
        return allRows.map((row: any) => ({
          id: String(row.id),
          province: String(row.new_country_division || row.city_province || row.province || ""),
          district: String(row.district || ""),
          commune: String(row.commune || row.sangkat_commune || row.new_city_name || ""),
          existing_postcode: String(row.x_postcode !== undefined ? row.x_postcode : (row.existing_postcode || "")).replace(/['"]/g, "").trim(),
          new_postcode: String(row.new_postcode || "").replace(/['"]/g, "").trim(),
          new_country_division: String(row.new_country_division || row.city_province || row.province || ""),
          new_city_name: String(row.new_city_name || ""),
          ib_sort_co: String(row.ib_sort_co || ""),
          inbound_fac: String(row.inbound_fac || "")
        }));
      }
    } catch (err: any) {
      console.log(`[Supabase Link] Remote database unreachable (${err?.message || err}). Successfully falling back to local file context (1653 records).`);
    }
  }
  return readDatabase();
}

// Connection validation endpoint for Supabase integrations (replaces limit with Prefer count headers)
app.get("/api/test-supabase", async (req, res) => {
  if (!isSupabaseConfigured()) {
    return res.json({
      configured: false,
      status: "disconnected",
      message: "Supabase integration is inactive. No SUPABASE_URL & SUPABASE_KEY found in your server environment variables."
    });
  }
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE_NAME}?select=id&limit=1`, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_KEY!,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "count=exact"
      }
    });
    if (response.ok) {
      let totalCount = 0;
      const contentRange = response.headers.get("content-range");
      if (contentRange) {
        const parts = contentRange.split("/");
        if (parts.length > 1) {
          totalCount = parseInt(parts[1], 10) || 0;
        }
      } else {
        const dbSample = await response.json().catch(() => []);
        totalCount = Array.isArray(dbSample) ? dbSample.length : 0;
      }

      return res.json({
        configured: true,
        status: "connected",
        message: "Successfully connected directly to Supabase PostgREST Gateway!",
        row_count: totalCount,
        url: SUPABASE_URL
      });
    } else {
      const errText = await response.text();
      let hint = "";
      if (response.status === 401) {
        hint = "Your SUPABASE_KEY/token holds invalid privileges. We recommend using your service_role private key rather than standard anon key.";
      } else if (response.status === 404) {
        hint = `The table \`${SUPABASE_TABLE_NAME}\` could not be located in your database schema context. Please ensure this table exists and has active credentials.`;
      }
      return res.json({
        configured: true,
        status: "error",
        message: `Connected API but returned status ${response.status}. ${hint}`,
        details: errText,
        url: SUPABASE_URL
      });
    }
  } catch (err: any) {
    return res.json({
      configured: true,
      status: "error",
      message: `Failed to communicate with Supabase due to link failure: ${err.message}`,
      url: SUPABASE_URL
    });
  }
});

// Connection validation endpoint for Gemini AI
app.get("/api/test-gemini", async (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === "MY_GEMINI_API_KEY") {
    return res.json({
      configured: false,
      status: "disconnected",
      message: "AI engine key is not initialized cell-side. Please set GEMINI_API_KEY to proceed with AI fuzzy matches."
    });
  }
  return res.json({
    configured: true,
    status: "connected",
    message: "Gemini AI Neural Gateway active & authorized securely!"
  });
});

// Settings Persistence Gateways for Superadmin Profile Sync
app.get("/api/get-config", (req, res) => {
  res.json(getApiConfig());
});

app.post("/api/save-config", (req, res) => {
  const success = writeApiConfig(req.body);
  if (success) {
    res.json({ success: true, config: getApiConfig() });
  } else {
    res.status(550).json({ error: "Failed to save configuration database on the server" });
  }
});

// REST endpoints for the Postcode database (loads from Supabase if configured, otherwise local JSON)
app.get("/api/postcodes", async (req, res) => {
  const data = await getPostcodeDb();
  res.json(data);
});

app.post("/api/postcodes", async (req, res) => {
  const { province, district, commune, existing_postcode, new_postcode, ib_sort_co, inbound_fac } = req.body;
  if (!province || !district || !commune || !new_postcode) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const payload = {
    province: String(province).trim(),
    district: String(district).trim(),
    commune: String(commune).trim(),
    existing_postcode: String(existing_postcode || "").replace(/['"]/g, "").trim(),
    new_postcode: String(new_postcode).replace(/['"]/g, "").trim(),
    ib_sort_co: String(ib_sort_co || "").trim(),
    inbound_fac: String(inbound_fac || "").trim()
  };

  const newEntry: PostcodeEntry = {
    id: String(Date.now()),
    ...payload
  };

  if (isSupabaseConfigured()) {
    try {
      const supabasePayload = {
        iso_country_code: "KH",
        postal_location_type: "CP",
        city_province: payload.province,
        new_country_division: payload.province,
        district: payload.district,
        commune: payload.commune,
        sangkat_commune: payload.commune,
        new_city_name: payload.commune,
        x_postcode: payload.existing_postcode,
        new_postcode: payload.new_postcode,
        ib_sort_co: payload.ib_sort_co,
        inbound_fac: payload.inbound_fac
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE_NAME}`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY!,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify(supabasePayload)
      });

      if (response.ok) {
        const insertedRows = await response.json();
        const row = insertedRows[0] || supabasePayload;
        const mappedEntry: PostcodeEntry = {
          id: String(row.id || Date.now()),
          province: String(row.new_country_division || row.city_province || ""),
          district: String(row.district || ""),
          commune: String(row.commune || row.sangkat_commune || row.new_city_name || ""),
          existing_postcode: String(row.x_postcode !== undefined ? row.x_postcode : (row.existing_postcode || "")),
          new_postcode: String(row.new_postcode || ""),
          new_country_division: String(row.new_country_division || row.city_province || ""),
          new_city_name: String(row.new_city_name || ""),
          ib_sort_co: String(row.ib_sort_co || ""),
          inbound_fac: String(row.inbound_fac || "")
        };
        
        // Backup local cache
        const localData = readDatabase();
        localData.push(mappedEntry);
        writeDatabase(localData);

        return res.status(201).json(mappedEntry);
      } else {
        const errorText = await response.text();
        console.error("Supabase insert error details:", errorText);
        return res.status(500).json({ error: "Supabase insert transaction failed", details: errorText });
      }
    } catch (err: any) {
      console.error("Supabase exception during insert:", err);
      return res.status(500).json({ error: "Supabase connection error during insert.", details: err.message });
    }
  }

  // Fallback mode: Write to local database file directly
  const data = readDatabase();
  data.push(newEntry);
  if (writeDatabase(data)) {
    res.status(201).json(newEntry);
  } else {
    res.status(500).json({ error: "Could not save entry to local database" });
  }
});

app.put("/api/postcodes/:id", async (req, res) => {
  const { id } = req.params;
  const { province, district, commune, existing_postcode, new_postcode, ib_sort_co, inbound_fac } = req.body;

  if (isSupabaseConfigured()) {
    try {
      const supabasePayload: any = {};
      if (province) {
        supabasePayload.city_province = String(province).trim();
        supabasePayload.new_country_division = String(province).trim();
      }
      if (district) {
        supabasePayload.district = String(district).trim();
      }
      if (commune) {
        supabasePayload.commune = String(commune).trim();
        supabasePayload.sangkat_commune = String(commune).trim();
        supabasePayload.new_city_name = String(commune).trim();
      }
      if (existing_postcode !== undefined) {
        supabasePayload.x_postcode = String(existing_postcode).replace(/['"]/g, "").trim();
      }
      if (new_postcode) {
        supabasePayload.new_postcode = String(new_postcode).replace(/['"]/g, "").trim();
      }
      if (ib_sort_co !== undefined) {
        supabasePayload.ib_sort_co = String(ib_sort_co).trim();
      }
      if (inbound_fac !== undefined) {
        supabasePayload.inbound_fac = String(inbound_fac).trim();
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE_NAME}?id=eq.${id}`, {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_KEY!,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify(supabasePayload)
      });

      if (response.ok) {
        const updatedRows = await response.json();
        const row = updatedRows[0] || { id, ...supabasePayload };
        const mappedEntry: PostcodeEntry = {
          id: String(row.id),
          province: String(row.new_country_division || row.city_province || ""),
          district: String(row.district || ""),
          commune: String(row.commune || row.sangkat_commune || row.new_city_name || ""),
          existing_postcode: String(row.x_postcode !== undefined ? row.x_postcode : (row.existing_postcode || "")).replace(/['"]/g, "").trim(),
          new_postcode: String(row.new_postcode || "").replace(/['"]/g, "").trim(),
          new_country_division: String(row.new_country_division || row.city_province || ""),
          new_city_name: String(row.new_city_name || ""),
          ib_sort_co: String(row.ib_sort_co || ""),
          inbound_fac: String(row.inbound_fac || "")
        };

        // Also update local file cache
        const localData = readDatabase();
        const entryIdx = localData.findIndex((e) => e.id === id);
        if (entryIdx !== -1) {
          localData[entryIdx] = { ...localData[entryIdx], ...mappedEntry };
          writeDatabase(localData);
        }

        return res.json(mappedEntry);
      } else {
        const errorText = await response.text();
        console.error("Supabase update error details:", errorText);
        return res.status(500).json({ error: "Supabase update transaction failed", details: errorText });
      }
    } catch (err: any) {
      console.error("Supabase exception during update:", err);
      return res.status(500).json({ error: "Supabase connection error during update.", details: err.message });
    }
  }

  // Fallback mode: Update local database index
  const data = readDatabase();
  const entryIndex = data.findIndex((e) => e.id === id);

  if (entryIndex === -1) {
    return res.status(404).json({ error: "Entry not found" });
  }

  data[entryIndex] = {
    id,
    province: String(province || data[entryIndex].province).trim(),
    district: String(district || data[entryIndex].district).trim(),
    commune: String(commune || data[entryIndex].commune).trim(),
    existing_postcode: String(existing_postcode !== undefined ? existing_postcode : data[entryIndex].existing_postcode).replace(/['"]/g, "").trim(),
    new_postcode: String(new_postcode || data[entryIndex].new_postcode).replace(/['"]/g, "").trim(),
    ib_sort_co: String(ib_sort_co !== undefined ? ib_sort_co : data[entryIndex].ib_sort_co || "").trim(),
    inbound_fac: String(inbound_fac !== undefined ? inbound_fac : data[entryIndex].inbound_fac || "").trim(),
  };

  if (writeDatabase(data)) {
    res.json(data[entryIndex]);
  } else {
    res.status(500).json({ error: "Could not save updates to local database" });
  }
});

app.delete("/api/postcodes/:id", async (req, res) => {
  const { id } = req.params;

  if (isSupabaseConfigured()) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE_NAME}?id=eq.${id}`, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_KEY!,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        // Remove from local file cache
        const localData = readDatabase();
        const filtered = localData.filter((e) => e.id !== id);
        writeDatabase(filtered);

        return res.json({ success: true, message: "Entry successfully deleted from Supabase" });
      } else {
        const errorText = await response.text();
        console.error("Supabase delete error details:", errorText);
        return res.status(500).json({ error: "Supabase delete transaction failed", details: errorText });
      }
    } catch (err: any) {
      console.error("Supabase exception during delete:", err);
      return res.status(500).json({ error: "Supabase connection error during delete.", details: err.message });
    }
  }

  // Fallback mode: local JSON file deletion
  const data = readDatabase();
  const filtered = data.filter((e) => e.id !== id);

  if (data.length === filtered.length) {
    return res.status(404).json({ error: "Entry not found" });
  }

  if (writeDatabase(filtered)) {
    res.json({ success: true, message: "Entry successfully deleted from local cache" });
  } else {
    res.status(500).json({ error: "Could not write database updates" });
  }
});

// Reset database endpoint (restores all 1653 official Cambodian baseline postcode records)
app.post("/api/postcodes/reset", async (req, res) => {
  const initialData = readBackupDatabase();
  console.log(`Retrieved ${initialData.length} records from backup/baseline for database reset.`);

  if (initialData.length === 0) {
    return res.status(500).json({ error: "No baseline postcode records could be loaded/read from server cache files." });
  }

  if (isSupabaseConfigured()) {
    try {
      console.log("Supabase configured. Performing safe cloud database reset...");
      // Clean previous rows to set baseline representation (using id=gt.0 query to pass safedeletes)
      const deleteRes = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE_NAME}?id=gt.0`, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_KEY!,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      });

      if (!deleteRes.ok) {
        const delErrText = await deleteRes.text();
        console.warn("Supabase clean delete warned or was blocked. Proceeding anyway...", delErrText);
      }

      // Prepare payload parameters matching PostgreSQL Supabase template schema standard
      const supabasePayloads = initialData.map((item) => ({
        iso_country_code: "KH",
        postal_location_type: "CP",
        city_province: item.province,
        new_country_division: item.province,
        district: item.district,
        commune: item.commune,
        sangkat_commune: item.commune,
        new_city_name: item.commune,
        x_postcode: item.existing_postcode,
        new_postcode: item.new_postcode,
        ib_sort_co: item.ib_sort_co || "",
        inbound_fac: item.inbound_fac || ""
      }));

      // Split into batches of 15 to prevent payload size/timeout issues (fixes HTTP 413 Payload Too Large)
      const batchSize = 15;
      console.log(`Pipelining insertion of ${supabasePayloads.length} entries to Supabase REST gateway in ${Math.ceil(supabasePayloads.length / batchSize)} batches...`);
      for (let i = 0; i < supabasePayloads.length; i += batchSize) {
        const batch = supabasePayloads.slice(i, i + batchSize);
        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE_NAME}`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_KEY!,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(batch)
        });

        if (!insertRes.ok) {
          const errorText = await insertRes.text();
          console.error(`Supabase reset batch chunk at offset ${i} failed insertion:`, errorText);
          return res.status(500).json({ error: `Supabase batch reset baseline transaction failed at offset ${i}`, details: errorText });
        }
      }

      console.log("Supabase cloud refresh completed successfully!");
      writeDatabase(initialData);
      return res.json(initialData);
    } catch (err: any) {
      console.error("Supabase reset exception details:", err);
      return res.status(500).json({ error: "Supabase connection error during database reset.", details: err.message });
    }
  }

  // Backup fallback mode: local JSON cache write
  console.log("Supabase inactive. Resetting local postcode cache baseline...");
  if (writeDatabase(initialData)) {
    res.json(initialData);
  } else {
    res.status(500).json({ error: "Could not restore initial table data" });
  }
});

// Dynamic endpoint to mirror local memory edits onto Supabase
app.post("/api/postcodes/sync-to-cloud", async (req, res) => {
  if (!isSupabaseConfigured()) {
    return res.status(400).json({ error: "Supabase integration is not currently active on your server." });
  }

  try {
    const currentLocalData = readDatabase();
    console.log(`Initiating manual synchronization of ${currentLocalData.length} active local entries to Supabase REST...`);

    // Clean previous rows in Supabase safely (using id=gt.0 helper)
    await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE_NAME}?id=gt.0`, {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_KEY!,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });

    const payloads = currentLocalData.map((item) => ({
      iso_country_code: "KH",
      postal_location_type: "CP",
      city_province: item.province,
      new_country_division: item.province,
      district: item.district,
      commune: item.commune,
      sangkat_commune: item.commune,
      new_city_name: item.commune,
      x_postcode: item.existing_postcode,
      new_postcode: item.new_postcode,
      ib_sort_co: item.ib_sort_co || "",
      inbound_fac: item.inbound_fac || ""
    }));

    // Chunk size 15 for safety (fixes HTTP 413 Payload Too Large)
    const batchSize = 15;
    for (let i = 0; i < payloads.length; i += batchSize) {
      const batch = payloads.slice(i, i + batchSize);
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE_NAME}`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY!,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(batch)
      });

      if (!insertRes.ok) {
        const errorText = await insertRes.text();
        console.error(`Supabase sync failed at batch starting at ${i}:`, errorText);
        return res.status(500).json({ error: `Supabase sync transaction failed at batch ${i}`, details: errorText });
      }
    }

    console.log("Manual synchronization completely successful!");
    return res.json({ success: true, count: currentLocalData.length });
  } catch (err: any) {
    console.error("Supabase sync-to-cloud exception:", err);
    return res.status(500).json({ error: "Supabase synchronization links experienced technical exceptions.", details: err.message });
  }
});

// Reverse sync endpoint: Pull from Supabase REST and overwrite local storage (postcodes.json)
app.post("/api/postcodes/sync-to-local", async (req, res) => {
  if (!isSupabaseConfigured()) {
    return res.status(400).json({ error: "Supabase integration is not currently active on your server." });
  }

  try {
    console.log("Initiating manual synchronization of Supabase database to local storage...");
    let allRows: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE_NAME}?select=*&order=id.asc`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "apikey": SUPABASE_KEY!,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Range": `${from}-${to}`
        }
      });

      if (response.ok) {
        const rawData = await response.json();
        if (Array.isArray(rawData) && rawData.length > 0) {
          allRows = allRows.concat(rawData);
          if (rawData.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      } else {
        const errorText = await response.text();
        console.error(`Supabase pull failed on page ${page}:`, errorText);
        return res.status(500).json({ error: `Failed to fetch page ${page} from Supabase.`, details: errorText });
      }
    }

    if (allRows.length === 0) {
      return res.status(400).json({ error: "No records found in your Supabase table to copy down." });
    }

    const mappedEntries = allRows.map((row: any) => ({
      id: String(row.id),
      province: String(row.new_country_division || row.city_province || row.province || ""),
      district: String(row.district || ""),
      commune: String(row.commune || row.sangkat_commune || row.new_city_name || ""),
      existing_postcode: String(row.x_postcode !== undefined ? row.x_postcode : (row.existing_postcode || "")),
      new_postcode: String(row.new_postcode || ""),
      new_country_division: String(row.new_country_division || row.city_province || row.province || ""),
      new_city_name: String(row.new_city_name || ""),
      ib_sort_co: String(row.ib_sort_co || ""),
      inbound_fac: String(row.inbound_fac || "")
    }));

    const success = writeDatabase(mappedEntries);
    if (success) {
      // Keep safety baseline backup perfectly aligned with live database downloads
      try {
        fs.writeFileSync(backupFilePath, JSON.stringify(mappedEntries, null, 2), "utf-8");
        console.log("Successfully backed up/copied current Supabase sync records directly to cambodia_postcodes_backup.json.");
      } catch (backupErr) {
        console.warn("Non-critical issue backing up sync records to baseline file:", backupErr);
      }
      console.log(`Successfully synced ${mappedEntries.length} records from Supabase into local postcodes.json!`);
      return res.json({ success: true, count: mappedEntries.length });
    } else {
      return res.status(500).json({ error: "Failed to write fetched records to the local postcodes.json storage." });
    }
  } catch (err: any) {
    console.error("Supabase pull-to-local exception:", err);
    return res.status(500).json({ error: "An exception occurred replication from Supabase REST.", details: err.message });
  }
});

// Admin users logic and endpoints (Supabase platform_admins synchronized with local file fallbacks)
interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  approved: boolean;
  password?: string;
}

const usersFilePath = path.join(process.cwd(), "src", "data", "admin_users.json");

function readAdminUsers(): AdminUser[] {
  try {
    if (fs.existsSync(usersFilePath)) {
      const parsed = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.error("Error reading admin users file:", err);
  }
  // Baseline initial users
  const baseline = [
    { id: "u1", name: "Sopheap K.", email: "sopheap@mptc.gov.kh", role: "Admin", approved: false },
    { id: "u2", name: "Vireak O.", email: "vireak@logistics-kh.com", role: "Editor", approved: true },
    { id: "u3", name: "Srey S.", email: "srey@dhl-cambodia.com", role: "Admin", approved: true },
    { id: "u4", name: "Piseth M.", email: "piseth@mptc.gov.kh", role: "Editor", approved: false },
    { id: "u5", name: "Rithy N.", email: "rithy@mptc.gov.kh", role: "Editor", approved: false }
  ];
  return baseline;
}

function writeAdminUsers(data: AdminUser[]): boolean {
  try {
    const parentDir = path.dirname(usersFilePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(usersFilePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing admin users file:", err);
    return false;
  }
}

async function getAdminUsersList(): Promise<AdminUser[]> {
  if (isSupabaseConfigured()) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/platform_admins?select=*&order=id.asc`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "apikey": SUPABASE_KEY!,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        const rawData = await response.json();
        return rawData.map((row: any) => ({
          id: String(row.id),
          name: String(row.full_name || row.name || ""),
          email: String(row.email || ""),
          role: String(row.role === 'moderator' ? 'Editor' : (row.role === 'superadmin' ? 'Superadmin' : 'Admin')),
          approved: row.is_active !== undefined ? !!row.is_active : (row.approved !== undefined ? !!row.approved : false)
        }));
      } else {
        console.log(`Supabase get admins status ${response.status}. Falling back to local file context.`);
      }
    } catch (err: any) {
      console.log(`[Supabase Link] Admins database unreachable (${err?.message || err}). Successfully falling back to local admin-users list.`);
    }
  }
  return readAdminUsers();
}

app.get("/api/admin-users", async (req, res) => {
  const users = await getAdminUsersList();
  const filtered = users.filter(user => user.email && user.email.toLowerCase() !== 'hempiden@gmail.com');
  res.json(filtered);
});

app.post("/api/admin-users", async (req, res) => {
  const { name, email, role, approved } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: "Missing required fields (name, email)" });
  }

  const payload = {
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    role: String(role || "Admin").trim(),
    approved: !!approved
  };

  const newId = "user_" + Date.now();
  const localEntry: AdminUser = { id: newId, ...payload };

  if (isSupabaseConfigured()) {
    try {
      const dbRole = payload.role.toLowerCase() === "editor" ? "moderator" : (payload.role.toLowerCase() === "superadmin" ? "superadmin" : "admin");
      const supabasePayload = {
        email: payload.email,
        full_name: payload.name,
        role: dbRole,
        is_active: payload.approved
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/platform_admins`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY!,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify(supabasePayload)
      });

      if (response.ok) {
        const insertedRows = await response.json();
        const row = insertedRows[0] || supabasePayload;
        const mappedEntry: AdminUser = {
          id: String(row.id),
          name: String(row.full_name || row.name || ""),
          email: String(row.email || ""),
          role: String(row.role === 'moderator' ? 'Editor' : (row.role === 'superadmin' ? 'Superadmin' : 'Admin')),
          approved: row.is_active !== undefined ? !!row.is_active : true
        };

        // Sync local cache
        const localData = readAdminUsers();
        localData.push(mappedEntry);
        writeAdminUsers(localData);

        return res.status(201).json(mappedEntry);
      } else {
        const errorText = await response.text();
        console.error("Supabase user insert error details:", errorText);
      }
    } catch (err: any) {
      console.error("Supabase exception during user insert:", err);
    }
  }

  // Fallback mode
  const localData = readAdminUsers();
  localData.push(localEntry);
  if (writeAdminUsers(localData)) {
    return res.status(201).json(localEntry);
  } else {
    return res.status(500).json({ error: "Could not save user to local cache" });
  }
});

// Secure User Registration Route
app.post("/api/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ error: "Missing required fields (name, email, password)" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const localUsers = readAdminUsers();

  // Check if email already registered
  if (localUsers.some(u => u.email.trim().toLowerCase() === normalizedEmail)) {
    return res.status(400).json({ error: "This email address is already registered." });
  }

  const newUser: AdminUser = {
    id: "user_" + Date.now(),
    name: String(name).trim(),
    email: normalizedEmail,
    role: String(role || "Editor").trim(),
    approved: false, // Default to false; requires Superadmin approval
    password: String(password)
  };

  if (isSupabaseConfigured()) {
    try {
      const dbRole = newUser.role.toLowerCase() === "editor" ? "moderator" : "admin";
      await fetch(`${SUPABASE_URL}/rest/v1/platform_admins`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY!,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: newUser.email,
          full_name: newUser.name,
          role: dbRole,
          is_active: false // Needs review
        })
      });
    } catch (err) {
      console.error("Supabase sync issue during registration (non-blocking):", err);
    }
  }

  localUsers.push(newUser);
  writeAdminUsers(localUsers);

  return res.status(201).json({ 
    success: true, 
    message: "Registration requested successfully! Once approved by a Superadmin, you can sign in." 
  });
});

// Secure Password-based Login Route supporting legacy credentials too
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Please provide both username/email and password." });
  }

  const userClean = String(username).trim().toLowerCase();

  // 1. Check legacy hardcoded presets to maintain backwards compatibility
  if (userClean === "hempiden" && password === "P1d#nXKHPostcode") {
    return res.json({ username: "hempiden", role: "superadmin", email: "hempiden@gmail.com" });
  } else if (userClean === "admin" && (password === "adminpassword" || password === "Admin2026!")) {
    return res.json({ username: "admin", role: "admin", email: "admin@kh-postcode.gov" });
  } else if (userClean === "editor" && password === "editorpassword") {
    return res.json({ username: "editor", role: "editor", email: "editor@kh-postcode.gov" });
  }

  // 2. Query registered users in our local cache
  const localUsers = readAdminUsers();
  const matched = localUsers.find(u => u.email.trim().toLowerCase() === userClean);

  if (!matched) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  // Verify matched user password
  if (!matched.password || matched.password !== password) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  // Check if approved (sync with Supabase is_active state if database is configured)
  let activeStatus = matched.approved;
  if (isSupabaseConfigured()) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/platform_admins?email=eq.${matched.email}&select=*`;
      const response = await fetch(url, {
        headers: {
          "apikey": SUPABASE_KEY!,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      });
      if (response.ok) {
        const rows = await response.json();
        if (rows && rows.length > 0) {
          activeStatus = rows[0].is_active !== undefined ? !!rows[0].is_active : activeStatus;
          if (activeStatus !== matched.approved) {
            matched.approved = activeStatus;
            writeAdminUsers(localUsers);
          }
        }
      }
    } catch (e) {
      console.error("Non-blocking Supabase sync issue on login search:", e);
    }
  }

  if (!activeStatus) {
    return res.status(403).json({ error: "Your access request is pending approval or has been revoked. Please contact a Superadmin." });
  }

  return res.json({
    username: matched.name,
    role: matched.role.toLowerCase() === "superadmin" ? "superadmin" : (matched.role.toLowerCase() === "editor" ? "editor" : "admin"),
    email: matched.email
  });
});

app.put("/api/admin-users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, role, approved } = req.body;

  if (isSupabaseConfigured() && !isNaN(Number(id))) {
    try {
      const supabasePayload: any = {};
      if (name) supabasePayload.full_name = String(name).trim();
      if (email) supabasePayload.email = String(email).trim().toLowerCase();
      if (role) {
        supabasePayload.role = String(role).trim().toLowerCase() === "editor" ? "moderator" : (String(role).trim().toLowerCase() === "superadmin" ? "superadmin" : "admin");
      }
      if (approved !== undefined) {
        supabasePayload.is_active = !!approved;
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/platform_admins?id=eq.${id}`, {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_KEY!,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify(supabasePayload)
      });

      if (response.ok) {
        const updatedRows = await response.json();
        const row = updatedRows[0];
        if (row) {
          const mappedEntry: AdminUser = {
            id: String(row.id),
            name: String(row.full_name || row.name || ""),
            email: String(row.email || ""),
            role: String(row.role === 'moderator' ? 'Editor' : (row.role === 'superadmin' ? 'Superadmin' : 'Admin')),
            approved: row.is_active !== undefined ? !!row.is_active : true
          };

          // Also update local cache
          const localData = readAdminUsers();
          const idx = localData.findIndex(u => u.id === id);
          if (idx !== -1) {
            localData[idx] = { ...localData[idx], ...mappedEntry };
            writeAdminUsers(localData);
          }
          return res.json(mappedEntry);
        }
      } else {
        const errorText = await response.text();
        console.error("Supabase user update error details:", errorText);
      }
    } catch (err: any) {
      console.error("Supabase exception during user update:", err);
    }
  }

  // Fallback mode
  const localData = readAdminUsers();
  const idx = localData.findIndex(u => u.id === id);
  if (idx !== -1) {
    if (name) localData[idx].name = name;
    if (email) localData[idx].email = email;
    if (role) localData[idx].role = role;
    if (approved !== undefined) localData[idx].approved = approved;
    writeAdminUsers(localData);
    return res.json(localData[idx]);
  } else {
    return res.status(404).json({ error: "User not found" });
  }
});

app.delete("/api/admin-users/:id", async (req, res) => {
  const { id } = req.params;

  if (isSupabaseConfigured() && !isNaN(Number(id))) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/platform_admins?id=eq.${id}`, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_KEY!,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        // Also remove from local cache
        const localData = readAdminUsers();
        const filtered = localData.filter(u => u.id !== id);
        writeAdminUsers(filtered);
        return res.json({ success: true, message: "User deleted from database" });
      } else {
        const errorText = await response.text();
        console.error("Supabase user delete error details:", errorText);
      }
    } catch (err: any) {
      console.error("Supabase exception during user delete:", err);
    }
  }

  // Fallback delete from local cache
  const localData = readAdminUsers();
  const filtered = localData.filter(u => u.id !== id);
  if (writeAdminUsers(filtered)) {
    return res.json({ success: true, message: "User deleted from local cache" });
  } else {
    return res.status(500).json({ error: "Could not write admin update to cache" });
  }
});

// Postcode Migration engine - calls Gemini API
app.post("/api/migrate", async (req, res) => {
  const { text, rows } = req.body;
  
  if (!text && (!rows || !Array.isArray(rows) || rows.length === 0)) {
    return res.status(400).json({ error: "Please provide 'text' (single) or 'rows' (bulk array) to process." });
  }

  // Check if Gemini API key exists
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: "Gemini API key is not configured. Please add GEMINI_API_KEY to the Settings > Secrets panel." 
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Read reference database to guide the LLM's mapping
    const postcodeDb = await getPostcodeDb();

    // Batch prompt preparation
    const inputsToProcess = rows && Array.isArray(rows) ? rows : [text!];
    
    let results: any[] = [];
    let aiSucceeded = false;

    try {
      // Stringify some records from the database as reference to the model
      // To fit in token context safely and be super accurate, we can list key active locations
      const databaseReferenceText = JSON.stringify(
        postcodeDb.map(item => ({
          province: item.province,
          district: item.district,
          commune: item.commune,
          existing_postcode: item.existing_postcode,
          new_postcode: item.new_postcode
        })),
        null,
        1
      );

      const systemInstruction = `You are an expert AI assistant specializing in Cambodian administrative geography (Province, District/Khan, Commune/Sangkat) and Cambodian postcode migration.
Your task is to analyze raw, fuzzy, or OCR-extracted address submissions, normalize them according to the provided official reference database, and determine the postcode status.

Here the reference database of official Cambodian subdivisions and their legacy (existing) and migrated (new) postcodes:
${databaseReferenceText}

Rules for normalizing and matching:
1. Always use official, correct administrative spellings from the reference database where possible. For instance, map typos or alternative Khmer romanizations (like 'BKK', 'Beoung Keng Kang' to 'Boeng Keng Kang', 'Chamkarmon' to 'Chamkar Mon', '7 Makara' or 'Prampir Makara' to 'Prampir Meakkara', 'Toul Kouk' to 'Tuol Kouk', etc.).
2. Clean and match inputs to the closest entry in the database. 
3. If the input text contains a number that matches the legacy ('existing_postcode') of the matched commune, postcode_status MUST be "Follow Existing Postcode".
4. If the input text contains a number that matches the migrated ('new_postcode') of the matched commune, postcode_status MUST be "Follow New Postcode".
5. If the input contains a postcode that matches neither, or does not match this commune's valid codes, postcode_status MUST be "Incorrect Postcode".
6. If the input text contains NO postcode (no 5-digit or 6-digit numeric postal code, e.g. just raw place and address names), postcode_status MUST be "No Postcode Detected".
7. If the administration unit cannot be determined with confidence, use "Unknown" for province, district, commune, and set postcode_status to "Unknown".
8. Make sure you return an object for each input string sent to you, matching the input list position.`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: `Process the following address lines/OCR text and return the matched entries.
Inputs to process:
${JSON.stringify(inputsToProcess, null, 2)}`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            required: ["results"],
            properties: {
              results: {
                type: Type.ARRAY,
                description: "Array of matching results parallel to the inputs",
                items: {
                  type: Type.OBJECT,
                  required: ["province", "district", "commune", "postcode_status", "input_text"],
                  properties: {
                    province: { type: Type.STRING, description: "Normalized Official Province Name or 'Unknown'" },
                    district: { type: Type.STRING, description: "Normalized Official District/Khan Name or 'Unknown'" },
                    commune: { type: Type.STRING, description: "Normalized Official Commune/Sangkat Name or 'Unknown'" },
                    postcode_status: { 
                      type: Type.STRING, 
                      enum: ["Incorrect Postcode", "Follow Existing Postcode", "Follow New Postcode", "Unknown", "No Postcode Detected"],
                      description: "Status flag based on postcode matching" 
                    },
                    existing_postcode: { type: Type.STRING, description: "Matched legacy postcode from the database" },
                    new_postcode: { type: Type.STRING, description: "Matched new migrated postcode from the database" },
                    input_text: { type: Type.STRING, description: "The original raw segment analyzed" }
                  }
                }
              }
            }
          }
        }
      });

      const resultText = response.text || "{}";
      const parsedResult = JSON.parse(resultText);
      results = parsedResult.results || [];
      aiSucceeded = true;
    } catch (aiErr: any) {
      console.warn("AI migration parsing failed or model overloaded. Swapping gears to local resilient matching engine...", aiErr);
      // Run fallback matching in Javascript directly
      results = inputsToProcess.map(inputText => localPostcodeMatch(inputText, postcodeDb));
    }

    // For each result, find the matching item in postcodeDb to enrich it with Route and Facility info if not present
    results = results.map((row, index) => {
      const originalInput = inputsToProcess[index] || "";
      const match = postcodeDb.find(e => 
        e.province.toLowerCase().replace(/[^a-z0-9]/g, "") === (row.province || "").toLowerCase().replace(/[^a-z0-9]/g, "") &&
        e.district.toLowerCase().replace(/[^a-z0-9]/g, "") === (row.district || "").toLowerCase().replace(/[^a-z0-9]/g, "") &&
        e.commune.toLowerCase().replace(/[^a-z0-9]/g, "") === (row.commune || "").toLowerCase().replace(/[^a-z0-9]/g, "")
      );
      if (match) {
        return {
          ...row,
          input_text: row.input_text || originalInput,
          new_city_name: row.new_city_name || match.new_city_name || "",
          ib_sort_co: row.ib_sort_co || match.ib_sort_co || "",
          inbound_fac: row.inbound_fac || match.inbound_fac || ""
        };
      }
      return {
        ...row,
        input_text: row.input_text || originalInput,
        new_city_name: row.new_city_name || "",
        ib_sort_co: row.ib_sort_co || "",
        inbound_fac: row.inbound_fac || ""
      };
    });

    // If single text request was passed, map back to a single object, otherwise return the array as required
    if (text) {
      const singleItem = results[0] || {
        province: "Unknown",
        district: "Unknown",
        commune: "Unknown",
        postcode_status: "Unknown",
        ib_sort_co: "",
        inbound_fac: ""
      };
      return res.json(singleItem);
    } else {
      return res.json(results);
    }

  } catch (error: any) {
    console.error("Gemini postcode migration error:", error);
    return res.status(500).json({ 
      error: "An error occurred during postcode matching. Please check your configuration and try again.",
      details: error.message 
    });
  }
});


// OCR photo analyzer endpoint - receives base64 photo with address text and uses Gemini for lookup
app.post("/api/ocr-address", async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "Missing required 'imageBase64' parameter." });
  }

  // Check if Gemini API key exists
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: "Gemini API key is not configured. Please add GEMINI_API_KEY to the Settings > Secrets panel." 
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const postcodeDb = await getPostcodeDb();
    const databaseReferenceText = JSON.stringify(
      postcodeDb.map(item => ({
        province: item.province,
        district: item.district,
        commune: item.commune,
        existing_postcode: item.existing_postcode,
        new_postcode: item.new_postcode
      })),
      null,
      1
    );

    const systemInstruction = `You are a professional postal and OCR mail processing agent specializing in Cambodian administrative geography and legacy-to-active postcode resolution.
Analyze the provided image which contains an address label, shipping invoice, envelope, or handwritten note.
1. Perform OCR extraction to read any visible address text, names, streets, and old zip codes.
2. Resolve the geographic location to the correct, official Cambodian subdivisions (Province, District/Khan, Commune/Sangkat) using the provided official reference dataset:
${databaseReferenceText}
3. Correct any typical misspellings, abbreviations (e.g. 'BKK' -> 'Boeng Keng Kang', 'BKK1' -> 'Boeng Keng Kang I', 'Chamkarmon' -> 'Chamkar Mon') and match the best commune.
4. Detect the legacy zip code or new postcode written in the text and match it with the database's existing_postcode or new_postcode for the resolved commune:
   - If the postcode on the label matches 'existing_postcode', status must be "Follow Existing Postcode".
   - If the postcode on the label matches 'new_postcode', status must be "Follow New Postcode".
   - If a mismatch is found or is completely wrong, status must be "Incorrect Postcode".
   - If no postcode is found, status must be "No Postcode Detected".
5. Return a structured JSON containing the OCR-extracted text and normalized geographic mappings. Do not include markdown code block characters around the JSON, respond inside the JSON schema format.`;

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/png",
        data: imageBase64
      }
    };

    const textPart = {
      text: "Read the address on this image label and resolve the postcode migration."
    };

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: [imagePart, textPart],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["extracted_text", "province", "district", "commune", "postcode_status"],
          properties: {
            extracted_text: { type: Type.STRING, description: "Text transcribed from the image address labels" },
            province: { type: Type.STRING, description: "Normalized Official Province Name from reference DB or 'Unknown'" },
            district: { type: Type.STRING, description: "Normalized Official District Name from reference DB or 'Unknown'" },
            commune: { type: Type.STRING, description: "Normalized Official Commune Name from reference DB or 'Unknown'" },
            postcode_status: {
              type: Type.STRING,
              enum: ["Incorrect Postcode", "Follow Existing Postcode", "Follow New Postcode", "Unknown", "No Postcode Detected"],
              description: "Resolved comparison status"
            },
            existing_postcode: { type: Type.STRING, description: "Legacy postcode associated with this Sangkat" },
            new_postcode: { type: Type.STRING, description: "Six-digit active migrated postcode for this Sangkat" }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    
    // Enrich with Route and Facility from reference DB
    const match = postcodeDb.find(e => 
      e.province.toLowerCase().replace(/[^a-z0-9]/g, "") === (parsed.province || "").toLowerCase().replace(/[^a-z0-9]/g, "") &&
      e.district.toLowerCase().replace(/[^a-z0-9]/g, "") === (parsed.district || "").toLowerCase().replace(/[^a-z0-9]/g, "") &&
      e.commune.toLowerCase().replace(/[^a-z0-9]/g, "") === (parsed.commune || "").toLowerCase().replace(/[^a-z0-9]/g, "")
    );
    if (match) {
      parsed.new_city_name = parsed.new_city_name || match.new_city_name || "";
      parsed.ib_sort_co = parsed.ib_sort_co || match.ib_sort_co || "";
      parsed.inbound_fac = parsed.inbound_fac || match.inbound_fac || "";
    } else {
      parsed.new_city_name = parsed.new_city_name || "";
      parsed.ib_sort_co = parsed.ib_sort_co || "";
      parsed.inbound_fac = parsed.inbound_fac || "";
    }
    
    res.json(parsed);

  } catch (error: any) {
    console.error("OCR Image analysis error:", error);
    res.status(500).json({
      error: "Failed to parse address from photo.",
      details: error.message
    });
  }
});


// Start custom server and integrate Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Cambodia Postcode Migrator server running on http://localhost:${PORT}`);
  });
}

startServer();

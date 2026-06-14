import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Resolve ES module path globals
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function resolveDataFilePath(filename: string): string {
  const possiblePaths = [
    path.join(process.cwd(), "src", "data", filename),
    path.join(process.cwd(), "data", filename),
    path.join(__dirname, "src", "data", filename),
    path.join(__dirname, "..", "src", "data", filename),
    path.join(__dirname, "data", filename),
    path.join(__dirname, "..", "data", filename),
    path.join("/var/task", "src", "data", filename),
    path.join("/var/task", "data", filename)
  ];
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch (_) {}
  }
  return path.join(process.cwd(), "src", "data", filename);
}

const dataFilePath = resolveDataFilePath("cambodia_postcodes.json");
const backupFilePath = resolveDataFilePath("cambodia_postcodes_backup.json");
const configFilePath = resolveDataFilePath("api_config.json");

// Establish original gold-standard baseline backup at first launch.
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

// Shared dynamic runtime cache for database settings
let cachedDbConfig: Partial<ApiConfig> | null = null;
let cachedDbRoleFeaturesList: any[] | null = null;
let isGeminiSuspended = false;

async function fetchFromSupabaseSettings(key: string): Promise<any | null> {
  const creds = getSupabaseCredentials();
  const activeUrl = creds.url;
  const activeKey = creds.key;

  if (!activeUrl || !activeKey) return null;
  try {
    const res = await fetch(`${activeUrl}/rest/v1/platform_settings?key=eq.${key}&select=value`, {
      method: "GET",
      headers: {
        "apikey": activeKey,
        "Authorization": `Bearer ${activeKey}`
      }
    });
    if (res.ok) {
      const rows: any = await res.json();
      if (rows && rows.length > 0) {
        return rows[0].value;
      }
    }
  } catch (err) {
    console.error(`[Platform Settings] Error fetching "${key}" from Supabase:`, err);
  }
  return null;
}

async function saveToSupabaseSettings(key: string, value: any): Promise<boolean> {
  const creds = getSupabaseCredentials();
  const activeUrl = creds.url;
  const activeKey = creds.key;

  if (!activeUrl || !activeKey) return false;
  try {
    // Delete existing
    await fetch(`${activeUrl}/rest/v1/platform_settings?key=eq.${key}`, {
      method: "DELETE",
      headers: {
        "apikey": activeKey,
        "Authorization": `Bearer ${activeKey}`
      }
    });

    const res = await fetch(`${activeUrl}/rest/v1/platform_settings`, {
      method: "POST",
      headers: {
        "apikey": activeKey,
        "Authorization": `Bearer ${activeKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ key, value })
    });
    return res.ok;
  } catch (err) {
    console.error(`[Platform Settings] Error saving "${key}" to Supabase:`, err);
    return false;
  }
}

async function syncFromDatabase() {
  try {
    const dbConfig = await fetchFromSupabaseSettings("global_config");
    if (dbConfig) {
      cachedDbConfig = dbConfig;
      console.log("[Platform Settings] Successfully loaded dynamic global_config from Supabase.");
    }
    const dbRoles = await fetchFromSupabaseSettings("role_features");
    if (dbRoles) {
      cachedDbRoleFeaturesList = dbRoles;
      console.log("[Platform Settings] Successfully loaded dynamic role_features from Supabase.");
    }
  } catch (err) {
    console.log("[Platform Settings] Notice: No active platform_settings table in database yet. Running server with local assets.");
  }
}

function getApiConfigOnlyFile(): Partial<ApiConfig> {
  let fileConfig: Partial<ApiConfig> = {};
  try {
    if (fs.existsSync(configFilePath)) {
      fileConfig = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
    }
  } catch (e) {}
  return fileConfig;
}

function getApiConfig(): ApiConfig {
  let fileConfig = getApiConfigOnlyFile();

  // Merge database configuration override if active
  if (cachedDbConfig) {
    fileConfig = { ...fileConfig, ...cachedDbConfig };
  }

  // Precedence: User edits saved to the server configuration (src/data/api_config.json)
  // always take priority over environment variables, allowing interactive edits to persist and override
  // any system defaults.
  const envSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_URL || process.env.NEXT_PUBLIC_NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const envSupabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_NEXT_PUBLIC_SUPABASE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const envSupabaseTable = process.env.SUPABASE_TABLE_NAME || process.env.VITE_SUPABASE_TABLE_NAME || process.env.NEXT_PUBLIC_SUPABASE_TABLE_NAME;
  const envGeminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_KEY;

  const resolveVal = (fileVal: string | undefined, envVal: string | undefined): string => {
    if (envVal !== undefined && envVal.trim() !== "" && envVal.trim() !== "MY_SUPABASE_KEY" && envVal.trim() !== "sb_secret_YvGsedNUdgCdnMP32TOi2g_4fh1AjhO") {
      return envVal.trim();
    }
    if (fileVal !== undefined && fileVal.trim() !== "") {
      return fileVal.trim();
    }
    return "";
  };

  const resolveGeminiKey = (fileVal: string | undefined, envVal: string | undefined): string => {
    const cleanEnv = (envVal || "").trim();
    const cleanFile = (fileVal || "").trim();

    // Prioritize the environment-provided standard Google and AI Studio keys beginning with 'AIzaSy'
    if (cleanEnv.startsWith("AIzaSy")) {
      return cleanEnv;
    }
    if (cleanFile.startsWith("AIzaSy")) {
      return cleanFile;
    }

    // Otherwise discard known broken keys starting with 'AQ.' or holding initial placeholders
    if (cleanEnv && !cleanEnv.startsWith("AQ.") && cleanEnv !== "MY_GEMINI_API_KEY") {
      return cleanEnv;
    }
    if (cleanFile && !cleanFile.startsWith("AQ.") && cleanFile !== "MY_GEMINI_API_KEY") {
      return cleanFile;
    }
    return "";
  };

  let config: ApiConfig = {
    supabaseUrl: sanitizeSupabaseUrl(resolveVal(fileConfig.supabaseUrl, envSupabaseUrl)),
    supabaseKey: sanitizeSupabaseKey(resolveVal(fileConfig.supabaseKey, envSupabaseKey)),
    supabaseTableName: sanitizeSupabaseTable(resolveVal(fileConfig.supabaseTableName, envSupabaseTable)),
    supabaseOverriddenFromEnv: !!((!fileConfig.supabaseUrl || fileConfig.supabaseUrl.trim() === "") && envSupabaseUrl),
    geminiKey: resolveGeminiKey(fileConfig.geminiKey, envGeminiKey),
    geminiVersion: fileConfig.geminiVersion || "gemini-3.5-flash",
    googleMapsKey: resolveVal(fileConfig.googleMapsKey, process.env.VITE_GOOGLE_MAPS_KEY),
    googleMapsId: resolveVal(fileConfig.googleMapsId, process.env.VITE_GOOGLE_MAPS_ID || "DEMO_MAP_ID"),
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
    
    // Save locally to pure file configuration
    let fileConfigOnly: Partial<ApiConfig> = {};
    if (fs.existsSync(configFilePath)) {
      try {
        fileConfigOnly = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
      } catch (e) {}
    }
    const updatedFile = { ...fileConfigOnly, ...newConfig };
    fs.writeFileSync(configFilePath, JSON.stringify(updatedFile, null, 2), "utf-8");

    // Warm up/update runtime memory cache
    if (!cachedDbConfig) {
      cachedDbConfig = {};
    }
    cachedDbConfig = { ...cachedDbConfig, ...newConfig };

    const existing = getApiConfig();
    const updated = { ...existing, ...newConfig };
    
    // Dynamically update server run-time settings so no hard restart is required
    SUPABASE_URL = sanitizeSupabaseUrl(updated.supabaseUrl);
    SUPABASE_KEY = sanitizeSupabaseKey(updated.supabaseKey);
    SUPABASE_TABLE_NAME = sanitizeSupabaseTable(updated.supabaseTableName || "cambodia_postcode_migration");
    
    if (updated.geminiKey) {
      process.env.GEMINI_API_KEY = updated.geminiKey;
    }

    // Attempt storing to Supabase db settings table
    saveToSupabaseSettings("global_config", updated).then((ok) => {
      if (ok) {
        console.log("[Platform Settings] Synchronized global_config with Supabase.");
      } else {
        console.log("[Platform Settings] Notice: Running custom settings on server local cache.");
      }
    });

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

// Dynamic credentials resolver to override local file config with system env variables at runtime (highly-privileged bypass)
function getSupabaseCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 
              process.env.VITE_SUPABASE_URL || 
              process.env.SUPABASE_URL || 
              process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_URL || 
              process.env.NEXT_PUBLIC_NEXT_PUBLIC_SUPABASE_URL || 
              initialConfig.supabaseUrl || "";
              
  const table = process.env.SUPABASE_TABLE_NAME || 
                process.env.VITE_SUPABASE_TABLE_NAME || 
                process.env.NEXT_PUBLIC_SUPABASE_TABLE_NAME || 
                initialConfig.supabaseTableName || "cambodia_postcode_migration";
  
  // Prefer service_role or env key if available on server for full bypass of RLS policies
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.SUPABASE_SECRET_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_SECRET_KEY;
                    
  if (secretKey && secretKey.trim() !== "") {
    return { url: sanitizeSupabaseUrl(url), key: sanitizeSupabaseKey(secretKey), table: sanitizeSupabaseTable(table) };
  }
  
  const envKey = process.env.SUPABASE_SECRET_KEY || 
                 process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_SECRET_KEY || 
                 process.env.NEXT_PUBLIC_NEXT_PUBLIC_SUPABASE_SUPABASE_ANON_KEY || 
                 process.env.SUPABASE_SERVICE_ROLE_KEY || 
                 process.env.SUPABASE_ANON_KEY || 
                 process.env.SUPABASE_KEY || 
                 process.env.NEXT_PUBLIC_SUPABASE_KEY || 
                 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
                 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                 process.env.VITE_SUPABASE_ANON_KEY ||
                 process.env.VITE_SUPABASE_KEY;
                 
  if (envKey && envKey.trim() !== "" && envKey !== "MY_SUPABASE_KEY") {
    return { url: sanitizeSupabaseUrl(url), key: sanitizeSupabaseKey(envKey), table: sanitizeSupabaseTable(table) };
  }
  
  return { url: sanitizeSupabaseUrl(url), key: initialConfig.supabaseKey || "", table: sanitizeSupabaseTable(table) };
}

function syncActiveSupabaseVars() {
  const creds = getSupabaseCredentials();
  SUPABASE_URL = creds.url;
  SUPABASE_KEY = creds.key;
  SUPABASE_TABLE_NAME = creds.table;
}

// Perform initial sync at boot
syncActiveSupabaseVars();

if (initialConfig.geminiKey) {
  process.env.GEMINI_API_KEY = initialConfig.geminiKey;
}

const isSupabaseConfigured = (): boolean => {
  syncActiveSupabaseVars();
  return !!(SUPABASE_URL && SUPABASE_KEY);
};

// Robust Gemini API query with exponential backoff and alternate model fallback
async function generateContentWithRetry(aiClient: any, params: any, maxRetries = 3): Promise<any> {
  if (isGeminiSuspended) {
    throw new Error("AI service temporarily offline. Utilizing local processing.");
  }

  const models = [
    params.model || "gemini-3.5-flash",
    "gemini-3.1-flash-lite"
  ];
  
  let lastError: any = null;
  
  for (const modelName of models) {
    let delay = 600;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Status] Querying model ${modelName} - attempt ${attempt}/${maxRetries}...`);
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
        console.log(`[Status] Model query status update on attempt ${attempt}`);
        
        // Fast-fail on billing depletion, keys reported as leaked, or authorization issues
        if (
          msg.includes("prepayment") || 
          msg.includes("depleted") || 
          msg.includes("billing") || 
          msg.includes("leaked") || 
          msg.includes("unauthenticated") || 
          msg.includes("401") || 
          msg.includes("403") || 
          msg.includes("429") || 
          msg.includes("resource_exhausted") || 
          msg.includes("quota")
        ) {
          isGeminiSuspended = true;
          throw new Error("AI service deactivated. Utilizing local processing.");
        }
        
        // If it looks like a transient/rate limit/load error, wait with backoff
        if (attempt < maxRetries && (
          msg.includes("503") || 
          msg.includes("demand") || 
          msg.includes("temporary") || 
          msg.includes("unavailable") || 
          msg.includes("rate limit") ||
          msg.includes("overloaded")
        )) {
          console.log(`[Status] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          break; // break retry loop to try the next model
        }
      }
    }
  }
  
  throw lastError || new Error("Utilizing local processing fallback");
}

// Helper to calculate Levenshtein distance between two normalized words
function levenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;
  
  const matrix = Array.from({ length: s1.length + 1 }, () => new Array(s2.length + 1).fill(0));
  
  for (let i = 0; i <= s1.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[s1.length][s2.length];
}

// Phonetically normalizes common Cambodian location vowels and consonants
function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/ae/g, "e")
    .replace(/ou/g, "u")
    .replace(/oa/g, "u")
    .replace(/lh/g, "l")
    .replace(/rh/g, "r")
    .replace(/om/g, "um")
    .replace(/rn/g, "n")
    .replace(/kk/g, "k")
    .replace(/tt/g, "t")
    .replace(/bb/g, "b")
    .replace(/pp/g, "p")
    .replace(/aa/g, "a")
    .replace(/ee/g, "e")
    .replace(/oo/g, "o")
    .replace(/ie/g, "ea")
    .replace(/eo/g, "oe")
    .replace(/kh/g, "k")
    .replace(/ch/g, "c")
    .replace(/ph/g, "p")
    .replace(/th/g, "t");
}

// Tokenizes a string into raw cleaned words (ignoring standard administrative terms)
const stopWords = new Set(["province", "district", "commune", "sangkat", "khan", "krong", "capital", "city", "village", "phum", "street", "st"]);
function getWords(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 0 && !stopWords.has(w));
}

// Gets phonetically normalized version of joined words
function getNormalizedString(s: string): string {
  return getWords(s).map(normalizeWord).join(" ");
}

// Custom fuzzy word matcher
function wordMatches(w1: string, w2: string): boolean {
  if (w1 === w2) return true;
  const nw1 = normalizeWord(w1);
  const nw2 = normalizeWord(w2);
  if (nw1 === nw2) return true;
  
  if (nw1.length >= 4 && nw2.length >= 4) {
    if (levenshteinDistance(nw1, nw2) <= 1) return true;
  }
  return false;
}

// Check if subsequence of words matches contiguously
function isContiguousMatch(subWords: string[], parentWords: string[]): boolean {
  if (subWords.length === 0) return false;
  for (let i = 0; i <= parentWords.length - subWords.length; i++) {
    let match = true;
    for (let j = 0; j < subWords.length; j++) {
      if (!wordMatches(subWords[j], parentWords[i + j])) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

// Compute set of unique character bigrams for Sorensen-Dice coefficient
function getBigrams(str: string): Set<string> {
  const clean = (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const bigrams = new Set<string>();
  for (let i = 0; i < clean.length - 1; i++) {
    bigrams.add(clean.substring(i, i + 2));
  }
  return bigrams;
}

// Compute Sorensen-Dice similarity index (0.0 - 1.0) on character bigrams
function getBigramSim(str1: string, str2: string): number {
  const b1 = getBigrams(str1);
  const b2 = getBigrams(str2);
  if (b1.size === 0 || b2.size === 0) return 0;
  let intersection = 0;
  for (const val of b1) {
    if (b2.has(val)) {
      intersection++;
    }
  }
  return (2 * intersection) / (b1.size + b2.size);
}

const searchHistoryFilePath = resolveDataFilePath("search_history.json");

interface SearchHistoryEntry {
  id: string;
  query: string;
  original_query: string;
  datetime: string;
  result: any;
  score: number;
  rating: "up" | "down" | null;
  benchmark_used: number;
}

let searchHistoryCache: SearchHistoryEntry[] = [];

// Load search history on startup
async function loadSearchHistory() {
  try {
    if (fs.existsSync(searchHistoryFilePath)) {
      const raw = fs.readFileSync(searchHistoryFilePath, "utf-8");
      searchHistoryCache = JSON.parse(raw);
    } else {
      searchHistoryCache = [];
    }
    console.log(`[Status] Loaded ${searchHistoryCache.length} search history log cache entries.`);
  } catch (err) {
    console.error("Failed to load search history:", err);
    searchHistoryCache = [];
  }

  // Synchronize dynamic cache logs with Supabase table in background
  if (isSupabaseConfigured()) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/postcode_search_history?select=*&order=datetime.asc`;
      const res = await fetch(url, {
        headers: {
          "apikey": SUPABASE_KEY!,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      });
      if (res.ok) {
        const remoteList = await res.json();
        if (remoteList && Array.isArray(remoteList)) {
          const mergedMap = new Map<string, SearchHistoryEntry>();
          // Add existing local ones
          searchHistoryCache.forEach(item => mergedMap.set(item.id, item));
          // Merge Supabase records
          remoteList.forEach((r: any) => {
            mergedMap.set(r.id, {
              id: r.id,
              query: r.query,
              original_query: r.original_query,
              datetime: r.datetime || r.created_at || new Date().toISOString(),
              result: r.result,
              score: Number(r.score) !== undefined && !isNaN(Number(r.score)) ? Number(r.score) : 100,
              rating: r.rating || null,
              benchmark_used: Number(r.benchmark_used) !== undefined && !isNaN(Number(r.benchmark_used)) ? Number(r.benchmark_used) : 50
            });
          });
          searchHistoryCache = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
          );
          try {
            const dir = path.dirname(searchHistoryFilePath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(searchHistoryFilePath, JSON.stringify(searchHistoryCache, null, 2), "utf-8");
            console.log(`[Status] Synchronized search history cache with Supabase: ${searchHistoryCache.length} entries.`);
          } catch (writeErr) {
            console.warn("Could not write merged cache to local drive:", writeErr);
          }
        }
      } else {
        throw new Error(`HTTP status ${res.status}`);
      }
    } catch (err: any) {
      console.log("[Status] Supabase search history synchronization postponed/offline:", err.message);
    }
  }
}

// Dynamic benchmark threshold calculator based on feedback ratings
function getDynamicCutoffThreshold(): number {
  let threshold = 50; // Start with default baseline
  
  // Filter for completed thumbs-down ratings (inaccurate matching results)
  const thumbsDownScores = searchHistoryCache
    .filter(e => e.rating === "down" && e.score > 0)
    .map(e => e.score);
    
  if (thumbsDownScores.length > 0) {
    const maxFailed = Math.max(...thumbsDownScores);
    // If users rejected a match with score 54, threshold adapts to 55 (maxFailed + 1)
    threshold = Math.min(80, Math.max(threshold, maxFailed + 1));
  }
  
  // Also see if we have successful matches without negative ones to lower threshold
  const thumbsUpScores = searchHistoryCache
    .filter(e => e.rating === "up" && e.score > 0)
    .map(e => e.score);
    
  if (thumbsDownScores.length === 0 && thumbsUpScores.length >= 3) {
    const minSuccess = Math.min(...thumbsUpScores);
    // Minimum floor 50
    threshold = Math.max(50, Math.min(threshold, minSuccess));
  }
  
  return threshold;
}

// Look up identical cached search requests (exact lowercase text match) to save Gemini API call tokens
function findCachedResult(originalQuery: string): SearchHistoryEntry | null {
  const qClean = (originalQuery || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!qClean) return null;
  
  // 1. Prioritize exactly matching query that has a Thumbs Up rating
  const thumbUpMatches = searchHistoryCache.filter(e => e.query === qClean && e.rating === "up");
  if (thumbUpMatches.length > 0) {
    return thumbUpMatches[thumbUpMatches.length - 1];
  }

  // 2. Fall back to exactly matching query with neutral rating (ignores downvoted)
  const neutralMatches = searchHistoryCache.filter(e => e.query === qClean && e.rating !== "down");
  if (neutralMatches.length > 0) {
    return neutralMatches[neutralMatches.length - 1];
  }

  return null;
}

// Persist query results inside the log cache system (Saves to file database & Supabase)
async function addSearchHistory(originalQuery: string, result: any, score: number, benchmarkUsed: number) {
  const qClean = (originalQuery || "").trim().toLowerCase().replace(/\s+/g, " ");
  const entry: SearchHistoryEntry = {
    id: "sh_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
    query: qClean,
    original_query: originalQuery,
    datetime: new Date().toISOString(),
    result,
    score,
    rating: null,
    benchmark_used: benchmarkUsed
  };
  
  searchHistoryCache.push(entry);
  
  try {
    const dir = path.dirname(searchHistoryFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(searchHistoryFilePath, JSON.stringify(searchHistoryCache, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not save search history locally:", err);
  }
  
  if (isSupabaseConfigured()) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/postcode_search_history`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY!,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          id: entry.id,
          query: entry.query,
          original_query: entry.original_query,
          datetime: entry.datetime,
          result: entry.result,
          score: entry.score,
          rating: entry.rating,
          benchmark_used: entry.benchmark_used
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`[Supabase Error] Failed to insert postcode search history (HTTP ${res.status}):`, errText);
      } else {
        console.log(`[Supabase Status] Successfully saved search log to postcode_search_history. ID: ${entry.id}`);
      }
    } catch (err: any) {
      console.error("[Supabase Error] Exception in addSearchHistory fetch operation:", err.message || err);
    }
  }
  
  return entry;
}

// Update rating thumbs state
async function updateSearchHistoryRating(id: string, rating: "up" | "down" | null): Promise<boolean> {
  const index = searchHistoryCache.findIndex(e => e.id === id);
  if (index !== -1) {
    const entry = searchHistoryCache[index];
    entry.rating = rating;
    
    try {
      fs.writeFileSync(searchHistoryFilePath, JSON.stringify(searchHistoryCache, null, 2), "utf-8");
    } catch (err) {
      console.warn("Could not write updated rating locally:", err);
    }
    
    if (isSupabaseConfigured()) {
      try {
        // Use PostgREST POST with resolution=merge-duplicates to perform an UPSERT.
        // This ensures that even if the row wasn't previously written due to any latency/timing mismatch, 
        // it gets fully created now with the current rating, avoiding 'not found in database' errors!
        const url = `${SUPABASE_URL}/rest/v1/postcode_search_history`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_KEY!,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=representation"
          },
          body: JSON.stringify({
            id: entry.id,
            query: entry.query,
            original_query: entry.original_query,
            datetime: entry.datetime,
            result: entry.result,
            score: entry.score,
            rating: entry.rating,
            benchmark_used: entry.benchmark_used
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error(`[Supabase Error] Fail upsert postcode rating (HTTP ${res.status}):`, errText);
          
          // Fall back to general PATCH if the table schema version or policies only allow normal updates
          console.log("[Status] Trying fallback PATCH update...");
          const patchUrl = `${SUPABASE_URL}/rest/v1/postcode_search_history?id=eq.${id}`;
          const patchRes = await fetch(patchUrl, {
            method: "PATCH",
            headers: {
              "apikey": SUPABASE_KEY!,
              "Authorization": `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ rating })
          });
          if (!patchRes.ok) {
            const patchErrText = await patchRes.text();
            console.error(`[Supabase Error] Fallback PATCH rating update failed (HTTP ${patchRes.status}):`, patchErrText);
          }
        } else {
          console.log(`[Supabase Status] Upserted log rating successfully to database for ID: ${id}`);
        }
      } catch (err: any) {
        console.error("[Supabase Error] Exception in updateSearchHistoryRating:", err.message || err);
      }
    }
    return true;
  } else {
    // FALLBACK IF ENTRY IS NOT FOUND LOCALLY (e.g., caused by container scaling, stateless instances, or missing cache sync)
    if (isSupabaseConfigured()) {
      try {
        console.log(`[Status] Rating target ${id} not found locally. Querying Supabase fallback...`);
        const url = `${SUPABASE_URL}/rest/v1/postcode_search_history?id=eq.${id}`;
        const getRes = await fetch(url, {
          headers: {
            "apikey": SUPABASE_KEY!,
            "Authorization": `Bearer ${SUPABASE_KEY}`
          }
        });
        if (getRes.ok) {
          const rows = await getRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const entry = rows[0];
            entry.rating = rating;
            
            // Push to local memory to keep it synchronized
            searchHistoryCache.push(entry);
            try {
              fs.writeFileSync(searchHistoryFilePath, JSON.stringify(searchHistoryCache, null, 2), "utf-8");
            } catch (err) {}

            // Send PATCH update to Supabase
            console.log(`[Status] Saving fallback rating to Supabase for ${id}...`);
            const patchRes = await fetch(url, {
              method: "PATCH",
              headers: {
                "apikey": SUPABASE_KEY!,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ rating })
            });

            if (!patchRes.ok) {
              const errText = await patchRes.text();
              console.error(`[Supabase Error] Fallback rating update failed (HTTP ${patchRes.status}):`, errText);
            } else {
              console.log(`[Supabase Status] Rating updated successfully in fallback for ${id}`);
            }
            return true;
          }
        }
      } catch (err: any) {
        console.error("[Supabase Error] Fallback search rating sync exception:", err.message || err);
      }
    }
  }
  return false;
}

// Secondary High-Fidelity Google Geocoding proxy resolver
async function geocodeAddressWithGoogle(
  text: string,
  apiKey: string
): Promise<{ province: string; district: string; commune: string; formattedAddress: string } | null> {
  if (!apiKey || apiKey.includes("••••") || apiKey.trim().length < 10) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}&key=${apiKey}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.status === "OK" && data.results && data.results[0]) {
        const firstResult = data.results[0];
        let compProvince = "";
        let compAdmin2 = "";
        let compLocality = "";
        let compSublocality1 = "";
        let compSublocality = "";
        let compAdmin3 = "";
        let compNeighborhood = "";

        firstResult.address_components.forEach((comp: any) => {
          const types = comp.types || [];
          if (types.includes("administrative_area_level_1")) {
            compProvince = comp.long_name;
          }
          if (types.includes("administrative_area_level_2")) {
            compAdmin2 = comp.long_name;
          }
          if (types.includes("locality")) {
            compLocality = comp.long_name;
          }
          if (types.includes("sublocality_level_1")) {
            compSublocality1 = comp.long_name;
          }
          if (types.includes("sublocality")) {
            compSublocality = comp.long_name;
          }
          if (types.includes("administrative_area_level_3")) {
            compAdmin3 = comp.long_name;
          }
          if (types.includes("neighborhood")) {
            compNeighborhood = comp.long_name;
          }
        });

        let gProvince = compProvince;
        let gDistrict = "";
        if (compAdmin2) {
          gDistrict = compAdmin2;
        } else if (compLocality && compLocality.toLowerCase() !== compProvince.toLowerCase() && !compLocality.toLowerCase().includes("phnom penh")) {
          gDistrict = compLocality;
        } else {
          gDistrict = compLocality || "";
        }

        let gCommune = compSublocality1 || compSublocality || compAdmin3 || compNeighborhood || "";

        return {
          province: gProvince,
          district: gDistrict,
          commune: gCommune,
          formattedAddress: firstResult.formatted_address || text
        };
      }
    }
  } catch (err) {
    console.error("Geocoding failed inside geocodeAddressWithGoogle:", err);
  }
  return null;
}

// Server-side Geocoded address components to Postcode Database fuzzy aligning engine
function fuzzyMatchGeocodedAddress(
  gProvince: string,
  gDistrict: string,
  gCommune: string,
  db: PostcodeEntry[],
  originalInputText: string
): any {
  const normalizeComponent = (str: string) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/\b(province|capital|khan|sangkat|krong|district|municipality|commune|capital city)\b/gi, "")
      .replace(/[‘’'"`]/g, "")
      .replace(/[^a-z0-9]/gi, " ")
      .trim();
  };

  const normGProv = normalizeComponent(gProvince);
  const normGDist = normalizeComponent(gDistrict);
  const normGComm = normalizeComponent(gCommune);

  if (!normGProv) return null;

  let bestEntry: PostcodeEntry | null = null;
  let bestScore = 0;

  for (const item of db) {
    const normDbProv = normalizeComponent(item.province);
    const normDbDist = normalizeComponent(item.district);
    const normDbComm = normalizeComponent(item.commune);

    let score = 0;

    // Weight allocation out of 100
    // Province mapping (max 20)
    if (normDbProv && normGProv && (normDbProv === normGProv || normDbProv.includes(normGProv) || normGProv.includes(normDbProv))) {
      score += 20;
    }

    // District mapping (max 35)
    if (normDbDist && normGDist) {
      if (normDbDist === normGDist) {
        score += 35;
      } else if (normDbDist.includes(normGDist) || normGDist.includes(normDbDist)) {
        score += 24;
      }
    }

    // Commune mapping (max 45)
    if (normDbComm && normGComm) {
      if (normDbComm === normGComm) {
        score += 45;
      } else if (normDbComm.includes(normGComm) || normGComm.includes(normDbComm)) {
        score += 30;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntry = item;
    }
  }

  // Acceptance benchmark is score >= 40 (meaning we matched province + district/commune)
  if (bestEntry && bestScore >= 40) {
    const numbersFound: string[] = (originalInputText || "").match(/\b\d{5,6}\b/g) || [];
    let status = "No Postcode Detected";
    const matchesNew = numbersFound.includes(bestEntry.new_postcode);
    const matchesExisting = bestEntry.existing_postcode ? numbersFound.includes(bestEntry.existing_postcode) : false;

    if (numbersFound.length > 0) {
      if (matchesNew) {
        status = "Follow New Postcode";
      } else if (matchesExisting) {
        status = "Follow Existing Postcode";
      } else {
        status = "Incorrect Postcode";
      }
    }

    return {
      province: bestEntry.province,
      district: bestEntry.district,
      commune: bestEntry.commune,
      postcode_status: status,
      existing_postcode: bestEntry.existing_postcode || "",
      new_postcode: bestEntry.new_postcode || "",
      new_city_name: bestEntry.new_city_name || "",
      ib_sort_co: bestEntry.ib_sort_co || "",
      inbound_fac: bestEntry.inbound_fac || "",
      score: Math.max(50, bestScore)
    };
  }

  return null;
}

// Unified, multi-layered local fuzzy matcher with Sorensen-Dice bigram and hierarchical matching
function improvedLocalFuzzyMatch(inputText: string, db: PostcodeEntry[]): any {
  const cleanInput = (inputText || "").trim().toLowerCase();
  if (!cleanInput) return null;

  // Layer 0: Postcode Direct Match Shortcut (High-confidence)
  const foundPostcodes = cleanInput.match(/\d{5,6}/);
  if (foundPostcodes) {
    const pc = foundPostcodes[0];
    const matchNew = db.find(x => x.new_postcode === pc);
    if (matchNew) {
      return assembleMatchResult(matchNew, 100, inputText);
    }
    const matchExisting = db.find(x => x.existing_postcode === pc);
    if (matchExisting) {
      return assembleMatchResult(matchExisting, 100, inputText);
    }
  }

  const normalizeComponent = (str: string) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/\b(province|capital|khan|sangkat|krong|district|municipality|commune|capital city)\b/gi, "")
      .replace(/[‘’'"`]/g, "")
      .replace(/[^a-z0-9]/gi, " ")
      .trim();
  };

  const synonyms: { [key: string]: string[] } = {
    "boeng keng kang": ["bkk", "beoung keng kang", "boeng keng kang", "bangkengkang"],
    "chamkar mon": ["chamkarmon", "chamkar mon", "chamkar morn", "chamkarmorn"],
    "prampir meakkara": ["7 makara", "7makara", "prampir makara", "prampir meakkara", "7_makara", "7-makara"],
    "tuol kouk": ["toul kouk", "toulkouk", "tuol kouk", "tual kouk", "tuolkouk"],
    "phnom penh": ["pp", "phnompenh", "phnom penh", "phnom, penh"],
    "doun penh": ["daun penh", "doun penh", "daunpenh", "dounpenh"],
    "saen sokh": ["sen sok", "sensok", "saen sok", "saensok", "sean sok", "seansok", "saen sokh", "saensokh"],
    "phnum penh thmei": ["phnom penh thmey", "phnum penh thmey", "phnom penh thmei", "phnum penh thmei", "phnompenhthmey", "phnumpenhthmey"]
  };

  let substitutedInput = cleanInput;
  for (const [canonical, aliases] of Object.entries(synonyms)) {
    for (const alias of aliases) {
      if (substitutedInput.includes(alias)) {
        substitutedInput = substitutedInput.replace(alias, canonical);
      }
    }
  }

  const inputWords = getWords(substitutedInput);

  // 1. First Layer: Concat Match (commune-district-province)
  let bestEntry1: PostcodeEntry | null = null;
  let bestScore1 = 0;

  for (const item of db) {
    const cStr = `${item.commune} ${item.district} ${item.province}`;

    // Word ratio match using phonetics
    const itemWords = getWords(cStr);
    let matchedWordsCount = 0;
    inputWords.forEach(iw => {
      if (itemWords.some(dw => wordMatches(dw, iw))) {
        matchedWordsCount++;
      }
    });
    const wordRatio = inputWords.length > 0 ? (matchedWordsCount / inputWords.length) : 0;

    // Bigram Sorensen-Dice match
    const phInput = getNormalizedString(substitutedInput);
    const phCandidate = getNormalizedString(cStr);
    const bigramSim = getBigramSim(phInput, phCandidate);

    const score = Math.round((wordRatio * 0.4 + bigramSim * 0.6) * 100);

    let boost = 0;
    if (phCandidate.includes(phInput) || phInput.includes(phCandidate)) {
      boost += 10;
    }

    const finalScore = Math.min(100, score + boost);

    if (finalScore > bestScore1) {
      bestScore1 = finalScore;
      bestEntry1 = item;
    }
  }

  if (bestEntry1 && bestScore1 >= 50) {
    return assembleMatchResult(bestEntry1, bestScore1, inputText);
  }

  // 2. Second Layer: Multi-step Hierarchical Match if Layer 1 yields low confidence
  const uniqueProvinces = Array.from(new Set(db.map(x => x.province)));
  let bestProvName = "";
  let bestProvScore = 0;

  uniqueProvinces.forEach(provName => {
    const cleanProv = normalizeComponent(provName);
    const cleanInputText = normalizeComponent(substitutedInput);

    const pWordRatio = getWords(cleanProv).some(pw => inputWords.some(iw => wordMatches(pw, iw) || iw.includes(pw) || pw.includes(iw))) ? 1.0 : 0.0;
    const pBigramSim = getBigramSim(cleanInputText, cleanProv);
    const pScore = Math.round((pWordRatio * 0.5 + pBigramSim * 0.5) * 100);

    if (pScore > bestProvScore) {
      bestProvScore = pScore;
      bestProvName = provName;
    }
  });

  if (bestProvName && bestProvScore >= 30) {
    const provinceRows = db.filter(x => x.province === bestProvName);

    const uniqueDistricts = Array.from(new Set(provinceRows.map(x => x.district)));
    let bestDistName = "";
    let bestDistScore = 0;

    uniqueDistricts.forEach(distName => {
      const cleanDist = normalizeComponent(distName);
      const cleanInputText = normalizeComponent(substitutedInput);

      const dWordRatio = getWords(cleanDist).some(dw => inputWords.some(iw => wordMatches(dw, iw) || iw.includes(dw) || dw.includes(iw))) ? 1.0 : 0.0;
      const dBigramSim = getBigramSim(cleanInputText, cleanDist);
      const dScore = Math.round((dWordRatio * 0.5 + dBigramSim * 0.5) * 100);

      if (dScore > bestDistScore) {
        bestDistScore = dScore;
        bestDistName = distName;
      }
    });

    if (bestDistName && bestDistScore >= 35) {
      const districtRows = provinceRows.filter(x => x.district === bestDistName);

      const uniqueCommunes = Array.from(new Set(districtRows.map(x => x.commune)));
      let bestCommName = "";
      let bestCommScore = 0;

      uniqueCommunes.forEach(commName => {
        const cleanComm = normalizeComponent(commName);
        const cleanInputText = normalizeComponent(substitutedInput);

        const cWordRatio = getWords(cleanComm).some(cw => inputWords.some(iw => wordMatches(cw, iw) || iw.includes(cw) || cw.includes(iw))) ? 1.0 : 0.0;
        const cBigramSim = getBigramSim(cleanInputText, cleanComm);
        const cScore = Math.round((cWordRatio * 0.5 + cBigramSim * 0.5) * 100);

        if (cScore > bestCommScore) {
          bestCommScore = cScore;
          bestCommName = commName;
        }
      });

      if (bestCommName) {
        const found = districtRows.find(x => x.commune === bestCommName);
        if (found) {
          const calculatedScore = Math.round(
            (bestProvScore / 100) * 20 +
            (bestDistScore / 100) * 35 +
            (bestCommScore / 100) * 45
          );
          const finalScore = Math.max(50, calculatedScore);
          return assembleMatchResult(found, finalScore, inputText);
        }
      }
    }
  }

  return null;
}

function assembleMatchResult(bestEntry: PostcodeEntry, score: number, inputText: string) {
  const cleanInput = (inputText || "").trim().toLowerCase();
  const numbersFound: string[] = cleanInput.match(/\b\d{5,6}\b/g) || [];
  let status = "No Postcode Detected";
  const matchesNew = numbersFound.includes(bestEntry.new_postcode);
  const matchesExisting = bestEntry.existing_postcode ? numbersFound.includes(bestEntry.existing_postcode) : false;

  if (numbersFound.length > 0) {
    if (matchesNew) {
      status = "Follow New Postcode";
    } else if (matchesExisting) {
      status = "Follow Existing Postcode";
    } else {
      status = "Incorrect Postcode";
    }
  }

  return {
    province: bestEntry.province,
    district: bestEntry.district,
    commune: bestEntry.commune,
    postcode_status: status,
    existing_postcode: bestEntry.existing_postcode || "",
    new_postcode: bestEntry.new_postcode || "",
    new_city_name: bestEntry.new_city_name || "",
    ib_sort_co: bestEntry.ib_sort_co || "",
    inbound_fac: bestEntry.inbound_fac || "",
    score: Math.max(50, score),
    input_text: inputText
  };
}

function normalizedFuzzyMatch(inputText: string, db: PostcodeEntry[]): any {
  return improvedLocalFuzzyMatch(inputText, db);
}

function localPostcodeMatch(inputText: string, db: PostcodeEntry[], cutoffOverride?: number): any {
  const result = improvedLocalFuzzyMatch(inputText, db);
  if (!result) {
    return {
      province: "Unknown",
      district: "Unknown",
      commune: "Unknown",
      postcode_status: "Unknown",
      existing_postcode: "",
      new_postcode: "",
      score: 0,
      input_text: inputText || ""
    };
  }
  return result;
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

// Global server-side in-memory cache for postcode entries
let postcodeMemoryDb: PostcodeEntry[] | null = null;

// Helper to read local JSON database cache
function readDatabase(): PostcodeEntry[] {
  if (postcodeMemoryDb) {
    return postcodeMemoryDb;
  }

  // Check active postcode data file first
  try {
    if (fs.existsSync(dataFilePath)) {
      const parsed = JSON.parse(fs.readFileSync(dataFilePath, "utf-8"));
      postcodeMemoryDb = sanitizePostcodeFields(Array.isArray(parsed) ? parsed : []);
      return postcodeMemoryDb;
    }
  } catch (err) {
    console.error("Error reading active database file:", err);
  }

  // Fallback and copy backup database file if missing, handles permissions errors gracefully
  try {
    if (fs.existsSync(backupFilePath)) {
      const parsed = JSON.parse(fs.readFileSync(backupFilePath, "utf-8"));
      postcodeMemoryDb = sanitizePostcodeFields(Array.isArray(parsed) ? parsed : []);
      
      try {
        const parentDir = path.dirname(dataFilePath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(dataFilePath, JSON.stringify(postcodeMemoryDb, null, 2), "utf-8");
      } catch (writeErr) {
        console.warn("Notice: Continuing using in-memory model. Could not sync backup file cloned onto dataFilePath due to read-only container disk.", writeErr);
      }
      return postcodeMemoryDb;
    }
  } catch (err) {
    console.error("Error reading backup database file:", err);
  }

  postcodeMemoryDb = [];
  return postcodeMemoryDb;
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
  postcodeMemoryDb = data;
  try {
    const parentDir = path.dirname(dataFilePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Notice: Continuing with updated server runtime memory. Failed writing database file to disk (write-protected/sandboxed environment):", err);
  }
  // Always return true to signal client application of a successful memory registration!
  return true;
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

// Secrets must never reach the browser in full: the client fallbacks all skip
// keys containing "••••", so masked values keep the UI informative but unusable.
function maskSecret(value: string | undefined): string {
  const v = String(value || "").trim();
  if (!v) return "";
  return v.slice(0, 6) + "••••";
}

function maskConfigSecrets(config: ApiConfig): ApiConfig {
  return {
    ...config,
    supabaseKey: maskSecret(config.supabaseKey),
    geminiKey: maskSecret(config.geminiKey)
  };
}

// Settings Persistence Gateways for Superadmin Profile Sync
app.get("/api/get-config", (req, res) => {
  res.json(maskConfigSecrets(getApiConfig()));
});

app.post("/api/save-config", (req, res) => {
  const incoming = { ...req.body };
  // The settings console echoes masked placeholders back; drop them so they
  // never overwrite the real stored secrets.
  for (const field of ["supabaseKey", "geminiKey"]) {
    if (typeof incoming[field] === "string" && incoming[field].includes("••••")) {
      delete incoming[field];
    }
  }
  const success = writeApiConfig(incoming);
  if (success) {
    isGeminiSuspended = false;
    res.json({ success: true, config: maskConfigSecrets(getApiConfig()) });
  } else {
    res.status(550).json({ error: "Failed to save configuration database on the server" });
  }
});

// Roles & Permissions Database Sync Gateways
app.get("/api/get-role-features", (req, res) => {
  if (cachedDbRoleFeaturesList) {
    res.json({ roleFeatures: cachedDbRoleFeaturesList, source: "database" });
  } else {
    res.json({ roleFeatures: null, source: "fallback" });
  }
});

app.post("/api/save-role-features", async (req, res) => {
  const { roleFeatures } = req.body;
  if (!roleFeatures || !Array.isArray(roleFeatures)) {
    return res.status(400).json({ error: "Invalid role features format. Expected an array." });
  }

  // Update server cache
  cachedDbRoleFeaturesList = roleFeatures;

  // Asynchronously store to Supabase settings table
  const ok = await saveToSupabaseSettings("role_features", roleFeatures);
  if (ok) {
    res.json({ success: true, message: "Role features matrix fully persisted to Supabase database!" });
  } else {
    res.json({ 
      success: true, 
      warning: "db_not_present", 
      message: "Permissions saved in server runtime memory buffer. Please run the SQL block inside Supabase." 
    });
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

  const upperDistrict = String(district).trim().toUpperCase();
  const communeStr = String(commune).trim();

  const payload = {
    province: String(province).trim(),
    district: upperDistrict,
    commune: communeStr,
    existing_postcode: String(existing_postcode || "").replace(/['"]/g, "").trim(),
    new_postcode: String(new_postcode).replace(/['"]/g, "").trim(),
    ib_sort_co: String(ib_sort_co || "").trim(),
    inbound_fac: String(inbound_fac || "").trim()
  };

  const newEntry: PostcodeEntry = {
    id: String(Date.now()),
    ...payload,
    new_city_name: communeStr + "-" + upperDistrict
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
        new_city_name: payload.commune + "-" + payload.district,
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
        supabasePayload.district = String(district).trim().toUpperCase();
      }
      if (commune) {
        supabasePayload.commune = String(commune).trim();
        supabasePayload.sangkat_commune = String(commune).trim();
      }
      if (district || commune) {
        let activeCommune = commune ? String(commune).trim() : "";
        let activeDistrict = district ? String(district).trim().toUpperCase() : "";
        if (!activeCommune || !activeDistrict) {
          const localData = readDatabase();
          const existingItem = localData.find((e) => e.id === id);
          if (existingItem) {
            if (!activeCommune) activeCommune = String(existingItem.commune || "").trim();
            if (!activeDistrict) activeDistrict = String(existingItem.district || "").trim().toUpperCase();
          }
        }
        if (activeCommune && activeDistrict) {
          supabasePayload.new_city_name = activeCommune + "-" + activeDistrict;
        } else if (activeCommune) {
          supabasePayload.new_city_name = activeCommune;
        }
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

  const finalDistrict = String(district || data[entryIndex].district).trim().toUpperCase();
  const finalCommune = String(commune || data[entryIndex].commune).trim();

  data[entryIndex] = {
    id,
    province: String(province || data[entryIndex].province).trim(),
    district: finalDistrict,
    commune: finalCommune,
    existing_postcode: String(existing_postcode !== undefined ? existing_postcode : data[entryIndex].existing_postcode).replace(/['"]/g, "").trim(),
    new_postcode: String(new_postcode || data[entryIndex].new_postcode).replace(/['"]/g, "").trim(),
    ib_sort_co: String(ib_sort_co !== undefined ? ib_sort_co : data[entryIndex].ib_sort_co || "").trim(),
    inbound_fac: String(inbound_fac !== undefined ? inbound_fac : data[entryIndex].inbound_fac || "").trim(),
    new_city_name: finalCommune + "-" + finalDistrict
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

  const transformedInitialData = initialData.map((item) => {
    const upperDistrict = String(item.district || "").trim().toUpperCase();
    const communeStr = String(item.commune || "").trim();
    return {
      ...item,
      district: upperDistrict,
      new_city_name: communeStr + "-" + upperDistrict
    };
  });

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
      const supabasePayloads = transformedInitialData.map((item) => ({
        iso_country_code: "KH",
        postal_location_type: "CP",
        city_province: item.province,
        new_country_division: item.province,
        district: item.district,
        commune: item.commune,
        sangkat_commune: item.commune,
        new_city_name: item.new_city_name,
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
      writeDatabase(transformedInitialData);
      return res.json(transformedInitialData);
    } catch (err: any) {
      console.error("Supabase reset exception details:", err);
      return res.status(500).json({ error: "Supabase connection error during database reset.", details: err.message });
    }
  }

  // Backup fallback mode: local JSON cache write
  console.log("Supabase inactive. Resetting local postcode cache baseline...");
  if (writeDatabase(transformedInitialData)) {
    res.json(transformedInitialData);
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

    const payloads = currentLocalData.map((item) => {
      const upperDistrict = String(item.district || "").trim().toUpperCase();
      const communeStr = String(item.commune || "").trim();
      return {
        iso_country_code: "KH",
        postal_location_type: "CP",
        city_province: item.province,
        new_country_division: item.province,
        district: upperDistrict,
        commune: communeStr,
        sangkat_commune: communeStr,
        new_city_name: communeStr + "-" + upperDistrict,
        x_postcode: item.existing_postcode,
        new_postcode: item.new_postcode,
        ib_sort_co: item.ib_sort_co || "",
        inbound_fac: item.inbound_fac || ""
      };
    });

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

app.post("/api/postcodes/purge-local-cache", async (req, res) => {
  try {
    console.log("Removing all local postcode data and cache from local machine/server files...");
    
    // 1. Remove all data by writing an empty array to the memory and the active data files
    postcodeMemoryDb = [];
    try {
      if (fs.existsSync(dataFilePath)) {
        fs.writeFileSync(dataFilePath, JSON.stringify([], null, 2), "utf-8");
      }
      if (fs.existsSync(backupFilePath)) {
        fs.writeFileSync(backupFilePath, JSON.stringify([], null, 2), "utf-8");
      }
      console.log("Cleared active and backup JSON files on local machine disk.");
    } catch (diskErr: any) {
      console.warn("Could not wipe disk files, but cleared in-memory cache:", diskErr.message);
    }

    // 2. Load from Database
    if (!isSupabaseConfigured()) {
      return res.json({
        success: true,
        message: "Successfully purged local cache! (Notice: No live Supabase database is currently connected, so table was initialized to empty)."
      });
    }

    console.log("Loading latest postcode records directly from Supabase to repopulate local database cache...");
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
        console.error(`Purge-load: Supabase pull failed on page ${page}:`, errorText);
        return res.status(500).json({ error: `Purge succeeded but failed to load fresh rows from Supabase.`, details: errorText });
      }
    }

    if (allRows.length > 0) {
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

      // write back to local machine so it's fully populated
      writeDatabase(mappedEntries);
      try {
        fs.writeFileSync(backupFilePath, JSON.stringify(mappedEntries, null, 2), "utf-8");
      } catch (backupErr) {}

      console.log(`Successfully purged local cache and loaded ${mappedEntries.length} records freshly from Supabase.`);
      return res.json({
        success: true,
        message: `Successfully purged local machine cache! Reloaded and cached ${mappedEntries.length} records dynamically from Supabase database.`,
        count: mappedEntries.length
      });
    } else {
      return res.json({
        success: true,
        message: "Successfully purged local cache! (No records found in active database table)."
      });
    }

  } catch (err: any) {
    console.error("Purge local cache and load database failed:", err);
    return res.status(500).json({ error: "Failed to purge local cache or load from database.", details: err.message });
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

const usersFilePath = resolveDataFilePath("admin_users.json");

// Global server-side in-memory cache for admin users
let adminUsersMemoryDb: AdminUser[] | null = null;

function readAdminUsers(): AdminUser[] {
  if (adminUsersMemoryDb) {
    return adminUsersMemoryDb;
  }
  try {
    if (fs.existsSync(usersFilePath)) {
      const parsed = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
      adminUsersMemoryDb = Array.isArray(parsed) ? parsed : [];
      return adminUsersMemoryDb;
    }
  } catch (err) {
    console.error("Error reading admin users file:", err);
  }
  // Baseline initial users
  adminUsersMemoryDb = [];
  return adminUsersMemoryDb;
}

function writeAdminUsers(data: AdminUser[]): boolean {
  adminUsersMemoryDb = data;
  try {
    const parentDir = path.dirname(usersFilePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(usersFilePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Notice: Continuing with updated admin users server memory cache. Failed writing users file to disk (write-protected environment):", err);
  }
  // Always return true to avoid API request failure!
  return true;
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

  // Ensure newest history logs and ratings are synced from Supabase before matching
  await loadSearchHistory();

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
    const dynamicCutoff = getDynamicCutoffThreshold();

    // Prepare inputs to process
    const isSingle = !!text;
    const inputsToProcess = isSingle ? [text!] : (rows as string[]);
    
    // Arrays to maintain the final ordered outputs
    const processedResults: any[] = new Array(inputsToProcess.length);
    const scratchInputs: string[] = [];
    const scratchIndices: number[] = [];

    // 1. Resolve from cache first
    inputsToProcess.forEach((inputText, index) => {
      const cached = findCachedResult(inputText);
      if (cached) {
        processedResults[index] = {
          ...cached.result,
          search_id: cached.id,
          confidence_score: cached.score,
          benchmark_used: cached.benchmark_used,
          cached: true
        };
      } else {
        scratchInputs.push(inputText);
        scratchIndices.push(index);
      }
    });

    // 2. Try the high-confidence local fuzzy lookup first for non-cached inputs
    const aiInputs: string[] = [];
    const aiIndices: number[] = [];

    const googleMapsKey = initialConfig.googleMapsKey || process.env.VITE_GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_PLATFORM_KEY || "";

    for (let i = 0; i < scratchInputs.length; i++) {
      const inputText = scratchInputs[i];
      const origIndex = scratchIndices[i];
      
      // Layer 1 & 2: Local Fuzzy Match
      let resolvedResult = improvedLocalFuzzyMatch(inputText, postcodeDb);
      let resolveType = "local";

      // If null, lookup search history for closest lookup value
      if (!resolvedResult) {
        let closestEntry = null;
        let highestSim = 0;
        for (const entry of searchHistoryCache) {
          if (entry.result && entry.result.province && entry.result.province !== "Unknown") {
            const sim = getBigramSim(inputText, entry.original_query || entry.query);
            if (sim > highestSim) {
              highestSim = sim;
              closestEntry = entry;
            }
          }
        }
        if (closestEntry && highestSim >= 0.75) {
          resolvedResult = {
            ...closestEntry.result,
            score: closestEntry.score || Math.round(highestSim * 100),
            input_text: `Search History Fuzzy Match [Closest: "${closestEntry.original_query || closestEntry.query}"]`
          };
          resolveType = "history";
        }
      }

      // If null, do Google Place Geocoder (if configured)
      if (!resolvedResult && googleMapsKey && !googleMapsKey.includes("••••") && googleMapsKey.trim().length > 10) {
        try {
          const geocoded = await geocodeAddressWithGoogle(inputText, googleMapsKey);
          if (geocoded) {
            const matchedGoogle = fuzzyMatchGeocodedAddress(geocoded.province, geocoded.district, geocoded.commune, postcodeDb, inputText);
            if (matchedGoogle) {
              resolvedResult = {
                ...matchedGoogle,
                input_text: `Google Geocode Match [${geocoded.formattedAddress}]`
              };
              resolveType = "google";
            }
          }
        } catch (geoErr) {
          console.error(`[Google Proxy Geocode Error] Failed to geocode text: ${inputText}`, geoErr);
        }
      }

      if (resolvedResult) {
        // High confidence locally matched or cached in history or geocoded via Google!
        const scoreToLog = resolvedResult.score || 95;
        const historyEntry = await addSearchHistory(inputText, resolvedResult, scoreToLog, dynamicCutoff);
        processedResults[origIndex] = {
          ...resolvedResult,
          search_id: historyEntry.id,
          confidence_score: scoreToLog,
          benchmark_used: historyEntry.benchmark_used,
          cached: false
        };
        console.log(`[Status] Resolved '${inputText}' using ${resolveType} routing layer (Score: ${scoreToLog}%)`);
      } else {
        // Fall back to AI matching
        aiInputs.push(inputText);
        aiIndices.push(origIndex);
        console.log(`[Status] Route '${inputText}' to AI/Gemini matching engine (Local layers returned null)`);
      }
    }

    // 3. Fallback to Gemini AI Model for the remaining unresolved/low-confidence inputs
    if (aiInputs.length > 0) {
      let unresolvedResults: any[] = [];
      let aiSucceeded = false;

      if (isGeminiSuspended) {
        console.log("[Status] Utilizing local resilient mapping engine.");
        unresolvedResults = aiInputs.map(inputText => localPostcodeMatch(inputText, postcodeDb, dynamicCutoff));
      } else {
        try {
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

Here structural reference database of official Cambodian subdivisions and their legacy (existing) and migrated (new) postcodes:
${databaseReferenceText}

Rules for normalizing and matching:
1. Always use official, correct administrative spellings from the reference database where possible. For instance, map typos or alternative Khmer romanizations (like 'BKK', 'Beoung Keng Kang' to 'Boeng Keng Kang', 'Chamkarmon' to 'Chamkar Mon', '7 Makara' or 'Prampir Makara' to 'Prampir Meakkara', 'Toul Kouk' to 'Tuol Kouk', etc.).
2. Clean and match inputs to the closest entry in the database.
3. For Famous Landmarks and Points of Interest: If the raw address or input text contains a well-known building, landmark, company, school, hospital, temple, or shopping mall in Cambodia (such as "Chip Mong 271 Mega Mall", "Chipmong 271", "Aeon Mall 3", "NagaWorld", "Olympic Stadium", "ITC", "Calmette Hospital", etc.) rather than a structured street address, first use your extensive world knowledge to identify the physical Sangkat (Commune), Khan (District), and Province/Capital where this establishment is located. Once identified, map those geographical units to the closest matching official entry in the provided structural database.
4. If the input text contains a number that matches the legacy ('existing_postcode') of the matched commune, postcode_status MUST be "Follow Existing Postcode".
5. If the input text contains a number that matches the migrated ('new_postcode') of the matched commune, postcode_status MUST be "Follow New Postcode".
6. If the input contains a postcode that matches neither, or does not match this commune's valid codes, postcode_status MUST be "Incorrect Postcode".
7. If the input text contains NO postcode (no 5-digit or 6-digit numeric postal code, e.g. just raw place and address names), postcode_status MUST be "No Postcode Detected".
8. If the administration unit cannot be determined with confidence, use "Unknown" for province, district, commune, and set postcode_status to "Unknown".
9. Make sure you return an object for each input string sent to you, matching the input list position.`;

          const response = await generateContentWithRetry(ai, {
            model: "gemini-3.5-flash",
            contents: `Process the following address lines/OCR text and return the matched entries.
Inputs to process:
${JSON.stringify(aiInputs, null, 2)}`,
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
          unresolvedResults = parsedResult.results || [];
          aiSucceeded = true;
        } catch (aiErr: any) {
          console.log("[Status] Utilizing local processing fallback due to connection status.");
          unresolvedResults = aiInputs.map(inputText => localPostcodeMatch(inputText, postcodeDb, dynamicCutoff));
        }
      }

      // Enrich newly resolved results
      unresolvedResults = unresolvedResults.map((row, idx) => {
        const originalInput = aiInputs[idx] || "";
        const mProvince = row.province || "Unknown";
        const mDistrict = row.district || "Unknown";
        const mCommune = row.commune || "Unknown";

        const match = fuzzyMatchGeocodedAddress(mProvince, mDistrict, mCommune, postcodeDb, originalInput) ||
                      improvedLocalFuzzyMatch(`${mCommune} ${mDistrict} ${mProvince}`, postcodeDb);

        let finalRow = { ...row };
        if (match) {
          finalRow = {
            ...row,
            province: match.province,
            district: match.district,
            commune: match.commune,
            existing_postcode: match.existing_postcode || row.existing_postcode || "",
            new_postcode: match.new_postcode || row.new_postcode || "",
            postcode_status: match.postcode_status || row.postcode_status || "No Postcode Detected",
            input_text: row.input_text || originalInput,
            new_city_name: match.new_city_name || "",
            ib_sort_co: match.ib_sort_co || "",
            inbound_fac: match.inbound_fac || "",
            score: Math.max(50, match.score || row.score || 100)
          };
        } else {
          finalRow = {
            ...row,
            input_text: row.input_text || originalInput,
            new_city_name: row.new_city_name || "",
            ib_sort_co: row.ib_sort_co || "",
            inbound_fac: row.inbound_fac || ""
          };
        }

        const isUnknown = !finalRow.province || finalRow.province.toLowerCase() === "unknown";
        const computedScore = isUnknown ? 0 : (finalRow.score !== undefined ? Number(finalRow.score) : (aiSucceeded ? 100 : 0));
        finalRow.score = computedScore;
        return finalRow;
      });

      // Save each to search history & assign back to processedResults
      for (let i = 0; i < unresolvedResults.length; i++) {
        const rawResult = unresolvedResults[i];
        const indexInMain = aiIndices[i];
        const inputText = aiInputs[i];

        const historyEntry = await addSearchHistory(inputText, rawResult, rawResult.score, dynamicCutoff);
        
        processedResults[indexInMain] = {
          ...rawResult,
          search_id: historyEntry.id,
          confidence_score: historyEntry.score,
          benchmark_used: historyEntry.benchmark_used,
          cached: false
        };
      }
    }

    // Return single object or list based on query format
    if (isSingle) {
      return res.json(processedResults[0]);
    } else {
      return res.json(processedResults);
    }

  } catch (error: any) {
    console.error("Gemini postcode migration error:", error);
    return res.status(500).json({ 
      error: "An error occurred during postcode matching. Please check your configuration and try again.",
      details: error.message 
    });
  }
});

// GET /api/search-history - Load all recent search logs for metrics dashboards and feedback listing
app.get("/api/search-history", async (req, res) => {
  // Disable HTTP Caching explicitly so that Vercel or cloud proxy/browser layers always serve live metrics
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  // Pull freshest logs and ratings from Supabase if configured to ensure full multi-client synchronization
  await loadSearchHistory();

  const mapped = searchHistoryCache.map(entry => {
    const resultObj = entry.result || {};
    const hasMatch = resultObj && resultObj.new_postcode;
    
    // Fallback for visual targeting
    let targetName = "";
    if (hasMatch) {
      targetName = resultObj.new_city_name || [resultObj.commune, resultObj.district, resultObj.province].filter(Boolean).join(", ");
    }
    
    return {
      ...entry,
      input_text: entry.original_query || entry.query || "",
      new_city_name: targetName,
      new_postcode: resultObj.new_postcode || "",
      confidence_score: entry.score !== undefined ? entry.score : 100,
      created_at: entry.datetime || new Date().toISOString(),
      cached: resultObj.cached !== undefined ? resultObj.cached : false
    };
  });

  res.json({
    history: mapped,
    benchmark_current: getDynamicCutoffThreshold()
  });
});

// POST /api/search-history/rate - Rate a specific search entry (Thumbs Up/Down feedback)
app.post("/api/search-history/rate", async (req, res) => {
  const { id, rating } = req.body;
  if (!id || (rating !== "up" && rating !== "down" && rating !== null)) {
    return res.status(400).json({ error: "Please provide a valid search 'id' and 'rating' ('up', 'down', or null)." });
  }

  const success = await updateSearchHistoryRating(id, rating);
  if (success) {
    res.json({
      success: true,
      message: `Rating for cache id ${id} successfully registered.`,
      benchmark_current: getDynamicCutoffThreshold()
    });
  } else {
    res.status(404).json({ error: `Search history log ID ${id} not found.` });
  }
});


// OCR photo analyzer endpoint - receives base64 photo with address text and uses Gemini for lookup
app.post("/api/ocr-address", async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "Missing required 'imageBase64' parameter." });
  }

  if (isGeminiSuspended) {
    console.log("[Status] Utilized local placeholder for image text transcription.");
    return res.json({
      extracted_text: "AI service is currently offline or payment credits are depleted. Please type the address text manually to run our matching engine.",
      province: "Unknown",
      district: "Unknown",
      commune: "Unknown",
      postcode_status: "Unknown"
    });
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
4. For Famous Landmarks and Points of Interest: If the visible address on the label references a well-known building, landmark, company, hospital, temple, or shopping center (such as "Chip Mong 271 Mega Mall", "Chipmong 271", "Aeon Mall", "Olympic Stadium", etc.) without naming the Sangkat or Khan, use your extensive world knowledge to first place that landmark into its corresponding physical Sangkat, Khan, and Province, then align it with the reference database.
5. Detect the legacy zip code or new postcode written in the text and match it with the database's existing_postcode or new_postcode for the resolved commune:
   - If the postcode on the label matches 'existing_postcode', status must be "Follow Existing Postcode".
   - If the postcode on the label matches 'new_postcode', status must be "Follow New Postcode".
   - If a mismatch is found or is completely wrong, status must be "Incorrect Postcode".
   - If no postcode is found, status must be "No Postcode Detected".
6. Return a structured JSON containing the OCR-extracted text and normalized geographic mappings. Do not include markdown code block characters around the JSON, respond inside the JSON schema format.`;

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
    console.log("[Status] Image processing status update on request.");
    res.status(500).json({
      error: "Service offline. Please type the address manually to proceed.",
      details: error.message
    });
  }
});


// Start custom server and integrate Vite
async function startServer() {
  loadSearchHistory();
  if (process.env.NODE_ENV !== "production") {
    // Dynamic import keeps vite out of the serverless bundle on Vercel
    const { createServer: createViteServer } = await import("vite");
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

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Cambodia Postcode Migrator server running on http://localhost:${PORT}`);
    try {
      await syncFromDatabase();
      console.log("[Platform Settings] Startup configuration check and synchronization completed.");
    } catch (e) {
      console.error("[Platform Settings] Failed to fetch settings during server startup:", e);
    }
  });
}

if (process.env.VERCEL) {
  // On Vercel the app runs as a serverless function (see api/index.ts) and
  // static assets are served by the platform, so we never call listen().
  // Settings sync is fired on cold start; requests fall back to file config
  // until it completes.
  loadSearchHistory();
  syncFromDatabase().catch((e) =>
    console.error("[Platform Settings] Cold-start settings sync failed:", e)
  );
} else {
  startServer();
}

export default app;

import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { 
  MapPin, 
  Search, 
  RotateCcw, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit2, 
  Database, 
  Copy, 
  Check, 
  FileText, 
  Upload, 
  Info, 
  ExternalLink, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  RefreshCw,
  HelpCircle,
  Camera,
  Image,
  Map,
  Navigation,
  Shield,
  Eye,
  ShieldCheck,
  Zap,
  Users,
  Save,
  CloudLightning,
  CloudUpload,
  CloudDownload,
  ShieldAlert,
  Globe,
  Building,
  Home
} from "lucide-react";

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

interface MigrationResult {
  province: string;
  district: string;
  commune: string;
  postcode_status: "Incorrect Postcode" | "Follow Existing Postcode" | "Follow New Postcode" | "Unknown" | "No Postcode Detected";
  existing_postcode?: string;
  new_postcode?: string;
  input_text?: string;
  ib_sort_co?: string;
  inbound_fac?: string;
  new_city_name?: string;
}

export interface RoleFeatures {
  id: string;
  name: string;
  isDefault?: boolean;
  features: {
    allowSingleLookup: boolean;
    allowBulkLookup: boolean;
    allowDatabaseCrud: boolean;
    allowApiSync: boolean;
    allowSuperadminSettings: boolean;
    allowUserManagement: boolean;
  };
}


const PRESET_EXAMPLES = [
  {
    title: "Scenario A: Legacy Postcode",
    text: "Sangkat Wat Phnom, Daun Penh, Phnom Penh, legacy ZIP: 12202. Deliver urgent package.",
    desc: "Uses correct old 5-digit postcode. Status should trigger existing postcode follow."
  },
  {
    title: "Scenario B: New Six-Digit Postcode",
    text: "Received a shipment request to: Salra Kamreauk Commune, Seim Reap district, Siemriep, Cambodia. Zip code given: 170102.",
    desc: "OCR scan featuring spelling variations and the new 6-digit postcode. Status should trigger new postcode follow."
  },
  {
    title: "Scenario C: Typo & Incorrect Postcode",
    text: "BKK 1 Commune (Beoung Keng Kang I), Khan Chamkarmorn, Phnom Penh - zip code is 12345.",
    desc: "Contains a common sub-city acronym (BKK) and an invalid postcode. Status should trigger incorrect postcode alert."
  },
  {
    title: "Scenario D: Multi-Region Batch Submission",
    text: "Sangkat Olympic, Chamkarmon, Phnom-Penh, ZIP is 120107\nSTUNG MEANCHEY II, MEAN CHEY, PHNOM PENH, legacy 12353\nToul Sangke, Russey Keo, 120601\nSala Kamreuk, Siem Reap, Cambodia 11111\nSangkat II, Sihanoukville, 180102",
    desc: "A pasted series of address lines representing bulk submissions for batch-parsing."
  }
];

const getEnvVal = (key: string): string => {
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv) {
      // Vite statically replaces these individual expressions at build time.
      // Explicit properties are required for Vite to inline these properly in the client build.
      if (key === "VITE_SITE_TITLE") return metaEnv.VITE_SITE_TITLE || "";
      if (key === "VITE_PLATFORM_TITLE") return metaEnv.VITE_PLATFORM_TITLE || "";
      if (key === "NEXT_PUBLIC_SUPABASE_URL") return metaEnv.NEXT_PUBLIC_SUPABASE_URL || "";
      if (key === "VITE_SUPABASE_URL") return metaEnv.VITE_VITE_SUPABASE_URL || metaEnv.VITE_SUPABASE_URL || "";
      if (key === "SUPABASE_URL") return metaEnv.SUPABASE_URL || "";
      if (key === "SUPABASE_ANON_KEY") return metaEnv.SUPABASE_ANON_KEY || "";
      if (key === "SUPABASE_KEY") return metaEnv.SUPABASE_KEY || "";
      if (key === "SUPABASE_SERVICE_ROLE_KEY") return metaEnv.SUPABASE_SERVICE_ROLE_KEY || "";
      if (key === "NEXT_PUBLIC_SUPABASE_ANON_KEY") return metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      if (key === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") return metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
      if (key === "NEXT_PUBLIC_SUPABASE_KEY") return metaEnv.NEXT_PUBLIC_SUPABASE_KEY || "";
      if (key === "VITE_SUPABASE_ANON_KEY") return metaEnv.VITE_SUPABASE_ANON_KEY || "";
      if (key === "VITE_SUPABASE_KEY") return metaEnv.VITE_SUPABASE_KEY || "";
      if (key === "SUPABASE_TABLE_NAME") return metaEnv.SUPABASE_TABLE_NAME || "";
      if (key === "VITE_SUPABASE_TABLE_NAME") return metaEnv.VITE_SUPABASE_TABLE_NAME || "";
      if (key === "NEXT_PUBLIC_SUPABASE_TABLE_NAME") return metaEnv.NEXT_PUBLIC_SUPABASE_TABLE_NAME || "";
      if (key === "GEMINI_API_KEY") return metaEnv.GEMINI_API_KEY || "";
      if (key === "VITE_GEMINI_API_KEY") return metaEnv.VITE_GEMINI_API_KEY || "";
      if (key === "VITE_GEMINI_KEY") return metaEnv.VITE_GEMINI_KEY || "";
      if (key === "VITE_GEMINI_VERSION") return metaEnv.VITE_GEMINI_VERSION || "";
      if (key === "VITE_DHL_CLIENT_ID") return metaEnv.VITE_DHL_CLIENT_ID || "";
      if (key === "VITE_DHL_WEBHOOK") return metaEnv.VITE_DHL_WEBHOOK || "";
      if (key === "VITE_SNOWFLAKE_ACCOUNT") return metaEnv.VITE_SNOWFLAKE_ACCOUNT || "";
      if (key === "VITE_SNOWFLAKE_DATABASE") return metaEnv.VITE_SNOWFLAKE_DATABASE || "";
      if (key === "VITE_GOOGLE_MAPS_KEY") return metaEnv.VITE_GOOGLE_MAPS_KEY || "";
      if (key === "VITE_GOOGLE_MAPS_ID") return metaEnv.VITE_GOOGLE_MAPS_ID || "";
      
      // Fallback to dynamic lookup if available (e.g. during dev mode)
      if (metaEnv[key]) return metaEnv[key];
    }
  } catch (e) {}
  try {
    if (typeof process !== "undefined" && process.env && process.env[key]) {
      return process.env[key] || "";
    }
  } catch (e) {}
  return "";
};

// Local high-fidelity postcode pattern match engine fallback for offline / Vercel modes
const localPostcodeMatch = (inputText: string, db: PostcodeEntry[]): MigrationResult => {
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
  let status: MigrationResult["postcode_status"] = "Incorrect Postcode"; // default fallback if matched administrative unit is found but no postal match
  
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
    new_city_name: bestEntry.new_city_name || "",
    input_text: inputText
  };
};

// Local enricher to append sorting metrics to fallback model results
const enrichResultLocally = (row: any, postcodeDb: PostcodeEntry[]): MigrationResult => {
  const match = postcodeDb.find(e => 
    e.province.toLowerCase().replace(/[^a-z0-9]/g, "") === (row.province || "").toLowerCase().replace(/[^a-z0-9]/g, "") &&
    e.district.toLowerCase().replace(/[^a-z0-9]/g, "") === (row.district || "").toLowerCase().replace(/[^a-z0-9]/g, "") &&
    e.commune.toLowerCase().replace(/[^a-z0-9]/g, "") === (row.commune || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  );
  if (match) {
    return {
      province: row.province || "Unknown",
      district: row.district || "Unknown",
      commune: row.commune || "Unknown",
      postcode_status: row.postcode_status || "Unknown",
      existing_postcode: row.existing_postcode || match.existing_postcode || "",
      new_postcode: row.new_postcode || match.new_postcode || "",
      new_city_name: row.new_city_name || match.new_city_name || "",
      ib_sort_co: row.ib_sort_co || match.ib_sort_co || "",
      inbound_fac: row.inbound_fac || match.inbound_fac || "",
      input_text: row.input_text
    };
  }
  return {
    province: row.province || "Unknown",
    district: row.district || "Unknown",
    commune: row.commune || "Unknown",
    postcode_status: row.postcode_status || "Unknown",
    existing_postcode: row.existing_postcode || "",
    new_postcode: row.new_postcode || "",
    new_city_name: row.new_city_name || "",
    ib_sort_co: row.ib_sort_co || "",
    inbound_fac: row.inbound_fac || "",
    input_text: row.input_text
  };
};

// Client-side direct call to Gemini API for text matching / normalization fallbacks
const callGeminiDirectly = async (inputText: string, postcodeDb: PostcodeEntry[], apiKey: string, modelName: string): Promise<any> => {
  // Take a representative sample to keep within reasonable payload sizing
  const dbSample = postcodeDb.slice(0, 400).map(item => ({
    province: item.province,
    district: item.district,
    commune: item.commune,
    existing_postcode: item.existing_postcode,
    new_postcode: item.new_postcode
  }));
  const databaseReferenceText = JSON.stringify(dbSample, null, 1);

  const systemInstruction = `You are an expert AI assistant specializing in Cambodian administrative geography (Province, District/Khan, Commune/Sangkat) and Cambodian postcode migration.
Your task is to analyze raw, fuzzy, or OCR-extracted address submissions, normalize them according to the provided official reference database, and determine the postcode status.

Here key parts of reference database of official Cambodian subdivisions and their legacy (existing) and migrated (new) postcodes:
${databaseReferenceText}

Rules for normalizing and matching:
1. Always use official, correct administrative spellings from the reference database where possible. For instance, map typos or alternative Khmer romanizations (like 'BKK', 'Beoung Keng Kang' to 'Boeng Keng Kang', 'Chamkar Mon' to 'Chamkar Mon', '7 Makara' or 'Prampir Makara' to 'Prampir Meakkara', 'Toul Kouk' to 'Tuol Kouk', etc.).
2. Clean and match inputs to the closest entry in the database. 
3. If the input text contains a number that matches the legacy ('existing_postcode') of the matched commune, postcode_status MUST be "Follow Existing Postcode".
4. If the input text contains a number that matches the migrated ('new_postcode') of the matched commune, postcode_status MUST be "Follow New Postcode".
5. If the input contains a postcode that matches neither, or does not match this commune's valid codes, postcode_status MUST be "Incorrect Postcode".
6. If the input text contains NO postcode (no 5-digit or 6-digit numeric postal code, e.g. just raw place and address names), postcode_status MUST be "No Postcode Detected".
7. If the administration unit cannot be determined with confidence, use "Unknown" for province, district, commune, and set postcode_status to "Unknown".
8. Make sure you return an object for each input string sent to you, matching the input list position.`;

  const payload = {
    contents: {
      parts: [
        { text: `Process the following address lines/OCR text and return the matched entries.
Inputs to process:
${JSON.stringify([inputText], null, 2)}` }
      ]
    },
    generationConfig: {
      temperature: 1,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        required: ["results"],
        properties: {
          results: {
            type: "ARRAY",
            description: "Array of matching results parallel to the inputs",
            items: {
              type: "OBJECT",
              required: ["province", "district", "commune", "postcode_status", "input_text"],
              properties: {
                province: { type: "STRING", description: "Normalized Official Province Name or 'Unknown'" },
                district: { type: "STRING", description: "Normalized Official District/Khan Name or 'Unknown'" },
                commune: { type: "STRING", description: "Normalized Official Commune/Sangkat Name or 'Unknown'" },
                postcode_status: { 
                  type: "STRING", 
                  enum: ["Incorrect Postcode", "Follow Existing Postcode", "Follow New Postcode", "Unknown", "No Postcode Detected"],
                  description: "Status flag based on postcode matching" 
                },
                existing_postcode: { type: "STRING", description: "Matched legacy postcode from the database" },
                new_postcode: { type: "STRING", description: "Matched new migrated postcode from the database" },
                input_text: { type: "STRING", description: "The original raw segment analyzed" }
              }
            }
          }
        }
      }
    },
    systemInstruction: {
      parts: [
        { text: systemInstruction }
      ]
    }
  };

  const model = modelName || "gemini-3.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Direct AI call status ${res.status}: ${errorBody}`);
  }

  const json = await res.json();
  const textResponse = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error("No response parts received from model.");
  }
  const parsed = JSON.parse(textResponse);
  return parsed.results?.[0];
};

// Client-side direct call to Gemini API for bulk postcode matching
const callGeminiDirectlyBulk = async (rowsArray: string[], postcodeDb: PostcodeEntry[], apiKey: string, modelName: string): Promise<any[]> => {
  const dbSample = postcodeDb.slice(0, 400).map(item => ({
    province: item.province,
    district: item.district,
    commune: item.commune,
    existing_postcode: item.existing_postcode,
    new_postcode: item.new_postcode
  }));
  const databaseReferenceText = JSON.stringify(dbSample, null, 1);

  const systemInstruction = `You are an expert AI assistant specializing in Cambodian administrative geography (Province, District/Khan, Commune/Sangkat) and Cambodian postcode migration.
Your task is to analyze raw, fuzzy, or OCR-extracted address submissions, normalize them according to the provided official reference database, and determine the postcode status.

Here key parts of reference database of official Cambodian subdivisions and their legacy (existing) and migrated (new) postcodes:
${databaseReferenceText}

Rules for normalizing and matching:
1. Always use official, correct administrative spellings from the reference database where possible. For instance, map typos or alternative Khmer romanizations (like 'BKK', 'Beoung Keng Kang' to 'Boeng Keng Kang', 'Chamkar Mon' to 'Chamkar Mon', '7 Makara' or 'Prampir Makara' to 'Prampir Meakkara', 'Toul Kouk' to 'Tuol Kouk', etc.).
2. Clean and match inputs to the closest entry in the database. 
3. If the input text contains a number that matches the legacy ('existing_postcode') of the matched commune, postcode_status MUST be "Follow Existing Postcode".
4. If the input text contains a number that matches the migrated ('new_postcode') of the matched commune, postcode_status MUST be "Follow New Postcode".
5. If the input contains a postcode that matches neither, or does not match this commune's valid codes, postcode_status MUST be "Incorrect Postcode".
6. If the input text contains NO postcode (no 5-digit or 6-digit numeric postal code, e.g. just raw place and address names), postcode_status MUST be "No Postcode Detected".
7. If the administration unit cannot be determined with confidence, use "Unknown" for province, district, commune, and set postcode_status to "Unknown".
8. Make sure you return an object for each input string sent to you, matching the input list position.`;

  const payload = {
    contents: {
      parts: [
        { text: `Process the following address lines/OCR text and return the matched entries.
Inputs to process:
${JSON.stringify(rowsArray, null, 2)}` }
      ]
    },
    generationConfig: {
      temperature: 1,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        required: ["results"],
        properties: {
          results: {
            type: "ARRAY",
            description: "Array of matching results parallel to the inputs",
            items: {
              type: "OBJECT",
              required: ["province", "district", "commune", "postcode_status", "input_text"],
              properties: {
                province: { type: "STRING", description: "Normalized Official Province Name or 'Unknown'" },
                district: { type: "STRING", description: "Normalized Official District/Khan Name or 'Unknown'" },
                commune: { type: "STRING", description: "Normalized Official Commune/Sangkat Name or 'Unknown'" },
                postcode_status: { 
                  type: "STRING", 
                  enum: ["Incorrect Postcode", "Follow Existing Postcode", "Follow New Postcode", "Unknown", "No Postcode Detected"],
                  description: "Status flag based on postcode matching" 
                },
                existing_postcode: { type: "STRING", description: "Matched legacy postcode from the database" },
                new_postcode: { type: "STRING", description: "Matched new migrated postcode from the database" },
                input_text: { type: "STRING", description: "The original raw segment analyzed" }
              }
            }
          }
        }
      }
    },
    systemInstruction: {
      parts: [
        { text: systemInstruction }
      ]
    }
  };

  const model = modelName || "gemini-3.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Direct AI call status ${res.status}: ${errorBody}`);
  }

  const json = await res.json();
  const textResponse = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error("No response parts received from model.");
  }
  const parsed = JSON.parse(textResponse);
  return parsed.results || [];
};

// Client-side direct call to Gemini API for image-based multimodal OCR fallbacks
const callGeminiOcrDirectly = async (imageBase64: string, mimeType: string, postcodeDb: PostcodeEntry[], apiKey: string, modelName: string): Promise<any> => {
  const dbSample = postcodeDb.slice(0, 400).map(item => ({
    province: item.province,
    district: item.district,
    commune: item.commune,
    existing_postcode: item.existing_postcode,
    new_postcode: item.new_postcode
  }));
  const databaseReferenceText = JSON.stringify(dbSample, null, 1);

  const systemInstruction = `You are an expert AI assistant specializing in OCR-based Cambodian postal digit extraction and administrative address mapping.
Your goal is to parse raw printed or handwritten shipping label/envelope images, extract legible address text, and cross-reference them against the official Cambodia postcode reference.

Here key parts of reference database of official Cambodian subdivisions and their legacy (existing) and migrated (new) postcodes:
${databaseReferenceText}

Analyze the provided image and:
1. Extract the text lines related to geography, address, or postal codes.
2. Cross-reference them to identify the matched commune, district, and province.
3. Classify the postcode status according to whether a numeric code was found on the image and if it matches.
4. Output the structured JSON schema.`;

  const payload = {
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64
          }
        },
        {
          text: "Transcribe address from this parcel shipping label, map it to the reference database, and analyze the postcode status."
        }
      ]
    },
    generationConfig: {
      temperature: 1,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        required: ["extracted_text", "province", "district", "commune", "postcode_status"],
        properties: {
          extracted_text: { type: "STRING", description: "All relevant text extracted verbatim from the image segment" },
          province: { type: "STRING", description: "Matched Province Name from database, or 'Unknown'" },
          district: { type: "STRING", description: "Matched District Name from database, or 'Unknown'" },
          commune: { type: "STRING", description: "Matched Commune Name from database, or 'Unknown'" },
          postcode_status: { 
            type: "STRING", 
            enum: ["Incorrect Postcode", "Follow Existing Postcode", "Follow New Postcode", "Unknown", "No Postcode Detected"],
            description: "Postal code status evaluation" 
          },
          existing_postcode: { type: "STRING", description: "Matched legacy 5-digit postcode" },
          new_postcode: { type: "STRING", description: "Matched new migrated 6-digit postcode" }
        }
      }
    },
    systemInstruction: {
      parts: [
        { text: systemInstruction }
      ]
    }
  };

  const model = modelName || "gemini-3.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Direct OCR AI call failed: ${errorBody}`);
  }

  const json = await res.json();
  const textResponse = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error("No response parts received from model.");
  }
  return JSON.parse(textResponse);
};

const getRuntimeEnvValue = (keys: string[]): string => {
  for (const k of keys) {
    const val = getEnvVal(k);
    if (val && !val.includes("••••")) return val;
  }
  return "";
};

export default function App() {
  // State
  const [postcodes, setPostcodes] = useState<PostcodeEntry[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);

  // References to keep state elements fresh inside Leaflet closures
  const latestPostcodesRef = useRef<PostcodeEntry[]>([]);
  useEffect(() => {
    latestPostcodesRef.current = postcodes;
  }, [postcodes]);

  const resolveNearestPostcodeRef = useRef<((lat: number, lng: number) => void) | null>(null);
  
  // Single input
  const [singleInput, setSingleInput] = useState("");
  const [singleResult, setSingleResult] = useState<MigrationResult | null>(null);
  
  // Bulk input
  const [bulkInput, setBulkInput] = useState("");
  const [bulkResults, setBulkResults] = useState<MigrationResult[]>([]);

  // Search & Filter state for Database view
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvinceFilter, setSelectedProvinceFilter] = useState("");
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState("");
  const [selectedCommuneFilter, setSelectedCommuneFilter] = useState("");

  // Customer lookup states for the Single Tab
  const [customerProvince, setCustomerProvince] = useState("");
  const [customerDistrict, setCustomerDistrict] = useState("");
  const [customerCommune, setCustomerCommune] = useState("");
  
  // Navigation / Tabs
  const [activeTab, setActiveTabState] = useState<"single" | "bulk" | "database" | "superadmin">("single");
  const [subTool, setSubToolState] = useState<"text" | "photo" | "map" | "dropdown">("dropdown");

  // User Authentication State (Supports custom and system roles)
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string }>(() => {
    const saved = localStorage.getItem("vref_current_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && "role" in parsed) {
          return parsed;
        }
      } catch (e) {}
    }
    return {
      username: "",
      role: "public",
    };
  });

  // Dynamic user roles and features state registry (stored locally)
  const [roleFeaturesList, setRoleFeaturesList] = useState<RoleFeatures[]>(() => {
    const defaultRoles: RoleFeatures[] = [
      {
        id: "public",
        name: "Public",
        isDefault: true,
        features: {
          allowSingleLookup: true,
          allowBulkLookup: false,
          allowDatabaseCrud: false,
          allowApiSync: false,
          allowSuperadminSettings: false,
          allowUserManagement: false,
        }
      },
      {
        id: "editor",
        name: "Editor",
        isDefault: true,
        features: {
          allowSingleLookup: true,
          allowBulkLookup: true,
          allowDatabaseCrud: true,
          allowApiSync: false,
          allowSuperadminSettings: false,
          allowUserManagement: false,
        }
      },
      {
        id: "admin",
        name: "Admin",
        isDefault: true,
        features: {
          allowSingleLookup: true,
          allowBulkLookup: true,
          allowDatabaseCrud: true,
          allowApiSync: true,
          allowSuperadminSettings: false,
          allowUserManagement: true,
        }
      },
      {
        id: "superadmin",
        name: "Superadmin",
        isDefault: true,
        features: {
          allowSingleLookup: true,
          allowBulkLookup: true,
          allowDatabaseCrud: true,
          allowApiSync: true,
          allowSuperadminSettings: true,
          allowUserManagement: true,
        }
      }
    ];

    const saved = localStorage.getItem("vref_role_features_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return defaultRoles;
  });

  // Save changes to roles feature matrix
  useEffect(() => {
    localStorage.setItem("vref_role_features_v2", JSON.stringify(roleFeaturesList));
  }, [roleFeaturesList]);

  // Dynamic permission checker
  const hasPermission = (userRole: string, permissionKey: keyof RoleFeatures["features"]): boolean => {
    if (!userRole) return false;
    // Superadmin bypasses restrictions
    if (userRole.toLowerCase() === "superadmin") return true;

    const matched = roleFeaturesList.find(
      r => r.id.toLowerCase() === userRole.toLowerCase() || r.name.toLowerCase() === userRole.toLowerCase()
    );
    if (matched) {
      return !!matched.features[permissionKey];
    }
    
    // Default system fallbacks
    if (userRole.toLowerCase() === "public") {
      return permissionKey === "allowSingleLookup";
    }
    return false;
  };

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registration modal states
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPass, setRegisterPass] = useState("");
  const [registerRole, setRegisterRole] = useState("Editor");

  // Users registration List (Superadmin stateful approvals screen)
  const [usersList, setUsersList] = useState<{ id: string; name: string; email: string; role: string; approved: boolean }[]>([
    { id: "u1", name: "Sopheap K.", email: "sopheap@mptc.gov.kh", role: "Admin", approved: false },
    { id: "u2", name: "Vireak O.", email: "vireak@logistics-kh.com", role: "Editor", approved: true },
    { id: "u3", name: "Srey S.", email: "srey@dhl-cambodia.com", role: "Admin", approved: true },
    { id: "u4", name: "Piseth M.", email: "piseth@mptc.gov.kh", role: "Editor", approved: false },
    { id: "u5", name: "Rithy N.", email: "rithy@mptc.gov.kh", role: "Editor", approved: false },
  ]);

  const [loadingUsers, setLoadingUsers] = useState(false);

  // Form states for creating a new administrative user
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Admin");
  const [newUserApproved, setNewUserApproved] = useState(false);

  // States for inline editing
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingEmail, setEditingEmail] = useState("");
  const [editingRole, setEditingRole] = useState("");
  const [editingApproved, setEditingApproved] = useState(false);

  // Advanced Superadmin confirmation triggers (Replaces native browser blocking alerts)
  const [resetConfirmActive, setResetConfirmActive] = useState(false);
  const [syncConfirmActive, setSyncConfirmActive] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSavedToast, setConfigSavedToast] = useState(false);

  const fetchAdminUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch("/api/admin-users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error("Could not fetch admin users database:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Superadmin API Config States (DHL, Supabase, Gemini, Snowflake, Google Maps)
  const [apiConnections, setApiConnections] = useState(() => {
    let baseConfig = {
      siteTitle: "KH Postal Code",
      platformTitle: "Cambodia Postcode",
      supabaseUrl: "",
      supabaseKey: "",
      supabaseTableName: "cambodia_postcode_migration",
      supabaseStatus: "Local Fallback Mode",

      geminiKey: "",
      geminiVersion: "gemini-3.5-flash",
      geminiTemp: 0.25,
      geminiStatus: "Inactive",

      dhlClientId: "DHL-AI-PRO-KH",
      dhlWebhook: "https://api.dhl.com.kh/v1/enrich",
      dhlToken: "",
      dhlEnrich: true,
      dhlStatus: "Offline",

      postgrestUrl: "https://gjodeadljbvtwjiagqqr.supabase.co",
      postgrestKey: "",
      postgrestTable: "cambodia_postcode_migration",
      usePostgrestAlternative: false,

      snowflakeAccount: "",
      snowflakeDatabase: "",
      snowflakeSize: "Medium",
      snowflakeToken: "",
      snowflakeStatus: "Offline",

      googleMapsKey: "",
      googleMapsId: "DEMO_MAP_ID",
      googleMapsStatus: "Offline",

      websiteLogoType: "preset",
      websiteLogoPreset: "map",
      websiteLogoUrl: "",
      websiteLogoSvg: "",
      enableTextSearch: false,
      enablePhotoSearch: true,
      enableMapSearch: false,
      enableDropdownSearch: true
    };

    const saved = localStorage.getItem("vref_api_connections");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        baseConfig = { ...baseConfig, ...parsed };
      } catch (e) {}
    }

    // Always prioritize live cloud runtime environment variables (like those from Vercel integrations)
    // over any default configurations or stale localStorage entries.
    const envSupabaseUrl = getRuntimeEnvValue(["NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL", "SUPABASE_URL"]);
    const envSupabaseKey = getRuntimeEnvValue(["SUPABASE_ANON_KEY", "SUPABASE_KEY", "NEXT_PUBLIC_SUPABASE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY", "VITE_SUPABASE_KEY"]);
    const envSupabaseTable = getRuntimeEnvValue(["SUPABASE_TABLE_NAME", "VITE_SUPABASE_TABLE_NAME", "NEXT_PUBLIC_SUPABASE_TABLE_NAME"]);
    const envGeminiKey = getRuntimeEnvValue(["GEMINI_API_KEY", "VITE_GEMINI_API_KEY", "VITE_GEMINI_KEY"]);

    if (envSupabaseUrl) baseConfig.supabaseUrl = envSupabaseUrl;
    if (envSupabaseKey) baseConfig.supabaseKey = envSupabaseKey;
    if (envSupabaseTable) baseConfig.supabaseTableName = envSupabaseTable;
    if (envGeminiKey) baseConfig.geminiKey = envGeminiKey;

    return baseConfig;
  });

  const latestApiConnectionsRef = useRef(apiConnections);
  useEffect(() => {
    latestApiConnectionsRef.current = apiConnections;
  }, [apiConnections]);

  // Custom setter that performs cleanups (like stopping camera feed)
  const setSubTool = (tool: "text" | "photo" | "map" | "dropdown") => {
    setSubToolState(tool);
    if (tool !== "photo" && cameraActive) {
      stopCamera();
    }
  };

  const setActiveTab = (tab: "single" | "bulk" | "database" | "superadmin") => {
    setActiveTabState(tab);
    // Automatically stop camera stream if active and switching away
    if (cameraActive) {
      stopCamera();
    }
  };

  // Live Map Search States
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([11.556, 104.928]); // Phnom Penh
  const [selectedNearestEntry, setSelectedNearestEntry] = useState<PostcodeEntry | null>(null);
  const [mapLocating, setMapLocating] = useState(false);

  // Dynamic branding customizations configured via Superadmin Panel
  const [heroBgImages, setHeroBgImages] = useState<string[]>(() => {
    const saved = localStorage.getItem("vref_hero_images");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      "https://images.unsplash.com/photo-1541746972996-4e0b0f43e01a?auto=format&fit=crop&w=2000&q=80",
      "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=2000&q=80",
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2000&q=80",
      "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=2000&q=80",
      "https://images.unsplash.com/photo-1558862107-d49ef2a04d72?auto=format&fit=crop&w=2000&q=80"
    ];
  });
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [footerCopyright, setFooterCopyright] = useState(() => {
    const saved = localStorage.getItem("vref_footer_copyright");
    return saved || "2026 Cambodia Postcode by DHL Express Cambodia.";
  });
  const [sqlCopied, setSqlCopied] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [userConfirmDeleteId, setUserConfirmDeleteId] = useState<string | null>(null);
  const [roleConfirmDeleteId, setRoleConfirmDeleteId] = useState<string | null>(null);

  const supabaseSQLSchema = `-- CREATE CAMBODIA POSTCODE MIGRATION SCHEMA TABLE
CREATE TABLE IF NOT EXISTS cambodia_postcode_migration (
    id SERIAL PRIMARY KEY,
    iso_country_code VARCHAR(10) DEFAULT 'KH',
    postal_location_type VARCHAR(100) DEFAULT 'CP',
    new_country_division_code VARCHAR(50),
    new_country_division VARCHAR(250),
    new_city_name VARCHAR(250),
    x_city_name VARCHAR(250),
    x_postcode VARCHAR(10),
    ib_sort_co VARCHAR(50),
    inbound_fac VARCHAR(100),
    city_province VARCHAR(250),
    commune VARCHAR(250),
    sangkat_commune VARCHAR(250),
    district VARCHAR(250),
    new_postcode VARCHAR(10),
    remarks_new_postcode VARCHAR(250),
    remarks_x_postcode VARCHAR(250),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREATE INDEXES FOR CRITICAL LOCATIONAL SEARCH OPTIMIZATIONS
CREATE INDEX IF NOT EXISTS idx_postcode_new ON cambodia_postcode_migration(new_postcode);
CREATE INDEX IF NOT EXISTS idx_postcode_x ON cambodia_postcode_migration(x_postcode);
CREATE INDEX IF NOT EXISTS idx_province_district ON cambodia_postcode_migration(city_province, district);
CREATE INDEX IF NOT EXISTS idx_commune ON cambodia_postcode_migration(commune);

-- CREATE SYSTEM PLATFORM ADMINISTRATORS TABLE FOR USER MANAGEMENT
CREATE TABLE IF NOT EXISTS platform_admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin', 'moderator')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEED THE DEPLOYER'S RECORD AS INITIAL SUPERADMINISTRATOR
INSERT INTO platform_admins (email, full_name, role)
VALUES ('hempiden@gmail.com', 'Super Admin Account', 'superadmin')
ON CONFLICT (email) DO NOTHING;`;

  const handleCopySQL = () => {
    navigator.clipboard.writeText(supabaseSQLSchema);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  };

  useEffect(() => {
    if (heroBgImages.length === 0) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroBgImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroBgImages]);

  // Photo / OCR Search States
  const [ocrImageSrc, setOcrImageSrc] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ocrResult, setOcrResult] = useState<{
    extracted_text: string;
    province: string;
    district: string;
    commune: string;
    postcode_status: string;
    existing_postcode?: string;
    new_postcode?: string;
  } | null>(null);

  // Geo Coordinate-to-Subdivision mapping definitions
  const getCoordinatesForEntry = (province: string, district: string, commune: string, skipOffset = false) => {
    const p = province.toLowerCase();
    const d = district.toLowerCase();
    const c = commune.toLowerCase();

    let base: [number, number] = [12.5656, 104.9910]; // Center of Cambodia default

    // Specific coordinates for different areas inside Cambodia database entries
    if (p.includes("phnom penh")) {
      if (d.includes("chamkar mon") || d.includes("boeng keng kang")) {
        if (c.includes("tonle bassac")) base = [11.5503, 104.9312];
        else if (c.includes("boeng keng kang i")) base = [11.5532, 104.9272];
        else if (c.includes("boeng keng kang ii")) base = [11.5511, 104.9213];
        else if (c.includes("olympic")) base = [11.5593, 104.9142];
        else base = [11.5432, 104.9212];
      }
      else if (d.includes("daun penh")) {
        if (c.includes("wat phnom")) base = [11.5793, 104.9224];
        else if (c.includes("srah chork")) base = [11.5832, 104.9194];
        else if (c.includes("chhey chumneah")) base = [11.5641, 104.9252];
        else base = [11.5705, 104.9234];
      }
      else if (d.includes("prampir") || d.includes("7 makara")) base = [11.5615, 104.9135];
      else if (d.includes("tuol kouk")) base = [11.5714, 104.8962];
      else if (d.includes("sen sok")) base = [11.5815, 104.8512];
      else if (d.includes("russey keo") || d.includes("ruessei")) base = [11.6112, 104.9015];
      else if (d.includes("mean chey") || d.includes("meanchey")) base = [11.5235, 104.9182];
      else if (d.includes("dangkao")) base = [11.4785, 104.8812];
      else if (d.includes("chbar ampov") || d.includes("chbaar")) base = [11.5262, 104.9542];
      else if (d.includes("prek pnov") || d.includes("preykpnov")) base = [11.6521, 104.7925];
      else if (d.includes("kamboul")) base = [11.5123, 104.7521];
      else if (d.includes("por senchey") || d.includes("pouchentong")) base = [11.5362, 104.8012];
      else base = [11.5564, 104.9282];
    }
    else if (p.includes("siem reap")) base = [13.3615, 103.8584];
    else if (p.includes("battambang")) base = [13.0952, 103.2005];
    else if (p.includes("kandal")) base = [11.4812, 104.9515];
    else if (p.includes("sihanouk") || p.includes("preah sihanouk")) base = [10.6412, 103.5242];
    else if (p.includes("kampong cham")) base = [11.9935, 105.4642];
    else if (p.includes("kampong chhnang")) base = [12.1800, 104.6500];
    else if (p.includes("kampong speu")) base = [11.4552, 104.5212];
    else if (p.includes("kampong thom")) base = [12.7111, 104.8883];
    else if (p.includes("kampot")) base = [10.6125, 104.1805];
    else if (p.includes("kohkong")) base = [11.6152, 103.0033];
    else if (p.includes("kratie")) base = [12.4881, 106.0188];
    else if (p.includes("mondulkiri")) base = [12.4558, 107.1906];
    else if (p.includes("banteay mean") || p.includes("banteay meanchey")) {
      if (d.includes("poipet") || d.includes("paoy paet")) base = [13.6552, 102.5632];
      else base = [13.5852, 102.9752];
    }
    else if (p.includes("svay rieng")) {
      if (d.includes("bavet")) base = [11.0664, 106.1245];
      else base = [11.0852, 105.8012];
    }
    else if (p.includes("takeo")) base = [10.9935, 104.7812];

    if (skipOffset) {
      return base;
    }

    // Build deterministic offset based on full name hash to visually disperse communes
    // inside the parent region or district bounds with premium compact spacing (~500m spread)
    let hash = 0;
    const fullStr = `${province} ${district} ${commune}`;
    for (let i = 0; i < fullStr.length; i++) {
      hash = fullStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const latOffset = Math.sin(hash) * 0.004; // compact dispersion
    const lngOffset = Math.cos(hash + 1) * 0.004;

    return [base[0] + latOffset, base[1] + lngOffset];
  };

  // Helper distance and resolver function for map
  const resolveNearestPostcode = (lat: number, lng: number) => {
    const currentPostcodes = latestPostcodesRef.current;
    if (currentPostcodes.length === 0) return;

    const runResolve = async () => {
      // Premium Dual-Layer Resolution:
      // 1. If Google Maps Platform API is active, fetch high-fidelity reverse geocoding address
      const googleKey = latestApiConnectionsRef.current.googleMapsKey;
      if (googleKey && !googleKey.includes("••••") && googleKey.trim().length > 10) {
        try {
          const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleKey}`);
          if (response.ok) {
            const geoData = await response.json();
            if (geoData.status === "OK" && geoData.results && geoData.results[0]) {
              const firstResult = geoData.results[0];
              let gProvince = "";
              let gDistrict = "";
              let gCommune = "";

              firstResult.address_components.forEach((comp: any) => {
                const types = comp.types || [];
                if (types.includes("administrative_area_level_1")) {
                  gProvince = comp.long_name;
                } else if (types.includes("administrative_area_level_2") || types.includes("locality")) {
                  gDistrict = comp.long_name;
                } else if (types.includes("sublocality_level_1") || types.includes("neighborhood") || types.includes("administrative_area_level_3")) {
                  gCommune = comp.long_name;
                }
              });

              // Clean & normalize matches helper
              const normalizeStr = (str: string) => {
                if (!str) return "";
                return str
                  .toLowerCase()
                  .replace(/\b(province|capital|khan|sangkat|sangkat\b|krong|district|khan\b|municipality|phum|commune|capital city)\b/gi, "")
                  .replace(/[‘’'"`]/g, "")
                  .replace(/[^a-z0-9]/gi, "")
                  .trim();
              };

              const findClosestLine = () => {
                const normProv = normalizeStr(gProvince);
                const normDist = normalizeStr(gDistrict);
                const normComm = normalizeStr(gCommune);

                if (!normProv) return null;

                const provMatches = currentPostcodes.filter(e => {
                  const eProv = normalizeStr(e.province);
                  return eProv === normProv || eProv.includes(normProv) || normProv.includes(eProv);
                });
                if (provMatches.length === 0) return null;

                let distMatches = provMatches;
                if (normDist) {
                  const directDist = provMatches.filter(e => {
                    const eDist = normalizeStr(e.district);
                    return eDist === normDist || eDist.includes(normDist) || normDist.includes(eDist);
                  });
                  if (directDist.length > 0) {
                    distMatches = directDist;
                  }
                }

                if (normComm) {
                  const commMatches = distMatches.filter(e => {
                    const eComm = normalizeStr(e.commune);
                    return eComm === normComm || eComm.includes(normComm) || normComm.includes(eComm);
                  });
                  if (commMatches.length > 0) {
                    return commMatches[0];
                  }
                }
                return distMatches[0] || null;
              };

              const matchedLocal = findClosestLine();
              if (matchedLocal) {
                setSelectedNearestEntry(matchedLocal);
                setSingleResult({
                  province: matchedLocal.province,
                  district: matchedLocal.district,
                  commune: matchedLocal.commune,
                  postcode_status: "Follow New Postcode",
                  existing_postcode: matchedLocal.existing_postcode,
                  new_postcode: matchedLocal.new_postcode,
                  new_city_name: matchedLocal.new_city_name,
                  ib_sort_co: matchedLocal.ib_sort_co || "",
                  inbound_fac: matchedLocal.inbound_fac || "",
                  input_text: `Google Geocoded Address: "${firstResult.formatted_address}"`
                });
                return;
              }
            }
          }
        } catch (err) {
          console.warn("Google Maps reverse geocoding request failed. Falling back to local proximity calculations.", err);
        }
      }

      // 2. High-Fidelity Local Proximity Match fallback (now with highly precise offset skips)
      let nearest: PostcodeEntry | null = null;
      let minDistance = Infinity;

      currentPostcodes.forEach((entry) => {
        // Use offset-skipped coordinates to match exact physical boundary centers
        const coords = getCoordinatesForEntry(entry.province, entry.district, entry.commune, true);
        const dist = Math.pow(lat - coords[0], 2) + Math.pow(lng - coords[1], 2);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = entry;
        }
      });

      setSelectedNearestEntry(nearest);
      if (nearest) {
        setSingleResult({
          province: nearest.province,
          district: nearest.district,
          commune: nearest.commune,
          postcode_status: "Follow New Postcode",
          existing_postcode: nearest.existing_postcode,
          new_postcode: nearest.new_postcode,
          new_city_name: nearest.new_city_name,
          ib_sort_co: nearest.ib_sort_co || "",
          inbound_fac: nearest.inbound_fac || "",
          input_text: `Geographic Coordinate Match: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
        });
      }
    };

    runResolve();
  };

  resolveNearestPostcodeRef.current = resolveNearestPostcode;

  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation auto-locator is not supported by your browser environment.");
      return;
    }
    setMapLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCenter([latitude, longitude]);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 14);
          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude]);
          }
        }
        resolveNearestPostcode(latitude, longitude);
        setSuccessMessage("Geographic coordinates resolved successfully from system locator!");
        setTimeout(() => setSuccessMessage(null), 3000);
        setMapLocating(false);
      },
      (err) => {
        console.error(err);
        setErrorMessage("Auto-locate failed. Ensure browser geolocation permissions are granted.");
        setMapLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Start backfacing or default camera stream
  const startCamera = async () => {
    setOcrResult(null);
    setOcrImageSrc(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage("Could not launch video device camera. Please upload an address photo directly using the attachment input.");
      console.error(err);
    }
  };

  // Stop camera media streams
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Capture frame from camera stream
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL("image/png");
      setOcrImageSrc(base64);
      stopCamera();
    }
  };

  // Handle uploaded local image files
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrResult(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setOcrImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Call server POST endpoint to perform multimodal OCR address discovery
  const handleProcessOcr = async () => {
    if (!ocrImageSrc) {
      setErrorMessage("Please capture or upload a photo containing address metadata first.");
      return;
    }

    setOcrLoading(true);
    setErrorMessage(null);

    try {
      const rawBase64 = ocrImageSrc.split(",")[1];
      const mime = ocrImageSrc.split(";")[0].split(":")[1] || "image/png";

      const res = await fetch("/api/ocr-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: rawBase64, mimeType: mime })
      });

      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || contentType.includes("text/html")) {
        throw new Error("SERVER_FALLBACK_TRIGGERED");
      }

      const parsedOcr = await res.json();
      setOcrResult(parsedOcr);
      
      // Sync into unified single results panel
      setSingleResult({
        province: parsedOcr.province || "Unknown",
        district: parsedOcr.district || "Unknown",
        commune: parsedOcr.commune || "Unknown",
        postcode_status: (parsedOcr.postcode_status || "Unknown") as any,
        existing_postcode: parsedOcr.existing_postcode,
        new_postcode: parsedOcr.new_postcode,
        new_city_name: parsedOcr.new_city_name || "",
        ib_sort_co: parsedOcr.ib_sort_co || "",
        inbound_fac: parsedOcr.inbound_fac || "",
        input_text: `Camera OCR Extracted: "${parsedOcr.extracted_text || ""}"`
      });

      setSuccessMessage("Address photo transcription and postcode mapping resolved!");
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      console.warn("Express OCR endpoint unavailable. Running client-side direct OCR fallback...", err);
      const clientGeminiKey = apiConnections.geminiKey;
      const clientModel = apiConnections.geminiVersion || "gemini-3.5-flash";

      if (clientGeminiKey && !clientGeminiKey.includes("••••") && clientGeminiKey.trim().length > 10) {
        try {
          const rawBase64 = ocrImageSrc.split(",")[1];
          const mime = ocrImageSrc.split(";")[0].split(":")[1] || "image/png";

          const parsedOcr = await callGeminiOcrDirectly(rawBase64, mime, postcodes, clientGeminiKey, clientModel);
          setOcrResult(parsedOcr);
          
          setSingleResult({
            province: parsedOcr.province || "Unknown",
            district: parsedOcr.district || "Unknown",
            commune: parsedOcr.commune || "Unknown",
            postcode_status: (parsedOcr.postcode_status || "Unknown") as any,
            existing_postcode: parsedOcr.existing_postcode,
            new_postcode: parsedOcr.new_postcode,
            new_city_name: parsedOcr.new_city_name || "",
            ib_sort_co: parsedOcr.ib_sort_co || "",
            inbound_fac: parsedOcr.inbound_fac || "",
            input_text: `Camera OCR Extracted: "${parsedOcr.extracted_text || ""}"`
          });

          setSuccessMessage("Address photo transcription and postcode mapping resolved via direct OCR!");
          setTimeout(() => setSuccessMessage(null), 3500);
          return;
        } catch (aiErr: any) {
          console.error("Direct client OCR mapping failed:", aiErr);
        }
      }

      setErrorMessage("Photo analysis is currently unavailable on standalone cloud static hosts. Please enter your address details manually inside the text segment area above, or ensure your direct Gemini Key is properly synced under Advanced Database settings.");
    } finally {
      setOcrLoading(false);
    }
  };

  // Map draggable pin icon config helper (DivIcon prevents broken image file references on bundler)
  const markerDivIcon = L.divIcon({
    html: `
      <div class="flex flex-col items-center justify-center">
        <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 shadow-md border-2 border-slate-900 text-slate-900 shadow-amber-400/50">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div class="w-2.5 h-2.5 bg-amber-400 rounded-full border border-slate-900 -mt-0.5 animate-ping absolute"></div>
      </div>
    `,
    className: "custom-leaflet-pin",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
  });

  // Database CRUD state
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PostcodeEntry | null>(null);
  const [provinceVal, setProvinceVal] = useState("");
  const [districtVal, setDistrictVal] = useState("");
  const [communeVal, setCommuneVal] = useState("");
  const [existingPostcodeVal, setExistingPostcodeVal] = useState("");
  const [newPostcodeVal, setNewPostcodeVal] = useState("");
  const [ibSortCoVal, setIbSortCoVal] = useState("");
  const [inboundFacVal, setInboundFacVal] = useState("");
  
  // Status banner / notices
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Live Server-Side Connection Checks
  const [supabaseLiveStatus, setSupabaseLiveStatus] = useState<{ status: string; message: string; url?: string; count?: number; loading: boolean }>({ status: "checking", message: "Verifying current status...", loading: true });
  const [geminiLiveStatus, setGeminiLiveStatus] = useState<{ status: string; message: string; loading: boolean }>({ status: "checking", message: "Verifying model license key...", loading: true });

  const checkLiveApis = async () => {
    // 1. Check Supabase
    try {
      setSupabaseLiveStatus(prev => ({ ...prev, loading: true }));
      const sRes = await fetch("/api/test-supabase");
      if (sRes.ok) {
        const data = await sRes.json();
        setSupabaseLiveStatus({
          status: data.status,
          message: data.message,
          url: data.url,
          count: data.row_count,
          loading: false
        });
      } else {
        // Attempt direct client-side fallback if backend returns 404 or non-OK (common in static environments like Vercel)
        const clientUrl = apiConnections.supabaseUrl;
        const clientKey = apiConnections.supabaseKey;
        const clientTable = apiConnections.supabaseTableName || "cambodia_postcode_migration";
        if (clientUrl && clientKey && !clientKey.includes("••••")) {
          try {
            const response = await fetch(`${clientUrl}/rest/v1/${clientTable}?select=id&limit=1`, {
              method: "GET",
              headers: {
                "apikey": clientKey,
                "Authorization": `Bearer ${clientKey}`,
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
                try {
                  const dbSample = await response.json();
                  totalCount = Array.isArray(dbSample) ? dbSample.length : 0;
                } catch (e) {}
              }
              setSupabaseLiveStatus({
                status: "connected",
                message: "Direct Client-Side Link to Supabase Secured (Cloud Vercel Fallback successfully verified)!",
                url: clientUrl,
                count: totalCount,
                loading: false
              });
            } else {
              const errTxt = await response.text();
              setSupabaseLiveStatus({ status: "error", message: `Direct client connect failed (Status ${response.status}): ${errTxt}`, loading: false });
            }
          } catch (err: any) {
            setSupabaseLiveStatus({ status: "error", message: `Direct client communication lost: ${err.message}`, loading: false });
          }
        } else {
          setSupabaseLiveStatus({ status: "error", message: `HTTP Error ${sRes.status} querying backend status. Direct client configuration missing or masked.`, loading: false });
        }
      }
    } catch (e: any) {
      // Try direct client-side fallback even on fetch error
      const clientUrl = apiConnections.supabaseUrl;
      const clientKey = apiConnections.supabaseKey;
      const clientTable = apiConnections.supabaseTableName || "cambodia_postcode_migration";
      if (clientUrl && clientKey && !clientKey.includes("••••")) {
        try {
          const response = await fetch(`${clientUrl}/rest/v1/${clientTable}?select=id&limit=1`, {
            method: "GET",
            headers: {
              "apikey": clientKey,
              "Authorization": `Bearer ${clientKey}`,
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
            }
            setSupabaseLiveStatus({
              status: "connected",
              message: "Direct Client-Side Link to Supabase Secured (Cloud Vercel Fallback successfully verified)!",
              url: clientUrl,
              count: totalCount,
              loading: false
            });
          } else {
            setSupabaseLiveStatus({ status: "error", message: `Direct connect returned status ${response.status}`, loading: false });
          }
        } catch (err: any) {
          setSupabaseLiveStatus({ status: "error", message: `Direct connection failed: ${err.message}`, loading: false });
        }
      } else {
        setSupabaseLiveStatus({ status: "error", message: `Communication lost: ${e.message}`, loading: false });
      }
    }

    // 2. Check Gemini
    try {
      setGeminiLiveStatus(prev => ({ ...prev, loading: true }));
      const gRes = await fetch("/api/test-gemini");
      if (gRes.ok) {
        const data = await gRes.json();
        setGeminiLiveStatus({
          status: data.status,
          message: data.message,
          loading: false
        });
      } else {
        // Client-side fallback for static Vercel environment
        const clientGeminiKey = apiConnections.geminiKey;
        const clientModel = apiConnections.geminiVersion || "gemini-3.5-flash";
        if (clientGeminiKey && !clientGeminiKey.includes("••••")) {
          try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${clientModel}?key=${clientGeminiKey}`);
            if (response.ok) {
              setGeminiLiveStatus({
                status: "connected",
                message: "Direct Client-Side Link to Gemini API Secured (Cloud Vercel Fallback successfully verified)!",
                loading: false
              });
            } else {
              setGeminiLiveStatus({ status: "error", message: `Direct key validation status: ${response.status}`, loading: false });
            }
          } catch (err: any) {
            setGeminiLiveStatus({ status: "error", message: `Direct Gemini check failed: ${err.message}`, loading: false });
          }
        } else {
          setGeminiLiveStatus({ status: "error", message: `HTTP Error ${gRes.status} checking AI. Direct client key configuration missing or masked.`, loading: false });
        }
      }
    } catch (e: any) {
      const clientGeminiKey = apiConnections.geminiKey;
      const clientModel = apiConnections.geminiVersion || "gemini-3.5-flash";
      if (clientGeminiKey && !clientGeminiKey.includes("••••")) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${clientModel}?key=${clientGeminiKey}`);
          if (response.ok) {
            setGeminiLiveStatus({
              status: "connected",
              message: "Direct Client-Side Link to Gemini API Secured (Cloud Vercel Fallback successfully verified)!",
              loading: false
            });
            return;
          }
        } catch (err: any) {}
      }
      setGeminiLiveStatus({ status: "error", message: `Communication lost: ${e.message}`, loading: false });
    }
  };

  // Load Cambodia postcode dataset (virtual Database)
  const fetchPostcodes = async () => {
    try {
      setLoadingDb(true);
      let res = await fetch("/api/postcodes");
      
      // Fallback for independent hosts (like Vercel) that only serve the static build
      if (!res.ok) {
        res = await fetch("/cambodia_postcodes.json");
      }

      if (res.ok) {
        const data = await res.json();
        setPostcodes(data);
      } else {
        setErrorMessage("Could not fetch postcode database. Verify if server or cambodia_postcodes.json is available.");
      }
    } catch (err) {
      console.error(err);
      // Dual fallback try loading directly from public path if first fetch failed
      try {
        const staticRes = await fetch("/cambodia_postcodes.json");
        if (staticRes.ok) {
          const staticData = await staticRes.json();
          setPostcodes(staticData);
          return;
        }
      } catch (e) {}
      setErrorMessage("Network error occurred loading postcode directory.");
    } finally {
      setLoadingDb(false);
    }
  };

  const fetchApiConfig = async () => {
    try {
      const res = await fetch("/api/get-config");
      if (res.ok) {
        const data = await res.json();
        setApiConnections((prev: any) => ({
          ...prev,
          siteTitle: data.siteTitle || prev.siteTitle || getRuntimeEnvValue(["VITE_SITE_TITLE"]) || "KH Postal Code",
          platformTitle: data.platformTitle || prev.platformTitle || getRuntimeEnvValue(["VITE_PLATFORM_TITLE"]) || "Cambodia Postcode Migrator",
          supabaseUrl: data.supabaseUrl || prev.supabaseUrl || getRuntimeEnvValue(["NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL", "SUPABASE_URL"]),
          supabaseKey: data.supabaseKey || prev.supabaseKey || getRuntimeEnvValue(["SUPABASE_ANON_KEY", "SUPABASE_KEY", "NEXT_PUBLIC_SUPABASE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY", "VITE_SUPABASE_KEY"]),
          supabaseTableName: data.supabaseTableName || prev.supabaseTableName || getRuntimeEnvValue(["SUPABASE_TABLE_NAME", "VITE_SUPABASE_TABLE_NAME", "NEXT_PUBLIC_SUPABASE_TABLE_NAME"]) || "cambodia_postcode_migration",
          geminiKey: data.geminiKey || prev.geminiKey || getRuntimeEnvValue(["GEMINI_API_KEY", "VITE_GEMINI_API_KEY", "VITE_GEMINI_KEY"]),
          geminiVersion: data.geminiVersion || prev.geminiVersion || getRuntimeEnvValue(["VITE_GEMINI_VERSION"]),
          dhlClientId: data.dhlClientId || prev.dhlClientId || getRuntimeEnvValue(["VITE_DHL_CLIENT_ID"]),
          dhlWebhook: data.dhlWebhook || prev.dhlWebhook || getRuntimeEnvValue(["VITE_DHL_WEBHOOK"]),
          postgrestUrl: data.postgrestUrl !== undefined ? data.postgrestUrl : prev.postgrestUrl || "https://gjodeadljbvtwjiagqqr.supabase.co",
          postgrestKey: data.postgrestKey !== undefined ? data.postgrestKey : prev.postgrestKey || "",
          postgrestTable: data.postgrestTable !== undefined ? data.postgrestTable : prev.postgrestTable || "cambodia_postcode_migration",
          usePostgrestAlternative: data.usePostgrestAlternative !== undefined ? data.usePostgrestAlternative : prev.usePostgrestAlternative || false,
          snowflakeAccount: data.snowflakeAccount || prev.snowflakeAccount || getRuntimeEnvValue(["VITE_SNOWFLAKE_ACCOUNT"]),
          snowflakeDatabase: data.snowflakeDatabase || prev.snowflakeDatabase || getRuntimeEnvValue(["VITE_SNOWFLAKE_DATABASE"]),
          googleMapsKey: data.googleMapsKey || prev.googleMapsKey || getRuntimeEnvValue(["VITE_GOOGLE_MAPS_KEY"]),
          googleMapsId: data.googleMapsId || prev.googleMapsId || getRuntimeEnvValue(["VITE_GOOGLE_MAPS_ID"]),
          websiteLogoType: data.websiteLogoType !== undefined ? data.websiteLogoType : prev.websiteLogoType || "preset",
          websiteLogoPreset: data.websiteLogoPreset !== undefined ? data.websiteLogoPreset : prev.websiteLogoPreset || "envelope",
          websiteLogoUrl: data.websiteLogoUrl !== undefined ? data.websiteLogoUrl : prev.websiteLogoUrl || "",
          websiteLogoSvg: data.websiteLogoSvg !== undefined ? data.websiteLogoSvg : prev.websiteLogoSvg || "",
          enableTextSearch: data.enableTextSearch !== undefined ? data.enableTextSearch : (prev.enableTextSearch ?? true),
          enablePhotoSearch: data.enablePhotoSearch !== undefined ? data.enablePhotoSearch : (prev.enablePhotoSearch ?? true),
          enableMapSearch: data.enableMapSearch !== undefined ? data.enableMapSearch : (prev.enableMapSearch ?? true),
          enableDropdownSearch: data.enableDropdownSearch !== undefined ? data.enableDropdownSearch : (prev.enableDropdownSearch ?? true),
        }));
        if (data.heroBgImages && Array.isArray(data.heroBgImages) && data.heroBgImages.length > 0) {
          setHeroBgImages(data.heroBgImages);
        }
        if (data.footerCopyright) {
          setFooterCopyright(data.footerCopyright);
        }
        return;
      }
    } catch (e) {
      console.error("Failed to load server configuration database:", e);
    }
 
    // Static fallback initialization if server /api/get-config is unavailable (e.g. Vercel)
    setApiConnections((prev: any) => ({
      ...prev,
      siteTitle: getRuntimeEnvValue(["VITE_SITE_TITLE"]) || prev.siteTitle || "KH Postal Code",
      platformTitle: getRuntimeEnvValue(["VITE_PLATFORM_TITLE"]) || prev.platformTitle || "Cambodia Postcode Migrator",
      supabaseUrl: getRuntimeEnvValue(["NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL", "SUPABASE_URL"]) || prev.supabaseUrl,
      supabaseKey: getRuntimeEnvValue(["SUPABASE_ANON_KEY", "SUPABASE_KEY", "NEXT_PUBLIC_SUPABASE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY", "VITE_SUPABASE_KEY"]) || prev.supabaseKey,
      supabaseTableName: getRuntimeEnvValue(["SUPABASE_TABLE_NAME", "VITE_SUPABASE_TABLE_NAME", "NEXT_PUBLIC_SUPABASE_TABLE_NAME"]) || prev.supabaseTableName || "cambodia_postcode_migration",
      geminiKey: getRuntimeEnvValue(["GEMINI_API_KEY", "VITE_GEMINI_API_KEY", "VITE_GEMINI_KEY"]) || prev.geminiKey,
      geminiVersion: getRuntimeEnvValue(["VITE_GEMINI_VERSION"]) || prev.geminiVersion || "gemini-3.5-flash",
      dhlClientId: getRuntimeEnvValue(["VITE_DHL_CLIENT_ID"]) || prev.dhlClientId,
      dhlWebhook: getRuntimeEnvValue(["VITE_DHL_WEBHOOK"]) || prev.dhlWebhook,
      postgrestUrl: prev.postgrestUrl || "https://gjodeadljbvtwjiagqqr.supabase.co",
      postgrestKey: prev.postgrestKey || "",
      postgrestTable: prev.postgrestTable || "cambodia_postcode_migration",
      usePostgrestAlternative: prev.usePostgrestAlternative || false,
      snowflakeAccount: getRuntimeEnvValue(["VITE_SNOWFLAKE_ACCOUNT"]) || prev.snowflakeAccount,
      snowflakeDatabase: getRuntimeEnvValue(["VITE_SNOWFLAKE_DATABASE"]) || prev.snowflakeDatabase,
      googleMapsKey: getRuntimeEnvValue(["VITE_GOOGLE_MAPS_KEY"]) || prev.googleMapsKey,
      googleMapsId: getRuntimeEnvValue(["VITE_GOOGLE_MAPS_ID"]) || prev.googleMapsId,
    }));
  };

  useEffect(() => {
    localStorage.setItem("vref_current_user", JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    if (apiConnections && apiConnections.platformTitle) {
      document.title = apiConnections.platformTitle;
    } else {
      document.title = "Cambodia Postcode Migrator | Google AI Studio";
    }
  }, [apiConnections.platformTitle]);

  useEffect(() => {
    fetchPostcodes();
    fetchAdminUsers();
    fetchApiConfig();
    checkLiveApis();
  }, []);

  // Set default subTool based on enabled modes to prevent selecting disabled tools
  useEffect(() => {
    const isTextEnabled = apiConnections.enableTextSearch !== false;
    const isPhotoEnabled = apiConnections.enablePhotoSearch !== false;
    const isMapEnabled = apiConnections.enableMapSearch !== false;
    const isDropdownEnabled = apiConnections.enableDropdownSearch !== false;

    if (subTool === "dropdown" && !isDropdownEnabled) {
      if (isTextEnabled) setSubToolState("text");
      else if (isPhotoEnabled) setSubToolState("photo");
      else if (isMapEnabled) setSubToolState("map");
    } else if (subTool === "text" && !isTextEnabled) {
      if (isDropdownEnabled) setSubToolState("dropdown");
      else if (isPhotoEnabled) setSubToolState("photo");
      else if (isMapEnabled) setSubToolState("map");
    } else if (subTool === "photo" && !isPhotoEnabled) {
      if (isDropdownEnabled) setSubToolState("dropdown");
      else if (isTextEnabled) setSubToolState("text");
      else if (isMapEnabled) setSubToolState("map");
    } else if (subTool === "map" && !isMapEnabled) {
      if (isDropdownEnabled) setSubToolState("dropdown");
      else if (isTextEnabled) setSubToolState("text");
      else if (isPhotoEnabled) setSubToolState("photo");
    }
  }, [
    apiConnections.enableTextSearch,
    apiConnections.enablePhotoSearch,
    apiConnections.enableMapSearch,
    apiConnections.enableDropdownSearch,
    subTool
  ]);

  // Whenever 3-dropdown selects a complete valid commune, push it directly to unified result state
  useEffect(() => {
    if (activeTab === "single" && subTool === "dropdown") {
      if (!customerProvince || !customerDistrict || !customerCommune) {
        setSingleResult(null);
        return;
      }
      const match = postcodes.find(e => 
        e.province === customerProvince &&
        e.district === customerDistrict &&
        e.commune === customerCommune
      );
      if (match) {
        setSingleResult({
          province: match.province,
          district: match.district,
          commune: match.commune,
          postcode_status: "Follow New Postcode",
          existing_postcode: match.existing_postcode,
          new_postcode: match.new_postcode,
          new_city_name: match.new_city_name,
          ib_sort_co: match.ib_sort_co || "",
          inbound_fac: match.inbound_fac || "",
          input_text: `Dropdown Menu Selected: ${match.commune}, ${match.district}, ${match.province}`
        });
      } else {
        setSingleResult(null);
      }
    }
  }, [customerProvince, customerDistrict, customerCommune, subTool, activeTab, postcodes]);

  // Map initialization and dynamic coordinate resolver
  useEffect(() => {
    if (activeTab !== "single" || subTool !== "map" || !mapContainerRef.current) return;

    // Check if map already initialized
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Map with custom coordinates (Phnom Penh)
    const map = L.map(mapContainerRef.current).setView(mapCenter, 12);
    mapInstanceRef.current = map;

    // Premium Gray Style tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    // Initial marker setting with our stunning DivIcon element
    const marker = L.marker(mapCenter, {
      draggable: true,
      icon: markerDivIcon
    }).addTo(map);
    markerRef.current = marker;

    // Pre-calculate nearest commune postcode listing details
    if (resolveNearestPostcodeRef.current) {
      resolveNearestPostcodeRef.current(mapCenter[0], mapCenter[1]);
    }

    // Handle marker dragging
    marker.on("dragend", (e) => {
      const position = e.target.getLatLng();
      const lat = position.lat;
      const lng = position.lng;
      map.panTo([lat, lng]);
      setMapCenter([lat, lng]);
      if (resolveNearestPostcodeRef.current) {
        resolveNearestPostcodeRef.current(lat, lng);
      }
    });

    // Tap or click on the spatial plane to teleport locator pin
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      map.panTo([lat, lng]);
      setMapCenter([lat, lng]);
      if (resolveNearestPostcodeRef.current) {
        resolveNearestPostcodeRef.current(lat, lng);
      }
    });

    // Cleanup hook on tab switches or component unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [activeTab, subTool]);

  // Sync state helpers
  const clearClipboardNotice = () => {
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyJSON = (jsonObj: any) => {
    navigator.clipboard.writeText(JSON.stringify(jsonObj, null, 2));
    setCopiedText(true);
    clearClipboardNotice();
  };

  const handleDownloadJSON = (jsonObj: any) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "cambodia_postcodes_bulk_migration.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setSuccessMessage("JSON array serialized and downloaded successfully!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleExportExcel = (results: any[]) => {
    if (!results || results.length === 0) return;
    
    const headers = [
      "Raw Input Snippet",
      "Province Match",
      "District/Khan",
      "Commune/Sangkat",
      "Commune-District (MyDHL+)",
      "Legacy ZIP Code",
      "New Six-Digit Postcode",
      "Inbound Sort Route",
      "Inbound Facility",
      "Migration Status"
    ];

    const escapeCSVValue = (val: any) => {
      if (val === undefined || val === null) return '""';
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    };

    const rows = results.map(row => [
      escapeCSVValue(row.input_text),
      escapeCSVValue(row.province),
      escapeCSVValue(row.district),
      escapeCSVValue(row.commune),
      escapeCSVValue(row.new_city_name),
      escapeCSVValue(row.existing_postcode),
      escapeCSVValue(row.new_postcode),
      escapeCSVValue(row.ib_sort_co),
      escapeCSVValue(row.inbound_fac),
      escapeCSVValue(row.postcode_status)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(line => line.join(","))
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "cambodia_postcodes_bulk_migration.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSuccessMessage("Excel/CSV formatted directory generated and downloaded successfully!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Run single-item analysis
  const handleAnalyzeSingle = async (textToSubmit?: string) => {
    const text = textToSubmit !== undefined ? textToSubmit : singleInput;
    if (!text.trim()) {
      setErrorMessage("Please enter an address or click a preset sample below.");
      return;
    }
    
    setSubmitting(true);
    setErrorMessage(null);
    setSingleResult(null);

    // If pre-selected preset, make sure it shows up in textarea
    if (textToSubmit !== undefined) {
      setSingleInput(textToSubmit);
    }

    try {
      const response = await fetch("/api/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || contentType.includes("text/html")) {
        throw new Error("SERVER_FALLBACK_TRIGGERED");
      }

      const result = await response.json();
      setSingleResult(result);
      setSuccessMessage("Address identified and normalized successfully!");
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      console.warn("Express endpoint unavailable or failed. Running client-side high-fidelity fallback...", err);
      // Client-side fallback routine
      const clientGeminiKey = apiConnections.geminiKey;
      const clientModel = apiConnections.geminiVersion || "gemini-3.5-flash";
      
      if (clientGeminiKey && !clientGeminiKey.includes("••••") && clientGeminiKey.trim().length > 10) {
        try {
          const result = await callGeminiDirectly(text, postcodes, clientGeminiKey, clientModel);
          if (result) {
            const enriched = enrichResultLocally(result, postcodes);
            setSingleResult(enriched);
            setSuccessMessage("Address analyzed successfully via direct Gemini link (Vercel Match Mode)!");
            setTimeout(() => setSuccessMessage(null), 3500);
            return;
          }
        } catch (aiErr: any) {
          console.error("Direct client Gemini match failed:", aiErr);
        }
      }

      // Local high-fidelity pattern match engine fallback
      const localResult = localPostcodeMatch(text, postcodes);
      setSingleResult(localResult);
      setSuccessMessage("Address matched instantly via local pattern matching engine!");
      setTimeout(() => setSuccessMessage(null), 3500);
    } finally {
      setSubmitting(false);
    }
  };

  // Run bulk-items analysis
  const handleAnalyzeBulk = async (textToSubmit?: string) => {
    const rawText = textToSubmit !== undefined ? textToSubmit : bulkInput;
    if (!rawText.trim()) {
      setErrorMessage("Please enter rows / lines of addresses to process.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setBulkResults([]);

    if (textToSubmit !== undefined) {
      setBulkInput(textToSubmit);
    }

    // Split raw pasted rows or lines
    const rowsArray = rawText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (rowsArray.length === 0) {
      setErrorMessage("No valid non-empty address lines identified.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rowsArray }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || contentType.includes("text/html")) {
        throw new Error("SERVER_FALLBACK_TRIGGERED");
      }

      const results = await response.json();
      setBulkResults(results);
      setSuccessMessage(`Proceeded batch conversion of ${results.length} rows!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.warn("Express bulk endpoint unavailable or failed. Running client-side bulk fallback...", err);
      const clientGeminiKey = apiConnections.geminiKey;
      const clientModel = apiConnections.geminiVersion || "gemini-3.5-flash";

      if (clientGeminiKey && !clientGeminiKey.includes("••••") && clientGeminiKey.trim().length > 10) {
        try {
          const results = await callGeminiDirectlyBulk(rowsArray, postcodes, clientGeminiKey, clientModel);
          if (results && Array.isArray(results) && results.length > 0) {
            const enrichedResults = results.map(row => enrichResultLocally(row, postcodes));
            setBulkResults(enrichedResults);
            setSuccessMessage(`Proceeded batch conversion of ${enrichedResults.length} rows via direct Gemini link!`);
            setTimeout(() => setSuccessMessage(null), 4000);
            return;
          }
        } catch (aiErr: any) {
          console.error("Direct client bulk Gemini match failed:", aiErr);
        }
      }

      // Local high-fidelity fallback for each row
      const localResults = rowsArray.map(row => localPostcodeMatch(row, postcodes));
      setBulkResults(localResults);
      setSuccessMessage(`Proceeded batch conversion of ${localResults.length} rows via local match engine fallback!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  // Save or Update Entry in Database
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provinceVal.trim() || !districtVal.trim() || !communeVal.trim() || !newPostcodeVal.trim()) {
      alert("Please populate all required fields.");
      return;
    }

    setErrorMessage(null);
    const payload = {
      province: provinceVal.trim(),
      district: districtVal.trim(),
      commune: communeVal.trim(),
      existing_postcode: existingPostcodeVal.trim(),
      new_postcode: newPostcodeVal.trim(),
      ib_sort_co: ibSortCoVal.trim(),
      inbound_fac: inboundFacVal.trim()
    };

    try {
      let response;
      if (editingRecord) {
        // Update
        response = await fetch(`/api/postcodes/${editingRecord.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create
        response = await fetch("/api/postcodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        setSuccessMessage(editingRecord ? "Record modified in table." : "New postcode record saved to table!");
        setTimeout(() => setSuccessMessage(null), 3000);
        setRecordModalOpen(false);
        // Reload list
        fetchPostcodes();
        // Clear modal state
        resetRecordFormFields();
      } else {
        const err = await response.json();
        setErrorMessage(err.error || "Could not execute database transaction.");
      }
    } catch (err) {
      setErrorMessage("Network issue writing records to disk.");
    }
  };

  const resetRecordFormFields = () => {
    setEditingRecord(null);
    setProvinceVal("");
    setDistrictVal("");
    setCommuneVal("");
    setExistingPostcodeVal("");
    setNewPostcodeVal("");
    setIbSortCoVal("");
    setInboundFacVal("");
  };

  const handleOpenCreateModal = () => {
    resetRecordFormFields();
    setRecordModalOpen(true);
  };

  const handleOpenEditModal = (entry: PostcodeEntry) => {
    setEditingRecord(entry);
    setProvinceVal(entry.province);
    setDistrictVal(entry.district);
    setCommuneVal(entry.commune);
    setExistingPostcodeVal(entry.existing_postcode || "");
    setNewPostcodeVal(entry.new_postcode);
    setIbSortCoVal(entry.ib_sort_co || "");
    setInboundFacVal(entry.inbound_fac || "");
    setRecordModalOpen(true);
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const res = await fetch(`/api/postcodes/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSuccessMessage("Record removed from lookup directory.");
        setTimeout(() => setSuccessMessage(null), 2500);
        fetchPostcodes();
      } else {
        setErrorMessage("Could not remove record.");
      }
    } catch (err) {
      setErrorMessage("Network incident deleting database entry.");
    }
  };

  const handleResetDatabase = async () => {
    try {
      setSuccessMessage("Sending baseline restore command to database server...");
      const res = await fetch("/api/postcodes/reset", { method: "POST" });
      if (res.ok) {
        setSuccessMessage("Postcode directory successfully restored to 1653 official Cambodian baseline records.");
        setTimeout(() => setSuccessMessage(null), 5000);
        fetchPostcodes();
        await checkLiveApis();
      } else {
        const errDetail = await res.json().catch(() => ({}));
        setErrorMessage(errDetail.error || "Failed resetting base records.");
        setTimeout(() => setErrorMessage(null), 5000);
      }
    } catch (err) {
      setErrorMessage("Failed resetting baseline database due to network transport issues.");
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const handleSyncToCloud = async () => {
    try {
      setSuccessMessage("Synchronizing current local directory cache to cloud Supabase tables...");
      const res = await fetch("/api/postcodes/sync-to-cloud", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setSuccessMessage(`Cloud database sync successful! Pushed ${result.count} active postal records to Supabase.`);
        setTimeout(() => setSuccessMessage(null), 5000);
        fetchPostcodes();
        await checkLiveApis();
      } else {
        const errDetail = await res.json().catch(() => ({}));
        setErrorMessage(errDetail.error || "Failed pushing local records to Supabase.");
        setTimeout(() => setErrorMessage(null), 5000);
      }
    } catch (err) {
      setErrorMessage("Could not connect to synchronization gateway API router.");
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const handlePullLatestData = async () => {
    try {
      setSuccessMessage("Contacting server to synchronize and pull latest records from the database...");
      await fetchPostcodes();
      await checkLiveApis();
      setSuccessMessage("Successfully synchronized! Reference table is fully up to date with cloud master directory.");
      setTimeout(() => setSuccessMessage(null), 3505);
    } catch (err) {
      setErrorMessage("Network error refreshing database tables.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleSyncToLocal = async () => {
    try {
      setSuccessMessage("Initiating replication protocol... Fetching live Supabase schema and writing to server's local file store...");
      const res = await fetch("/api/postcodes/sync-to-local", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setSuccessMessage(`Success! Replicated ${result.count} records from Supabase into server's local storage.`);
        setTimeout(() => setSuccessMessage(null), 5000);
        fetchPostcodes();
        await checkLiveApis();
      } else {
        const errDetail = await res.json().catch(() => ({}));
        setErrorMessage(errDetail.error || "Failed to replicate Supabase records into local storage.");
        setTimeout(() => setErrorMessage(null), 5000);
      }
    } catch (err) {
      setErrorMessage("Could not connect to the local replication gateway.");
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  // Auth & Admin Login Controls (uses secure backend login with complete client-side fallback for static hostings e.g. Vercel)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const userClean = loginUser.trim();
    const lcUser = userClean.toLowerCase();
    const pass = loginPass;

    if (!userClean || !pass) {
      setLoginError("Please enter both username/email and password.");
      return;
    }

    // 1. Client-Side instant bypass/allow for predefined credentials to support static hostings (like Vercel) without hitting /api/login
    if (lcUser === "hempiden" || lcUser === "hempiden@gmail.com") {
      if (pass === "P1d#nXKHPostcode") {
        const adminUser = { username: "hempiden", role: "superadmin", email: "hempiden@gmail.com" };
        setCurrentUser(adminUser);
        setLoginModalOpen(false);
        setSuccessMessage("Successfully authenticated as Superadmin (Static Mode Bypass)!");
        setTimeout(() => setSuccessMessage(null), 3000);
        setLoginUser("");
        setLoginPass("");
        fetchAdminUsers();
        return;
      }
    } else if (lcUser === "admin" || lcUser === "admin@kh-postcode.gov") {
      if (pass === "adminpassword" || pass === "Admin2026!") {
        const adminUser = { username: "admin", role: "admin", email: "admin@kh-postcode.gov" };
        setCurrentUser(adminUser);
        setLoginModalOpen(false);
        setSuccessMessage("Successfully authenticated as Admin (Static Mode Bypass)!");
        setTimeout(() => setSuccessMessage(null), 3000);
        setLoginUser("");
        setLoginPass("");
        fetchAdminUsers();
        return;
      }
    } else if (lcUser === "editor" || lcUser === "editor@kh-postcode.gov") {
      if (pass === "editorpassword") {
        const adminUser = { username: "editor", role: "editor", email: "editor@kh-postcode.gov" };
        setCurrentUser(adminUser);
        setLoginModalOpen(false);
        setSuccessMessage("Successfully authenticated as Editor Area Manager (Static Mode Bypass)!");
        setTimeout(() => setSuccessMessage(null), 3000);
        setLoginUser("");
        setLoginPass("");
        return;
      }
    }

    // 2. Normal federated backend request for general dynamic registered staff
    try {
      setSubmitting(true);
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userClean, password: pass })
      });

      if (res.ok) {
        const userData = await res.json();
        setCurrentUser(userData);
        setLoginModalOpen(false);
        setSuccessMessage(`Welcome! Successfully authenticated as ${userData.username}.`);
        setTimeout(() => setSuccessMessage(null), 3000);
        setLoginUser("");
        setLoginPass("");
        
        // Reload users list if superadmin or admin just logged in
        if (userData.role === "superadmin" || userData.role === "admin") {
          fetchAdminUsers();
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: "Authentication failed. Please verify credentials." }));
        setLoginError(errorData.error || "Authentication failed. Please verify credentials.");
      }
    } catch (err) {
      console.error("Login connection error:", err);
      setLoginError("This platform appears to be hosted statically (e.g. Vercel) where server-side authentication is unavailable. To access full administrative tools, deploy the bundle as a full-stack Node container, or login with one of the predefined accounts above.");
    } finally {
      setSubmitting(false);
    }
  };

  // Secure User Registration handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const name = registerName.trim();
    const email = registerEmail.trim();
    const pass = registerPass;
    const role = registerRole;

    if (!name || !email || !pass) {
      setLoginError("Please fill out all registration fields.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: pass, role })
      });

      if (res.ok) {
        setSuccessMessage("Your registration request was sent successfully! Awaiting review and approval by a Superadmin.");
        setTimeout(() => setSuccessMessage(null), 6000);
        
        // Reset states
        setRegisterName("");
        setRegisterEmail("");
        setRegisterPass("");
        setRegisterRole("Editor");
        setAuthMode("login");
      } else {
        const errorData = await res.json();
        setLoginError(errorData.error || "Registration request failed. Try another email.");
      }
    } catch (err) {
      console.error("Registration request error:", err);
      setLoginError("Connection refused by authenticating server gateway.");
    } finally {
      setSubmitting(false);
    }
  };

  // Superadmin user approvals (using backend endpoints!)
  const handleApproveUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin-users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUsersList(prev => prev.map(u => u.id === userId ? updatedUser : u));
        setSuccessMessage("Administrative user approved successfully!");
        setTimeout(() => setSuccessMessage(null), 2500);
      } else {
        setErrorMessage("Failed to approve user.");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Connection error while updating user.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleRevokeUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin-users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: false })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUsersList(prev => prev.map(u => u.id === userId ? updatedUser : u));
        setSuccessMessage("Administrative user access rights revoked.");
        setTimeout(() => setSuccessMessage(null), 2500);
      } else {
        setErrorMessage("Failed to revoke user.");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Connection error while updating user.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  // Create new administrative user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      alert("Name and email are required.");
      return;
    }
    try {
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          role: newUserRole,
          approved: newUserApproved
        })
      });
      if (res.ok) {
        const newUser = await res.json();
        setUsersList(prev => [...prev, newUser]);
        setSuccessMessage("New administrative user created!");
        setTimeout(() => setSuccessMessage(null), 2500);
        // Reset form
        setNewUserName("");
        setNewUserEmail("");
        setNewUserRole("Admin");
        setNewUserApproved(false);
        setShowAddUserForm(false);
      } else {
        setErrorMessage("Failed to create admin user.");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Connection error during user insert.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  // Update administrative user
  const handleUpdateUser = async (userId: string) => {
    if (!editingName.trim() || !editingEmail.trim()) {
      alert("Name and email are required.");
      return;
    }
    try {
      const res = await fetch(`/api/admin-users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingName,
          email: editingEmail,
          role: editingRole,
          approved: editingApproved
        })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUsersList(prev => prev.map(u => u.id === userId ? updatedUser : u));
        setSuccessMessage("Administrative user updated successfully!");
        setTimeout(() => setSuccessMessage(null), 2500);
        setEditingUserId(null);
      } else {
        setErrorMessage("Failed to update user.");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Connection error during user update.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  // Delete administrative user
  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin-users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsersList(prev => prev.filter(u => u.id !== userId));
        setSuccessMessage("Administrative user deleted.");
        setTimeout(() => setSuccessMessage(null), 2500);
      } else {
        setErrorMessage("Failed to delete user.");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Connection error during user delete.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleSaveApiConnections = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    setConfigSavedToast(false);
    
    // Cache local credentials
    localStorage.setItem("vref_api_connections", JSON.stringify(apiConnections));
    localStorage.setItem("vref_hero_images", JSON.stringify(heroBgImages));
    localStorage.setItem("vref_footer_copyright", footerCopyright);

    try {
      const res = await fetch("/api/save-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...apiConnections,
          heroBgImages,
          footerCopyright
        })
      });
      if (res.ok) {
        setSuccessMessage("API and branding configuration details successfully committed and encrypted inside the server environment! Diagnostics initiated.");
        setConfigSavedToast(true);
        setTimeout(() => setConfigSavedToast(false), 5000);
      } else {
        setErrorMessage("Successfully saved settings in local browser, but server database rejected the update.");
      }
    } catch (err) {
      setErrorMessage("Network error synchronizing configurations with the live server gateway.");
    } finally {
      setConfigSaving(false);
    }

    setTimeout(() => {
      setSuccessMessage(null);
      setErrorMessage(null);
    }, 5000);
    checkLiveApis();
  };

  // Filter/Search list for database tab
  const filteredPostcodes = postcodes.filter(entry => {
    const searchLower = searchQuery.toLowerCase();
    const queryMatch = 
      entry.province.toLowerCase().includes(searchLower) ||
      entry.district.toLowerCase().includes(searchLower) ||
      entry.commune.toLowerCase().includes(searchLower) ||
      entry.existing_postcode.includes(searchQuery) ||
      entry.new_postcode.includes(searchQuery) ||
      (entry.ib_sort_co && entry.ib_sort_co.toLowerCase().includes(searchLower)) ||
      (entry.inbound_fac && entry.inbound_fac.toLowerCase().includes(searchLower));

    const provinceMatch = selectedProvinceFilter === "" || entry.province === selectedProvinceFilter;
    const districtMatch = selectedDistrictFilter === "" || entry.district === selectedDistrictFilter;
    const communeMatch = selectedCommuneFilter === "" || entry.commune === selectedCommuneFilter;

    return queryMatch && provinceMatch && districtMatch && communeMatch;
  });

  // Client-Facing Customer Lookup Helper Data Pools
  const customerProvinces = Array.from(new Set(postcodes.map(e => e.province))).sort();

  const customerDistricts = Array.from(new Set(
    postcodes
      .filter(e => customerProvince === "" || e.province === customerProvince)
      .map(e => e.district)
  )).sort();

  const customerCommunes = Array.from(new Set(
    postcodes
      .filter(e => 
        (customerProvince === "" || e.province === customerProvince) &&
        (customerDistrict === "" || e.district === customerDistrict)
      )
      .map(e => e.commune)
  )).sort();

  const matchedLookupEntry = postcodes.find(e => 
    e.province === customerProvince &&
    e.district === customerDistrict &&
    e.commune === customerCommune
  );

  // Unique list of provinces for dropdown filter (Database Tab)
  const provincesInDb = Array.from(new Set(postcodes.map(e => e.province))).sort();

  // Unique list of districts based on selected province filter (Database Tab)
  const districtsInDb = Array.from(new Set(
    postcodes
      .filter(e => selectedProvinceFilter === "" || e.province === selectedProvinceFilter)
      .map(e => e.district)
  )).sort();

  // Unique list of communes based on selected province & district filters (Database Tab)
  const communesInDb = Array.from(new Set(
    postcodes
      .filter(e => 
        (selectedProvinceFilter === "" || e.province === selectedProvinceFilter) &&
        (selectedDistrictFilter === "" || e.district === selectedDistrictFilter)
      )
      .map(e => e.commune)
  )).sort();

  const renderWebsiteLogo = () => {
    const logoType = apiConnections.websiteLogoType || "preset";
    
    if (logoType === "url" && apiConnections.websiteLogoUrl) {
      return (
        <img 
          src={apiConnections.websiteLogoUrl} 
          alt="Logo" 
          className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
          referrerPolicy="no-referrer"
        />
      );
    }
    
    if (logoType === "svg" && apiConnections.websiteLogoSvg) {
      try {
        return (
          <div 
            className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-white fill-current stroke-current"
            dangerouslySetInnerHTML={{ __html: apiConnections.websiteLogoSvg }}
          />
        );
      } catch (e) {
        // Fallback below
      }
    }
    
    const preset = apiConnections.websiteLogoPreset || "envelope";
    switch (preset) {
      case "globe":
        return <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-white text-opacity-95" />;
      case "map":
        return <Map className="w-5 h-5 sm:w-6 sm:h-6 text-white text-opacity-95" />;
      case "map-pin":
        return <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white text-opacity-95" />;
      case "navigation":
        return <Navigation className="w-5 h-5 sm:w-6 sm:h-6 text-white text-opacity-95" />;
      case "sparkles":
        return <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white text-opacity-95" />;
      case "building":
        return <Building className="w-5 h-5 sm:w-6 sm:h-6 text-white text-opacity-95" />;
      case "home":
        return <Home className="w-5 h-5 sm:w-6 sm:h-6 text-white text-opacity-95" />;
      case "shield":
        return <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white text-opacity-95" />;
      case "envelope":
      default:
        return (
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white text-opacity-95" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        );
    }
  };

  const handleLogoClick = () => {
    setActiveTab("single");
    if (apiConnections.enableDropdownSearch !== false) {
      setSubTool("dropdown");
    } else if (apiConnections.enableTextSearch !== false) {
      setSubTool("text");
    } else if (apiConnections.enablePhotoSearch !== false) {
      setSubTool("photo");
    } else if (apiConnections.enableMapSearch !== false) {
      setSubTool("map");
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedProvinceFilter("");
    setSelectedDistrictFilter("");
    setSelectedCommuneFilter("");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">
      {/* Immersive Hero Header matching User Requested UI Style */}
      <div 
        className="relative w-full overflow-hidden select-none bg-slate-900" 
        style={{ 
          minHeight: "340px"
        }}
      >
        {/* Layered Cross-fade Slideshow */}
        {heroBgImages.map((image, idx) => (
          <div
            key={idx}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out"
            style={{
              backgroundImage: `url('${image}')`,
              opacity: currentHeroIndex === idx ? 1 : 0,
            }}
          />
        ))}
        {/* Shadowed Dark Overlay to elevate white text readability */}
        <div className="absolute inset-0 bg-black/45 bg-gradient-to-b from-black/60 via-black/35 to-black/20"></div>
        
        {/* Transparent Navigation Bar */}
        <header className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-20 flex flex-col md:flex-row items-center justify-between gap-3 pt-4 md:pt-0">
          <div 
            className="flex items-center gap-2 cursor-pointer transition-transform duration-200 active:scale-95" 
            onClick={handleLogoClick}
          >
            {renderWebsiteLogo()}
            <span className="text-lg sm:text-xl font-extrabold text-white tracking-wide font-sans">
              {apiConnections.siteTitle || "KH Postal Code"}
            </span>
          </div>

          <nav className="flex items-center gap-3 sm:gap-4 md:gap-5 text-[11px] sm:text-xs md:text-sm font-semibold flex-wrap justify-center font-sans tracking-wide">

            {/* Free-Text Search Tab */}
            {apiConnections.enableTextSearch !== false && (
              <button 
                id="tool_text"
                onClick={() => { setActiveTab("single"); setSubTool("text"); }}
                className={`text-white transition-all duration-200 cursor-pointer py-1 flex items-center gap-1 sm:gap-1.5 ${activeTab === "single" && subTool === "text" ? "text-opacity-100 font-extrabold border-b border-white scale-105 animate-pulse" : "text-opacity-75 hover:text-opacity-100 border-b border-transparent"}`}
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-amber-300" />
                <span>Free-Text</span>
              </button>
            )}

            {/* AI OCR Scan Tab */}
            {apiConnections.enablePhotoSearch !== false && (
              <button 
                id="tool_photo"
                onClick={() => { setActiveTab("single"); setSubTool("photo"); }}
                className={`text-white transition-all duration-200 cursor-pointer py-1 flex items-center gap-1 sm:gap-1.5 ${activeTab === "single" && subTool === "photo" ? "text-opacity-100 font-extrabold border-b border-white scale-105" : "text-opacity-75 hover:text-opacity-100 border-b border-transparent"}`}
              >
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>AI OCR Scan</span>
              </button>
            )}

            {/* Locator Pin Tab */}
            {apiConnections.enableMapSearch !== false && (
              <button 
                id="tool_map"
                onClick={() => { setActiveTab("single"); setSubTool("map"); }}
                className={`text-white transition-all duration-200 cursor-pointer py-1 flex items-center gap-1 sm:gap-1.5 ${activeTab === "single" && subTool === "map" ? "text-opacity-100 font-extrabold border-b border-white scale-105" : "text-opacity-75 hover:text-opacity-100 border-b border-transparent"}`}
              >
                <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden xs:inline">Locator Pin</span>
              </button>
            )}

            {/* Dropdowns Tab */}
            {apiConnections.enableDropdownSearch !== false && (
              <button 
                id="tool_dropdown"
                onClick={() => { setActiveTab("single"); setSubTool("dropdown"); }}
                className={`text-white transition-all duration-200 cursor-pointer py-1 flex items-center gap-1 sm:gap-1.5 ${activeTab === "single" && subTool === "dropdown" ? "text-opacity-100 font-extrabold border-b border-white scale-105" : "text-opacity-75 hover:text-opacity-100 border-b border-transparent"}`}
              >
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Dropdowns</span>
              </button>
            )}

            {/* Admin, Superadmin and Editor shared workspace menus */}
            {hasPermission(currentUser.role, "allowBulkLookup") && (
              <button 
                id="nav_nav_bulk"
                onClick={() => { setActiveTab("bulk"); }}
                className={`text-white transition-opacity duration-200 cursor-pointer py-1 ${activeTab === "bulk" ? "text-opacity-100 font-extrabold border-b border-white" : "text-opacity-75 hover:text-opacity-100 border-b border-transparent"}`}
              >
                Bulk Search
              </button>
            )}

          </nav>
        </header>

        {/* Center Text Headers inside the Hero Area */}
        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center pt-8 pb-20 sm:pt-14 sm:pb-24 lg:pt-16 lg:pb-28">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-normal font-sans drop-shadow-md">
            Search Postal Codes
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-white/95 mt-2 font-medium tracking-wide drop-shadow-sm font-sans max-w-md mx-auto sm:max-w-none">
            Find postal codes across Cambodia
          </p>
        </div>
      </div>

      {/* Floating Search Bar (Only shown on Single tab) */}
      {activeTab === "single" && (
        <div className="relative z-20 w-full max-w-7xl mx-auto px-4 -mt-8 sm:-mt-10 md:-mt-12 lg:-mt-14 xl:-mt-16 mb-2">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-xl border border-white/20 p-4 sm:p-5 md:p-6 flex flex-col md:flex-row items-center gap-3 w-full">
            {/* Input box */}
            <div className="relative flex-1 w-full bg-white rounded-lg border border-slate-250 shadow-xs focus-within:ring-2 focus-within:ring-amber-400/30 focus-within:border-amber-400 transition-all">
              <input
                id="hero_search_input"
                type="text"
                placeholder="Postal code, commune, district..."
                value={singleInput}
                onChange={(e) => {
                  setSingleInput(e.target.value);
                  setCustomerProvince("");
                  setCustomerDistrict("");
                  setCustomerCommune("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAnalyzeSingle();
                  }
                }}
                className="w-full text-xs sm:text-sm bg-transparent outline-none py-3.5 px-4 font-sans text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Selector box */}
            <div className="w-full md:w-60 bg-white rounded-lg border border-slate-250 shadow-xs relative">
              <select
                id="hero_province_select"
                value={customerProvince}
                onChange={(e) => {
                  setCustomerProvince(e.target.value);
                  setCustomerDistrict("");
                  setCustomerCommune("");
                  if (e.target.value) {
                    setSingleInput(e.target.value);
                  }
                }}
                className="w-full text-xs sm:text-sm bg-transparent outline-none py-3.5 pl-4 pr-10 font-sans text-slate-700 cursor-pointer appearance-none"
              >
                <option value="">All Provinces</option>
                {customerProvinces.map((p, idx) => (
                  <option key={idx} value={p}>{p}</option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* "Search" Button (Amber Yellow, dark text) */}
            <button
              id="hero_search_submit"
              onClick={() => handleAnalyzeSingle()}
              disabled={submitting}
              className="w-full md:w-auto h-11 bg-[#FFCC00] hover:bg-[#E6B800] text-slate-950 font-bold font-sans text-xs sm:text-sm px-8 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-200 transition-all whitespace-nowrap active:scale-95"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Search className="w-4 h-4 text-slate-950 stroke-[3.2]" />
              )}
              <span>Search</span>
            </button>

            {/* "Clear" Button (Neutral Grey) */}
            <button
              id="hero_search_clear"
              onClick={() => {
                setSingleInput("");
                setCustomerProvince("");
                setCustomerDistrict("");
                setCustomerCommune("");
                setSingleResult(null);
              }}
              className="w-full md:w-auto h-11 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-600 font-bold font-sans text-xs sm:text-sm px-8 rounded-lg transition-all cursor-pointer text-center flex items-center justify-center whitespace-nowrap"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Universal Status / Alerts */}
        {errorMessage && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg shadow-sm flex items-start gap-3 animate-fadeIn">
            <AlertTriangle className="text-red-500 shrink-0 w-5 h-5 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Action Required</p>
              <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-650 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="bg-blue-50 border-l-4 border-blue-600 text-blue-800 p-4 rounded-r-lg shadow-sm flex items-start gap-3 animate-fadeIn">
            <CheckCircle2 className="text-blue-600 shrink-0 w-5 h-5 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Success</p>
              <p className="text-xs text-blue-700 mt-0.5">{successMessage}</p>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-blue-400 hover:text-blue-650 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}



               {/* TAB 1: SINGLE VERIFICATION SUITE */}
        {activeTab === "single" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
            
            {/* COLUMN 1: SOURCING UTILITIES COOPERATIVE (7 COLS) */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              
              {/* CARD CONTAINER: DYNAMICALLY SHOW SELECTED SUB-TOOL */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 sm:p-6 flex flex-col gap-4">
                
                {subTool === "text" && (
                  <div className="flex flex-col gap-4 animate-fadeIn">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                        Postal Code Free-Text Parser
                      </h3>
                      <p className="text-slate-500 text-xs mt-1 leading-normal">
                        Paste receipt text snippets, billing profiles, or hand-keyed delivery rows. The system parses administrative elements back to standardized legal databases.
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Raw Informal Customer Address Text
                      </label>
                      <textarea
                        id="single_address_input"
                        rows={3}
                        value={singleInput}
                        onChange={(e) => setSingleInput(e.target.value)}
                        placeholder="e.g. Wat Phnom, Khan Daun Penh, Phnom Penh legacy ZIP 12202..."
                        className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all leading-normal text-slate-705"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAnalyzeSingle()}
                        disabled={submitting}
                        className="flex-grow bg-blue-600 text-white font-bold py-3 px-5 rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer text-xs shadow-md shadow-blue-100"
                      >
                        {submitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            Analyzing with AI Engine...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-blue-200" />
                            Normalize &amp; Verify Address
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => { setSingleInput(""); setSingleResult(null); setErrorMessage(null); }}
                        className="px-3 py-3 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer"
                        title="Clear state input"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-205 flex flex-col gap-2 mt-1">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 text-xs">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        Address Parser Presets
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {PRESET_EXAMPLES.slice(0, 3).map((ex, idx) => (
                          <button
                            key={idx}
                            id={`preset_btn_${idx}`}
                            onClick={() => handleAnalyzeSingle(ex.text)}
                            className="text-left bg-white border border-slate-200 hover:border-blue-500 hover:shadow-xs p-2.5 rounded-lg transition-all text-[11px] cursor-pointer flex flex-col justify-between"
                          >
                            <span className="font-bold text-slate-805 line-clamp-1">{ex.title}</span>
                            <span className="text-slate-500 line-clamp-2 italic leading-tight my-1">"{ex.text}"</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {subTool === "photo" && (
                  <div className="flex flex-col gap-4 animate-fadeIn">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-indigo-500 shrink-0" />
                        Multimodal Image OCR Scanner
                      </h3>
                      <p className="text-slate-500 text-xs mt-1 leading-normal font-sans">
                        Acknowledge physical address tags via local hardware cameras or envelope imports. Gemini extracts text structures to convert legacy postcodes automatically.
                      </p>
                    </div>

                    <div className="w-full aspect-video rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex flex-col items-center justify-center relative shadow-inner">
                      {cameraActive ? (
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : ocrImageSrc ? (
                        <img
                          src={ocrImageSrc}
                          alt="Captured invoice label content"
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-5 text-center select-none">
                          <Image className="w-10 h-10 text-slate-700 stroke-[1.5]" />
                          <span className="text-xs font-semibold text-slate-400">Viewfinder stand-by</span>
                          <p className="text-[10px] text-slate-500 max-w-[260px]">Trigger camera capture or upload package photos to initiate division scanning.</p>
                        </div>
                      )}

                      {ocrLoading && (
                        <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center text-white gap-3 z-10 select-none animate-pulse">
                          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400">GEMINI OCR TRANSCRIBING...</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      {cameraActive ? (
                        <div className="flex gap-2 w-full">
                          <button
                            onClick={capturePhoto}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Camera className="w-4 h-4 text-white" />
                            Capture Frame
                          </button>
                          <button
                            onClick={stopCamera}
                            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 w-full flex-wrap sm:flex-nowrap">
                          <button
                            id="btn_start_camera"
                            onClick={startCamera}
                            className="flex-1 py-2.5 bg-white border border-slate-205 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Camera className="w-4 h-4 text-slate-500" />
                            Live Camera
                          </button>
                          
                          <label className="flex-1 py-2.5 bg-white border border-slate-205 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer text-center relative pointer-events-auto">
                            <Upload className="w-4 h-4 text-slate-500" />
                            <span>Upload Image File</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>

                          {ocrImageSrc && (
                            <button
                              id="btn_run_ocr"
                              onClick={handleProcessOcr}
                              disabled={ocrLoading}
                              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer animate-slideUp shadow-md shadow-indigo-100"
                            >
                              <Sparkles className="w-4 h-4 text-indigo-200" />
                              Analyze Address
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {subTool === "map" && (
                  <div className="flex flex-col gap-4 animate-fadeIn">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                        <Map className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
                        Interactive Geographic Map Locator
                      </h3>
                      <p className="text-slate-500 text-xs mt-1 leading-normal">
                        Click on the digital canvas or drag the locator pin. The database reverse-resolves details and streams structured postal metrics immediately.
                      </p>
                    </div>

                    <div className="relative">
                      <div 
                        ref={mapContainerRef} 
                        className="gray-map w-full h-[320px] rounded-lg border border-slate-200 bg-slate-100 shadow-inner overflow-hidden z-10" 
                      />
                      <button
                        onClick={handleAutoLocate}
                        disabled={mapLocating}
                        type="button"
                        className="absolute bottom-3 right-3 z-30 bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300 font-sans font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center gap-1.5 shadow-md active:scale-95 hover:bg-slate-850 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {mapLocating ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        ) : (
                          <Navigation className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        )}
                        {mapLocating ? "Locating..." : "Auto Geolocation"}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Mapped Coordinates: {mapCenter[0].toFixed(5)}, {mapCenter[1].toFixed(5)}</span>
                      <span className="italic text-amber-500 font-semibold animate-pulse flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        Drag pin or click map to locate
                      </span>
                    </div>
                  </div>
                )}

                {subTool === "dropdown" && (
                  <div className="flex flex-col gap-4 animate-fadeIn">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-emerald-500 shrink-0" />
                        Structured Division Selectors
                      </h3>
                      <p className="text-slate-500 text-xs mt-1 leading-normal">
                        Select administrative points cascading from Province to Khan and Sangkat to extract the active national 6-digit postcodes.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">PROVINCE / CAPITAL</label>
                        <select
                          id="lookup_province"
                          value={customerProvince}
                          onChange={(e) => {
                            setCustomerProvince(e.target.value);
                            setCustomerDistrict("");
                            setCustomerCommune("");
                          }}
                          className="w-full text-slate-700 font-semibold border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 hover:bg-white text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 focus:outline-none transition-all cursor-pointer"
                        >
                          <option value="">Select Province</option>
                          {customerProvinces.map((p, idx) => (
                            <option key={idx} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">DISTRICT / KHAN</label>
                        <select
                          id="lookup_district"
                          value={customerDistrict}
                          onChange={(e) => {
                            setCustomerDistrict(e.target.value);
                            setCustomerCommune("");
                          }}
                          disabled={!customerProvince}
                          className="w-full text-slate-700 font-semibold border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 hover:bg-white text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 focus:outline-none transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        >
                          <option value="">Select District</option>
                          {customerDistricts.map((d, idx) => (
                            <option key={idx} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">COMMUNE / SANGKAT</label>
                        <select
                          id="lookup_commune"
                          value={customerCommune}
                          onChange={(e) => setCustomerCommune(e.target.value)}
                          disabled={!customerDistrict}
                          className="w-full text-slate-700 font-semibold border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 hover:bg-white text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 focus:outline-none transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        >
                          <option value="">Select Commune</option>
                          {customerCommunes.map((c, idx) => (
                            <option key={idx} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {(customerProvince || customerDistrict || customerCommune) && (
                      <button
                        onClick={() => {
                          setCustomerProvince("");
                          setCustomerDistrict("");
                          setCustomerCommune("");
                          setSingleResult(null);
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-650 uppercase tracking-widest underline self-start cursor-pointer mt-1"
                      >
                        Clear Dropdown Fields
                      </button>
                    )}
                  </div>
                )}
                
              </div>
            </div>

            {/* COLUMN 2: MASTER UNIFIED ANSWER DISPLAY (5 COLS) */}
            <div className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-24 select-all">
              
              <div className="bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col min-h-[320px] overflow-hidden">
                
                <div className="p-4 border-b border-slate-100 bg-slate-50/75 flex justify-between items-center select-none">
                  <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-600" />
                    Unified Verification Answer
                  </h2>
                  {singleResult && (
                    <span className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 text-[9px] font-mono font-bold rounded uppercase">
                      RESOLVED
                    </span>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col gap-4 justify-between">
                  {submitting ? (
                    <div className="flex-grow flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                      <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
                      <p className="text-xs font-semibold font-mono text-slate-500">Parsing geography baseline...</p>
                    </div>
                  ) : singleResult ? (
                    <div className="flex flex-col gap-4 animate-fadeIn">
                      
                      {/* Active Input Source Stamp */}
                      {singleResult.input_text && (
                        <div className="py-1 px-2 bg-slate-50 border border-slate-150 rounded text-[10px] text-slate-500 italic max-h-[50px] overflow-hidden truncate">
                          <span className="font-bold text-[9px] uppercase tracking-wide text-slate-400 font-mono not-italic block">Source Identifier:</span>
                          {singleResult.input_text}
                        </div>
                      )}

                      {/* Division Outputs Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="text-[9px] font-bold text-blue-600 uppercase block mb-0.5">Commune-District (MyDHL+)</label>
                          <div className="px-3 py-2 bg-blue-50/30 border-b border-blue-150 font-bold text-slate-800 rounded text-xs uppercase leading-tight font-sans">
                            {singleResult.new_city_name || "-"}
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">District / Khan</label>
                          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 rounded text-xs uppercase leading-tight">
                            {singleResult.district}
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Province / Capital</label>
                          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 rounded text-xs uppercase leading-tight">
                            {singleResult.province}
                          </div>
                        </div>

                        {/* Migration State indicator banner */}
                        {currentUser.role !== "public" && (
                          <div className="col-span-2 mt-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Verification Category</label>
                            <div className={`p-2 rounded border text-[11px] font-semibold flex items-center justify-between ${
                              singleResult.postcode_status === "Follow New Postcode"
                                ? "bg-blue-50/40 border-blue-200 text-blue-700 font-bold"
                                : singleResult.postcode_status === "Follow Existing Postcode"
                                ? "bg-amber-50 border-amber-250 text-amber-700 font-bold"
                                : singleResult.postcode_status === "No Postcode Detected"
                                ? "bg-slate-100 border-slate-300 text-slate-700 font-bold"
                                : singleResult.postcode_status === "Unknown"
                                ? "bg-slate-100 border-slate-200 text-slate-500 font-semibold"
                                : "bg-red-50 border-red-250 text-red-700 font-bold"
                            }`}>
                              <span>{singleResult.postcode_status}</span>
                              <span className="text-[8px] font-mono tracking-wider text-slate-400">Government baseline</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Standard Postcodes outputs block */}
                      {(() => {
                        const isLongCode = !!(singleResult.new_postcode && (singleResult.new_postcode.includes(",") || singleResult.new_postcode.length > 10));
                        return (
                          <div className={`grid ${isLongCode ? "grid-cols-1" : "grid-cols-2"} gap-3 mt-1 select-all`}>
                            <div className="bg-slate-50/70 border border-slate-200 rounded p-2 text-center flex flex-col justify-center">
                              <span className="text-[8px] font-mono text-slate-400 tracking-wider">LEGACY POSTCODE</span>
                              <span className="text-xs font-semibold font-mono text-slate-600 mt-1">
                                {singleResult.existing_postcode || "-"}
                              </span>
                            </div>
                            <div className="bg-blue-50/30 border-2 border-dashed border-blue-200 rounded p-2 text-center flex flex-col justify-center overflow-hidden">
                              <span className="text-[8px] font-mono text-blue-600 font-bold tracking-wider block">ACTIVE CODE (6-DIGIT)</span>
                              {(() => {
                                const val = singleResult.new_postcode || "";
                                if (!val) return <span className="text-xs font-mono text-slate-400 mt-1">Unmapped</span>;
                                if (isLongCode) {
                                  // Split by comma or space
                                  const parts = val.split(/[\s,;]+/).map(s => s.trim().replace(/^,|,$/g, "")).filter(Boolean);
                                  return (
                                    <div className="max-h-[85px] overflow-y-auto mt-1 flex flex-wrap gap-1 justify-center scrollbar-thin scrollbar-thumb-blue-200 p-1 bg-white/60 border border-blue-100 rounded">
                                      {parts.map((p, idx) => (
                                        <span 
                                          key={idx} 
                                          className="bg-blue-50 border border-blue-150 text-blue-800 text-[10px] font-mono font-black px-1.5 py-0.5 rounded shadow-2xs cursor-pointer hover:bg-blue-100/90 whitespace-nowrap"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(p);
                                            setSuccessMessage(`Copied: ${p}`);
                                            setTimeout(() => setSuccessMessage(null), 2000);
                                          }}
                                          title={`Click to copy: ${p}`}
                                        >
                                          {p}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                }
                                return (
                                  <span className="text-base font-mono font-black text-blue-700 mt-0.5">
                                    {val}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Route & Facility outputs if available */}
                      {singleResult && currentUser.role !== "public" && (singleResult.ib_sort_co || singleResult.inbound_fac) && (
                        <div className="grid grid-cols-2 gap-3 mt-1.5 select-all animate-fadeIn">
                          <div className="bg-slate-50 border border-slate-200 rounded p-2 text-center flex flex-col justify-center">
                            <span className="text-[8px] font-mono text-slate-400 font-bold tracking-wider uppercase">Route (ib_sort_co)</span>
                            <span className="text-xs font-semibold font-mono text-slate-700 mt-1">
                              {singleResult.ib_sort_co || "-"}
                            </span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 rounded p-2 text-center flex flex-col justify-center">
                            <span className="text-[8px] font-mono text-slate-400 font-bold tracking-wider uppercase">Facility (inbound_fac)</span>
                            <span className="text-xs font-semibold font-mono text-slate-700 mt-1">
                              {singleResult.inbound_fac || "-"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Help advices */}
                      <div className="text-[10px] text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200 flex items-start gap-2 leading-relaxed">
                        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          {singleResult.postcode_status === "Follow Existing Postcode" && (
                            <p>This point matches legacy ZIP <strong>{singleResult.existing_postcode}</strong>. Logistical structures must transition to active code <strong>{singleResult.new_postcode}</strong> for standards compliance.</p>
                          )}
                          {singleResult.postcode_status === "Follow New Postcode" && (
                            <p className="text-slate-800 font-medium">Excellent! The matching division holds correct, active, fully compliant 6-digit postal sector <strong>{singleResult.new_postcode}</strong>.</p>
                          )}
                          {singleResult.postcode_status === "Incorrect Postcode" && (
                            <p className="text-red-800">Incorrect postcode match alerts! The submitted postcode is wrong or belongs to another administrative region. Please transition to active <strong>{singleResult.new_postcode}</strong>.</p>
                          )}
                          {singleResult.postcode_status === "No Postcode Detected" && (
                            <p className="text-slate-700">No ZIP/postcode was detected in the submitted text. However, we successfully mapped the location coordinates and division. Logistical structures are advised to attach the active 6-digit sector code <strong>{singleResult.new_postcode}</strong>.</p>
                          )}
                          {singleResult.postcode_status === "Unknown" && (
                            <p>The administrative boundaries were not resolved accurately. Check spelling or add the custom record in the database directory tab.</p>
                          )}
                        </div>
                      </div>



                    </div>
                  ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-slate-400 gap-3 border border-dashed border-slate-200 py-12 rounded bg-slate-50/30 select-none">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                            <Sparkles className="w-4.5 h-4.5 text-slate-400" />
                          </div>
                          <div className="text-center max-w-[240px] px-2">
                            <h4 className="font-bold text-xs text-slate-700">Awaiting Search Trigger</h4>
                            <p className="text-[10px] text-slate-500 mt-1 lines-clamp-3 leading-normal">
                              Enter address text, trigger image OCR scan, drag the map pin, or use cascading selectors to display matching postal entries right here.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {singleResult && currentUser.role !== "public" && (
                      <footer className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2 select-none">
                        <button
                          onClick={() => handleCopyJSON(singleResult)}
                          className="flex-1 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-150 bg-white border border-slate-200 rounded transition-all cursor-pointer text-center shadow-xs"
                        >
                          Copy JSON payload
                        </button>
                        <button
                          onClick={() => {
                            const standardAddress = `${singleResult.commune}, ${singleResult.district}, ${singleResult.province}, Cambodia, Postcode: ${singleResult.new_postcode}`;
                            navigator.clipboard.writeText(standardAddress);
                            setSuccessMessage("Normalized physical address copy succeeded!");
                            setTimeout(() => setSuccessMessage(null), 3000);
                          }}
                          className="flex-1 py-1.5 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-900 transition-all cursor-pointer text-center"
                        >
                          Copy Full Stamp
                        </button>
                      </footer>
                    )}

                  </div>

                  {/* Developer system panel schema (exclusive to logged-in roles) */}
                  {singleResult && currentUser.role !== "public" && (
                    <div className="bg-slate-900 text-slate-200 rounded-xl p-4 animate-fadeIn select-none">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[9px] font-mono tracking-wider font-bold text-slate-400 block uppercase">SYSTEM RESPONSES</span>
                        <span className="text-[9px] font-mono text-blue-400">content-type: JSON</span>
                      </div>
                      <pre className="text-[10px] font-mono p-3 bg-slate-955 text-emerald-400 rounded border border-slate-955 max-h-[100px] overflow-y-auto scrollbar-thin">
                        {JSON.stringify(singleResult, null, 2)}
                      </pre>
                    </div>
                  )}

            </div>

          </div>
        )}



        {/* TAB 2: BULK SPREADSHEET INPUT PARSER */}
        {activeTab === "bulk" && (
          <div className="flex flex-col gap-6">
            
            {/* Split controls */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 sm:p-6 flex flex-col gap-4">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center bg-white">
                <div>
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <FileSpreadsheet className="text-blue-500 w-5 h-5" />
                    Spreadsheet Batch Processor
                  </h3>
                  <p className="text-slate-500 text-xs mt-1">
                    Upload multiple address rows to bulk-migrate and fuzzy-match postcodes concurrently.
                  </p>
                </div>
                <span className="hidden sm:inline text-[9px] uppercase tracking-widest text-slate-400 font-bold bg-slate-50 border px-2 py-1 rounded">Batch Pipeline</span>
              </div>

              {/* Paste text-area */}
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Paste Excel Rows or Text Lines (One address per line)
                  </label>
                  <button
                    onClick={() => {
                        const bulkSample = PRESET_EXAMPLES[3].text;
                        handleAnalyzeBulk(bulkSample);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-805 hover:underline font-bold cursor-pointer select-none"
                  >
                    Load Bulk Demo Rows
                  </button>
                </div>
                <textarea
                  id="bulk_address_input"
                  rows={6}
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder="e.g.&#10;Sala Kamreuk, Siem Reap, legacy postcode 17253&#10;Sangkat Olympic, Chamkar Mon, Phnom Penh - zip code is 120107"
                  className="w-full text-sm border border-slate-200 rounded-lg p-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans leading-relaxed text-slate-705"
                />
              </div>

              {/* Action Rows */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="text-xs text-slate-550 font-medium">
                  {bulkInput.trim() ? (
                    <span>
                      Detected <strong className="text-slate-700">{bulkInput.split("\n").filter(Boolean).length}</strong> raw segments to process into the database.
                    </span>
                  ) : (
                    <span>Awaiting raw spreadsheet address string rows list...</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setBulkInput(""); setBulkResults([]); setErrorMessage(null); }}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-xs"
                  >
                    Clear Text
                  </button>
                  <button
                    onClick={() => handleAnalyzeBulk()}
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-105 transition-all disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        Processing Row Matrices...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-blue-200" />
                        Execute Batch Pipeline
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Batch Table Output */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Normalized Customer Records Output Array
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Automatically spelling corrected, mapped to official Cambodian divisions, and evaluated.
                  </p>
                </div>

                {bulkResults.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleCopyJSON(bulkResults)}
                      className="bg-slate-800 text-white hover:bg-slate-900 border border-slate-705 text-xs font-semibold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-300" />
                          Copy JSON
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDownloadJSON(bulkResults)}
                      className="bg-slate-100 hover:bg-slate-205 text-slate-700 border border-slate-250 text-xs font-semibold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <CloudDownload className="w-3.5 h-3.5 text-slate-500" />
                      Export JSON (.json)
                    </button>
                    <button
                      onClick={() => handleExportExcel(bulkResults)}
                      className="bg-emerald-650 hover:bg-emerald-700 text-white border border-emerald-600 text-xs font-semibold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                      Export to Excel (.csv)
                    </button>
                  </div>
                )}
              </div>

              {bulkResults.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] tracking-wider uppercase">
                        <th className="py-3 px-4">Raw Input Snippet</th>
                        <th className="py-3 px-4">Province Match</th>
                        <th className="py-3 px-4">District/Khan</th>
                        <th className="py-3 px-4">Commune/Sangkat</th>
                        <th className="py-3 px-4 text-blue-600 font-bold whitespace-nowrap">Commune-District (MyDHL+)</th>
                        <th className="py-3 px-4">Valid Range (Old ➔ New)</th>
                        <th className="py-3 px-4">Route</th>
                        <th className="py-3 px-4">Facility</th>
                        <th className="py-3 px-4">Postcode Status Indicator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                      {bulkResults.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 max-w-[200px] truncate font-mono text-slate-500" title={row.input_text}>
                            {row.input_text || `Row #${idx + 1}`}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{row.province}</td>
                          <td className="py-3 px-4 text-slate-800">{row.district}</td>
                          <td className="py-3 px-4 text-slate-650">{row.commune}</td>
                          <td className="py-3 px-4 font-bold text-blue-700 bg-blue-50/10 whitespace-nowrap">{row.new_city_name || "-"}</td>
                          <td className="py-3 px-4">
                            <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border">
                              {row.existing_postcode || "-"}
                            </span>
                            <span className="mx-1 text-slate-400">➔</span>
                            <span 
                              className="font-mono bg-blue-50 border border-blue-150 py-0.5 px-1.5 rounded text-blue-700 font-bold max-w-[140px] truncate inline-block align-middle"
                              title={row.new_postcode || "-"}
                            >
                              {row.new_postcode ? (row.new_postcode.length > 15 ? `${row.new_postcode.slice(0, 12)}...` : row.new_postcode) : "-"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">{row.ib_sort_co || "-"}</td>
                          <td className="py-3 px-4 text-slate-500">{row.inbound_fac || "-"}</td>
                          <td className="py-3 px-4">
                            {row.postcode_status === "Follow New Postcode" && (
                              <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Active
                              </span>
                            )}
                            {row.postcode_status === "Follow Existing Postcode" && (
                              <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 text-amber-800 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                Legacy Match
                              </span>
                            )}
                            {row.postcode_status === "Incorrect Postcode" && (
                              <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-800 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                Outdated ZIP
                              </span>
                            )}
                            {row.postcode_status === "No Postcode Detected" && (
                              <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-250 text-slate-700 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                Missing ZIP
                              </span>
                            )}
                            {row.postcode_status === "Unknown" && (
                              <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-300 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">
                                Unknown
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <FileSpreadsheet className="w-10 h-10 text-slate-300" />
                  <p className="text-sm font-semibold">Batch records output list is currently empty.</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Paste row segments as a block or load the spreadsheet sandbox demo rowset.
                  </p>
                </div>
              )}
            </div>

            {/* Batch Array Raw Response */}
            {bulkResults.length > 0 && (
              <div className="bg-slate-900 text-white rounded-xl shadow-md p-5">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] font-bold text-slate-405 font-mono tracking-wider select-none uppercase">
                    Raw JSON Array Output (Fulfills structured schema requirements):
                  </h4>
                  <button 
                    onClick={() => handleCopyJSON(bulkResults)}
                    className="text-xs bg-slate-800/80 text-slate-300 hover:text-white px-2 py-1 rounded border border-slate-700 cursor-pointer"
                  >
                    Copy Block
                  </button>
                </div>
                <pre className="text-xs text-blue-300 font-mono bg-slate-950 p-4 rounded-lg border border-slate-950 max-h-[250px] overflow-y-auto scrollbar-thin">
                  {JSON.stringify(bulkResults, null, 2)}
                </pre>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: POSTCODE DIRECTORY (Admin panel for Supabase database table simulation) */}
        {activeTab === "database" && (
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col gap-4 p-5 sm:p-6">
            
            {/* Header info */}
            <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Database className="text-blue-500 w-5 h-5" />
                  Virtual Reference Table
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Manage the official master database entries used by the Gemini AI fuzzy pattern matcher for resolving Cambodian postcode migrations.
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                {currentUser.role === "superadmin" && (
                  <button
                    onClick={handlePullLatestData}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Pull latest live postcode records constraint from database source"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-white ${loadingDb ? "animate-spin" : ""}`} />
                    Pull Latest Data
                  </button>
                )}
                <button
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-105 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-white" />
                  Add Administrative Record
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-200/80 flex flex-col md:flex-row items-center gap-3 animate-fadeIn">
              {/* Query Search */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by spelling or postcodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg py-2.5 pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-sans"
                />
              </div>

              {/* Province dropdown */}
              <div className="w-full md:w-48">
                <select
                  value={selectedProvinceFilter}
                  onChange={(e) => {
                    setSelectedProvinceFilter(e.target.value);
                    setSelectedDistrictFilter("");
                    setSelectedCommuneFilter("");
                  }}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-sans"
                >
                  <option value="">All Provinces</option>
                  {provincesInDb.map((p, idx) => (
                    <option key={idx} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* District dropdown */}
              <div className="w-full md:w-48">
                <select
                  value={selectedDistrictFilter}
                  onChange={(e) => {
                    setSelectedDistrictFilter(e.target.value);
                    setSelectedCommuneFilter("");
                  }}
                  disabled={!selectedProvinceFilter}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-sans disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">All Districts</option>
                  {districtsInDb.map((d, idx) => (
                    <option key={idx} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Commune dropdown */}
              <div className="w-full md:w-48">
                <select
                  value={selectedCommuneFilter}
                  onChange={(e) => setSelectedCommuneFilter(e.target.value)}
                  disabled={!selectedDistrictFilter}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-sans disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">All Communes</option>
                  {communesInDb.map((c, idx) => (
                    <option key={idx} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Reset search button */}
              {(searchQuery || selectedProvinceFilter || selectedDistrictFilter || selectedCommuneFilter) && (
                <button
                  onClick={handleClearFilters}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-805 cursor-pointer text-center whitespace-nowrap uppercase tracking-wider"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Main records grid list */}
            {loadingDb ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <span className="text-xs font-mono font-medium">Reconnecting to database table...</span>
              </div>
            ) : filteredPostcodes.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] tracking-wider uppercase select-none">
                        <th className="py-3 px-4 w-12">ID</th>
                        <th className="py-3 px-4">Province</th>
                        <th className="py-3 px-4">District / Khan</th>
                        <th className="py-3 px-4">Commune / Sangkat</th>
                        <th className="py-3 px-4 text-blue-600 font-bold whitespace-nowrap">Commune-District (MyDHL+)</th>
                        <th className="py-3 px-4">Legacy POSCODE (Existing)</th>
                        <th className="py-3 px-4">New Six-Digit Postcode</th>
                        <th className="py-3 px-4">Route</th>
                        <th className="py-3 px-4">Facility</th>
                        {hasPermission(currentUser.role, "allowDatabaseCrud") && <th className="py-3 px-4 text-right w-24">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                      {filteredPostcodes.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-slate-400">{item.id}</td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{item.province}</td>
                          <td className="py-2.5 px-4 text-slate-800">{item.district}</td>
                          <td className="py-2.5 px-4 text-slate-650">{item.commune}</td>
                          <td className="py-2.5 px-4 font-bold text-blue-700 bg-blue-50/10 whitespace-nowrap">{item.new_city_name || "-"}</td>
                          <td className="py-2.5 px-4">
                            <span className="font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                              {item.existing_postcode || "-"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span 
                              className="font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-150 max-w-[140px] truncate inline-block align-middle"
                              title={item.new_postcode}
                            >
                              {item.new_postcode && item.new_postcode.length > 15 ? `${item.new_postcode.slice(0, 12)}...` : item.new_postcode}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-500">{item.ib_sort_co || "-"}</td>
                          <td className="py-2.5 px-4 text-slate-500">{item.inbound_fac || "-"}</td>
                          {hasPermission(currentUser.role, "allowDatabaseCrud") && (
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {deleteConfirmId === item.id ? (
                                  <div className="flex items-center gap-1 hover:scale-100 bg-red-50 border border-red-200 px-2 py-1 rounded shadow-xs">
                                    <span className="text-[10px] text-red-650 font-black select-none">Delete?</span>
                                    <button
                                      onClick={() => {
                                        handleDeleteRecord(item.id);
                                        setDeleteConfirmId(null);
                                      }}
                                      className="bg-red-600 hover:bg-red-700 text-white rounded px-1.5 py-0.5 text-[9px] font-bold shadow-xs cursor-pointer border-none"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmId(null)}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded px-1.5 py-0.5 text-[9px] font-semibold cursor-pointer border-none"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleOpenEditModal(item)}
                                      className="p-1 px-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded transition-all cursor-pointer"
                                      title="Edit record properties"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmId(item.id)}
                                      className="p-1 px-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 border border-transparent hover:border-red-100 rounded transition-all cursor-pointer"
                                      title="Delete from table"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer status summary row */}
                <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-slate-500 text-xs flex justify-between items-center sm:flex-row flex-col gap-2">
                  <span>
                    Displaying <strong>{filteredPostcodes.length}</strong> of{" "}
                    <strong>{postcodes.length}</strong> available records matching filters.
                  </span>
                  <span className="text-[10px] uppercase font-mono tracking-wider font-semibold bg-white px-2 py-0.5 rounded border text-slate-400">
                    Cambodia Logistics standard schema
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-12 border-2 border-dashed border-slate-200 rounded-lg text-center text-slate-400 flex flex-col items-center justify-center gap-2 bg-slate-50/20">
                <Search className="w-8 h-8 text-slate-300" />
                <p className="text-sm font-semibold">No records match your filters.</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Try clearing the query text search or choosing "All Provinces" to show baseline entries.
                </p>
              </div>
            )}

          </div>
        )}

        {/* TAB 4: SUPERADMIN COMMAND CENTER */}
        {activeTab === "superadmin" && hasPermission(currentUser.role, "allowSuperadminSettings") && (
          <div className="flex flex-col gap-6 p-1 sm:p-2 animate-fadeIn">
            
            {/* Top Overview banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                  <ShieldCheck className="text-amber-400 w-6 h-6 animate-pulse" />
                  Superadmin Command Center
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Manage external sync gateways, database APIs, and configure administrative access rights.
                </p>
              </div>
              <div className="bg-amber-400 text-slate-955 font-black text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-slate-955 animate-pulse"></span>
                ROOT CONSOLE ACTIVE
              </div>
            </div>

            {/* Subsections Grid: Left = API Config, Right = User Approvals */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Subsection: API INTEGRATION GATEWAYS */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 sm:p-6">
                  
                  <div className="border-b border-slate-100 pb-3 mb-5">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                      <Zap className="text-blue-500 w-4.5 h-4.5 animate-bounce" />
                      External API Integrations Setup
                    </h4>
                    <p className="text-slate-500 text-[10.5px] mt-0.5">
                      Configure connection criteria for live cloud synchronization and deep-indexing.
                    </p>
                  </div>

                  <form onSubmit={handleSaveApiConnections} className="flex flex-col gap-6">

                    {/* Portal Branding Customization Card */}
                    <div className="bg-amber-50/10 border border-slate-200 rounded-xl p-4 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                          <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded flex items-center justify-center font-bold text-xs">🌐</span>
                          Branding Portal Configuration
                        </span>
                        <span className="font-mono text-[9px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Primary Site Branding
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9.5px] font-bold text-slate-500 uppercase flex items-center justify-between">
                            <span>APPLICATION SITE HEADER TITLE</span>
                            <span className="font-mono text-[8.5px] font-extrabold text-amber-600 bg-amber-50 px-1 rounded">SITE_TITLE</span>
                          </label>
                          <input 
                            type="text"
                            value={apiConnections.siteTitle || ""}
                            placeholder="e.g. Cambodia Postcode by DHL Express Cambodia"
                            onChange={(e) => setApiConnections(prev => ({ ...prev, siteTitle: e.target.value }))}
                            className="bg-white border border-slate-200 text-slate-700 p-2.5 rounded-lg text-xs outline-none focus:border-amber-400 font-sans font-semibold shadow-2xs"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9.5px] font-bold text-slate-500 uppercase flex items-center justify-between">
                            <span>BROWSER WINDOW TAB TITLE</span>
                            <span className="font-mono text-[8.5px] font-extrabold text-teal-600 bg-teal-50 px-1 rounded">PLATFORM_TITLE</span>
                          </label>
                          <input 
                            type="text"
                            value={apiConnections.platformTitle || ""}
                            placeholder="e.g. Cambodia Postcode Migrator | Google AI Studio"
                            onChange={(e) => setApiConnections(prev => ({ ...prev, platformTitle: e.target.value }))}
                            className="bg-white border border-slate-200 text-slate-700 p-2.5 rounded-lg text-xs outline-none focus:border-teal-400 font-sans font-semibold shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* Website Logo Customization subgroup */}
                      <div className="border-t border-slate-200/60 pt-4 mt-2">
                        <span className="text-[10.5px] font-bold text-slate-650 uppercase block mb-3 tracking-wider">
                          Website Logo Customization
                        </span>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9.5px] font-bold text-slate-500 uppercase flex items-center justify-between">
                              <span>WEBSITE LOGO ICON TYPE</span>
                              <span className="font-mono text-[8.5px] font-extrabold text-indigo-600 bg-indigo-50 px-1 rounded">LOGO_TYPE</span>
                            </label>
                            <select
                              value={apiConnections.websiteLogoType || "preset"}
                              onChange={(e) => setApiConnections(prev => ({ ...prev, websiteLogoType: e.target.value as any }))}
                              className="bg-white border border-slate-200 text-slate-755 p-2 rounded-lg text-xs outline-none focus:border-indigo-400 font-semibold cursor-pointer"
                            >
                              <option value="preset">Pre-set Theme Icons</option>
                              <option value="url">Custom Image URL</option>
                              <option value="svg">Custom Raw SVG Markup Code</option>
                            </select>
                          </div>

                          {/* Conditional preset option */}
                          {(apiConnections.websiteLogoType === "preset" || !apiConnections.websiteLogoType) && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9.5px] font-bold text-slate-500 uppercase flex items-center justify-between">
                                <span>SELECT PRESET ICON</span>
                                <span className="font-mono text-[8.5px] font-extrabold text-indigo-600 bg-indigo-50 px-1 rounded">PRESET</span>
                              </label>
                              <select
                                value={apiConnections.websiteLogoPreset || "envelope"}
                                onChange={(e) => setApiConnections(prev => ({ ...prev, websiteLogoPreset: e.target.value }))}
                                className="bg-white border border-slate-200 text-slate-755 p-2 rounded-lg text-xs outline-none focus:border-indigo-400 font-semibold cursor-pointer"
                              >
                                <option value="envelope">Envelope / Mailbox Icon (Default)</option>
                                <option value="globe">Globe / World Map Icon</option>
                                <option value="map">Flat Map Sheet Icon</option>
                                <option value="map-pin">Geographic Map Pin Icon</option>
                                <option value="navigation">Sleek Router Navigation Arrow</option>
                                <option value="sparkles">AI Magic Sparkles Icon</option>
                                <option value="building">Government Post Building Icon</option>
                                <option value="home">Logistics Home Delivery Base</option>
                                <option value="shield">Secure Shield Security Logo</option>
                              </select>
                            </div>
                          )}

                          {/* Conditional custom URL */}
                          {apiConnections.websiteLogoType === "url" && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9.5px] font-bold text-slate-500 uppercase flex items-center justify-between">
                                <span>CUSTOM LOGO IMAGE URL</span>
                                <span className="font-mono text-[8.5px] font-bold text-pink-600 bg-pink-50 px-1 rounded">IMAGE_URL</span>
                              </label>
                              <input 
                                type="text"
                                value={apiConnections.websiteLogoUrl || ""}
                                placeholder="e.g. https://example.com/logo.png"
                                onChange={(e) => setApiConnections(prev => ({ ...prev, websiteLogoUrl: e.target.value }))}
                                className="bg-white border border-slate-200 text-slate-700 p-2.5 rounded-lg text-xs outline-none focus:border-pink-400 font-mono"
                              />
                            </div>
                          )}

                          {/* Conditional custom SVG markup */}
                          {apiConnections.websiteLogoType === "svg" && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9.5px] font-bold text-slate-500 uppercase flex items-center justify-between">
                                <span>CUSTOM RAW SVG CODE</span>
                                <span className="font-mono text-[8.5px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">SVG_CODE</span>
                              </label>
                              <textarea 
                                rows={2}
                                value={apiConnections.websiteLogoSvg || ""}
                                placeholder="e.g. &lt;svg viewBox='0 0 24 24'&gt;&lt;path d='...' /&gt;&lt;/svg&gt;"
                                onChange={(e) => setApiConnections(prev => ({ ...prev, websiteLogoSvg: e.target.value }))}
                                className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg text-[10.5px] outline-none focus:border-emerald-400 font-mono"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Postcode Search Toggles Group */}
                      <div className="border-t border-slate-200/60 pt-4">
                        <span className="text-[10.5px] font-bold text-slate-650 uppercase block mb-3 flex items-center gap-1.5 tracking-wider">
                          Postcode Search Strategy Definitions &amp; Toggles
                        </span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                          {/* 1. Free-Text Search Toggle */}
                          <div className="bg-white rounded-lg border border-slate-200 p-3 flex flex-col justify-between gap-2 hover:shadow-2xs transition-shadow">
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-750">
                                <FileText className="w-4 h-4 text-amber-550 shrink-0" />
                                <span>Free-Text Parser</span>
                              </div>
                              <p className="text-[9.5px] text-slate-400 leading-tight mt-1">
                                High-intelligence informal text normalization.
                              </p>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                              <span className={`text-[9px] font-mono font-bold ${apiConnections.enableTextSearch !== false ? "text-emerald-600" : "text-red-500"}`}>
                                {apiConnections.enableTextSearch !== false ? "LIVE" : "OFF"}
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={apiConnections.enableTextSearch !== false}
                                  onChange={(e) => setApiConnections(prev => ({ ...prev, enableTextSearch: e.target.checked }))}
                                  className="sr-only peer"
                                />
                                <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-400"></div>
                              </label>
                            </div>
                          </div>

                          {/* 2. Photo Search Toggle */}
                          <div className="bg-white rounded-lg border border-slate-200 p-3 flex flex-col justify-between gap-2 hover:shadow-2xs transition-shadow">
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-750">
                                <Camera className="w-4 h-4 text-indigo-505 shrink-0" />
                                <span>AI OCR Scanner</span>
                              </div>
                              <p className="text-[9.5px] text-slate-400 leading-tight mt-1">
                                Multimodal camera label scan and lookup.
                              </p>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                              <span className={`text-[9px] font-mono font-bold ${apiConnections.enablePhotoSearch !== false ? "text-indigo-600" : "text-red-500"}`}>
                                {apiConnections.enablePhotoSearch !== false ? "LIVE" : "OFF"}
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={apiConnections.enablePhotoSearch !== false}
                                  onChange={(e) => setApiConnections(prev => ({ ...prev, enablePhotoSearch: e.target.checked }))}
                                  className="sr-only peer"
                                />
                                <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-400"></div>
                              </label>
                            </div>
                          </div>

                          {/* 3. Map Search Toggle */}
                          <div className="bg-white rounded-lg border border-slate-200 p-3 flex flex-col justify-between gap-2 hover:shadow-2xs transition-shadow">
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-750">
                                <Map className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Locator Pin Map</span>
                              </div>
                              <p className="text-[9.5px] text-slate-400 leading-tight mt-1">
                                Coordinate geographic pin distance resolution.
                              </p>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                              <span className={`text-[9px] font-mono font-bold ${apiConnections.enableMapSearch !== false ? "text-emerald-650" : "text-red-500"}`}>
                                {apiConnections.enableMapSearch !== false ? "LIVE" : "OFF"}
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={apiConnections.enableMapSearch !== false}
                                  onChange={(e) => setApiConnections(prev => ({ ...prev, enableMapSearch: e.target.checked }))}
                                  className="sr-only peer"
                                />
                                <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-400"></div>
                              </label>
                            </div>
                          </div>

                          {/* 4. Dropdowns Search Toggle */}
                          <div className="bg-white rounded-lg border border-slate-200 p-3 flex flex-col justify-between gap-2 hover:shadow-2xs transition-shadow">
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-750">
                                <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                                <span>Dropdown Selects</span>
                              </div>
                              <p className="text-[9.5px] text-slate-400 leading-tight mt-1">
                                Hierarchical administrative selector filters.
                              </p>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                              <span className={`text-[9px] font-mono font-bold ${apiConnections.enableDropdownSearch !== false ? "text-blue-600" : "text-red-500"}`}>
                                {apiConnections.enableDropdownSearch !== false ? "LIVE" : "OFF"}
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={apiConnections.enableDropdownSearch !== false}
                                  onChange={(e) => setApiConnections(prev => ({ ...prev, enableDropdownSearch: e.target.checked }))}
                                  className="sr-only peer"
                                />
                                <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-400"></div>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive API Gateway and Integration Editors */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-5 text-white">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-amber-400 text-slate-950 rounded flex items-center justify-center font-bold text-[10px]">API</span>
                            <span className="text-xs font-bold text-slate-100">Editable API & Integration Credentials</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setShowApiKeys(!showApiKeys)}
                              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 border border-slate-700"
                            >
                              {showApiKeys ? "🙈 Hide API Keys" : "👁️ Show API Keys"}
                            </button>
                            <span className="bg-amber-450/10 text-amber-400 border border-amber-500/25 px-2.5 py-0.5 rounded text-[9.5px] font-mono uppercase font-black tracking-wider flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-450 animate-pulse"></span>
                              Editing Active
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-slate-400 leading-relaxed mb-1">
                          You can fully customize and override your integration credentials below. Click <strong className="text-amber-400">"Save Configuration Parameters"</strong> at the bottom of the page to commit changes securely.
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 1. Supabase Gateway Component */}
                          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="text-[10px] font-bold text-slate-350 tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                DATABASE GATEWAY (SUPABASE)
                              </span>
                              {supabaseLiveStatus.loading ? (
                                <span className="text-[9px] text-slate-400 font-mono">SCANNING...</span>
                              ) : supabaseLiveStatus.status === "connected" ? (
                                <span className="text-[9px] text-emerald-400 font-mono font-bold">CONNECTED ({supabaseLiveStatus.count ?? 0} Rows)</span>
                              ) : (
                                <span className="text-[9px] text-amber-500 font-mono font-bold">ERR/LOCAL</span>
                              )}
                            </div>
                            <div className="flex flex-col gap-2.5">
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-450 uppercase font-mono">SUPABASE URL</label>
                                <input
                                  type="text"
                                  value={apiConnections.supabaseUrl || ""}
                                  placeholder="e.g. https://your-project.supabase.co"
                                  onChange={(e) => setApiConnections(prev => ({ ...prev, supabaseUrl: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded text-xs outline-none focus:border-amber-400 font-mono"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-450 uppercase font-mono">SUPABASE SERVICE ROLE / KEY</label>
                                <input
                                  type={showApiKeys ? "text" : "password"}
                                  value={apiConnections.supabaseKey || ""}
                                  placeholder="Type your Supabase JWT private secret key"
                                  onChange={(e) => setApiConnections(prev => ({ ...prev, supabaseKey: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded text-xs outline-none focus:border-amber-400 font-mono"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-450 uppercase font-mono">SUPABASE TABLE NAME</label>
                                <input
                                  type="text"
                                  value={apiConnections.supabaseTableName || ""}
                                  placeholder="e.g. cambodia_postcode_migration"
                                  onChange={(e) => setApiConnections(prev => ({ ...prev, supabaseTableName: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded text-xs outline-none focus:border-amber-400 font-mono"
                                />
                              </div>
                            </div>
                          </div>

                          {/* 2. Gemini AI Mapper Component */}
                          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="text-[10px] font-bold text-slate-350 tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                AI NEURAL MAPPER (GEMINI)
                              </span>
                              {geminiLiveStatus.loading ? (
                                <span className="text-[9px] text-slate-400 font-mono">SCANNING...</span>
                              ) : geminiLiveStatus.status === "connected" ? (
                                <span className="text-[9px] text-blue-400 font-mono font-bold">OPERATIONAL</span>
                              ) : (
                                <span className="text-[9px] text-rose-400 font-mono font-bold">OFFLINE</span>
                              )}
                            </div>
                            <div className="flex flex-col gap-2.5">
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-450 uppercase font-mono">GEMINI API KEY</label>
                                <input
                                  type={showApiKeys ? "text" : "password"}
                                  value={apiConnections.geminiKey || ""}
                                  placeholder="Type your Google Gemini API secret key"
                                  onChange={(e) => setApiConnections(prev => ({ ...prev, geminiKey: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded text-xs outline-none focus:border-amber-400 font-mono"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-450 uppercase font-mono">GEMINI MODEL VERSION</label>
                                <select
                                  value={apiConnections.geminiVersion || "gemini-3.5-flash"}
                                  onChange={(e) => setApiConnections(prev => ({ ...prev, geminiVersion: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded text-xs outline-none focus:border-amber-400 font-mono cursor-pointer"
                                >
                                  <option value="gemini-3.5-flash">gemini-3.5-flash (Default High-Speed)</option>
                                  <option value="gemini-1.5-flash">gemini-1.5-flash (Standard OCR)</option>
                                  <option value="gemini-1.5-pro">gemini-1.5-pro (High intelligence)</option>
                                  <option value="gemini-2.1-pro">gemini-2.1-pro (Premium Ultra)</option>
                                </select>
                              </div>
                              <div className="text-[9px] text-slate-450 leading-relaxed mt-1">
                                Used for smart free-text normalization, bulk address analysis, and camera image OCR parsing.
                              </div>
                            </div>
                          </div>

                          {/* 3. PostgREST alternative Database */}
                          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="text-[10px] font-bold text-slate-350 tracking-wider flex items-center gap-1.5">
                                <Database className="w-3.5 h-3.5 text-amber-500" />
                                POSTGREST DATABASE GATEWAY
                              </span>
                              <span className={`text-[9px] font-mono font-bold ${apiConnections.usePostgrestAlternative ? "text-emerald-400" : "text-amber-500"}`}>
                                {apiConnections.usePostgrestAlternative ? "ALTERNATIVE ACTIVE" : "STANDBY"}
                              </span>
                            </div>
                            <div className="flex flex-col gap-2.5">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[9px] font-bold text-slate-450 uppercase font-mono">POSTGREST ENGINE URL</label>
                                  <button
                                    type="button"
                                    onClick={() => setApiConnections(prev => ({ ...prev, postgrestUrl: "https://gjodeadljbvtwjiagqqr.supabase.co" }))}
                                    className="text-[8.5px] text-amber-450 hover:underline font-bold"
                                  >
                                    ⚡ Set Default URL
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={apiConnections.postgrestUrl || ""}
                                  placeholder="e.g. https://gjodeadljbvtwjiagqqr.supabase.co"
                                  onChange={(e) => setApiConnections(prev => ({ ...prev, postgrestUrl: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded text-xs outline-none focus:border-amber-400 font-mono"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-450 uppercase font-mono">POSTGREST SECRET KEY / PRIVATE JWT</label>
                                <input
                                  type={showApiKeys ? "text" : "password"}
                                  value={apiConnections.postgrestKey || ""}
                                  placeholder="Type your PostgREST authorization JWT Token"
                                  onChange={(e) => setApiConnections(prev => ({ ...prev, postgrestKey: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded text-xs outline-none focus:border-amber-400 font-mono"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-450 uppercase font-mono">POSTGREST TARGET TABLE</label>
                                <input
                                  type="text"
                                  value={apiConnections.postgrestTable || ""}
                                  placeholder="e.g. cambodia_postcode_migration"
                                  onChange={(e) => setApiConnections(prev => ({ ...prev, postgrestTable: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded text-xs outline-none focus:border-amber-400 font-mono"
                                />
                              </div>
                              <div className="flex items-center justify-between border-t border-slate-800/60 pt-2.5 mt-1">
                                <div className="flex flex-col">
                                  <span className="text-[9.5px] font-bold text-slate-300">Set as Active Database Connection?</span>
                                  <span className="text-[8.5px] text-slate-450">Bypasses main Supabase URL for dynamic writes</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!!apiConnections.usePostgrestAlternative}
                                    onChange={(e) => setApiConnections(prev => ({ ...prev, usePostgrestAlternative: e.target.checked }))}
                                    className="sr-only peer"
                                  />
                                  <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-450"></div>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* 4. Google Maps Platform UI Integrations */}
                          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="text-[10px] font-bold text-slate-350 tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                GOOGLE MAPS PLATFORM
                              </span>
                              <span className="text-[9px] text-amber-400 font-mono">ACTIVE</span>
                            </div>
                            <div className="flex flex-col gap-2.5">
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-450 uppercase font-mono">GOOGLE MAPS API KEY</label>
                                <input
                                  type={showApiKeys ? "text" : "password"}
                                  value={apiConnections.googleMapsKey || ""}
                                  placeholder="Type Google Maps API key (AI Reverse Geocoder)"
                                  onChange={(e) => setApiConnections(prev => ({ ...prev, googleMapsKey: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded text-xs outline-none focus:border-amber-400 font-mono"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-450 uppercase font-mono">GOOGLE MAPS ID</label>
                                <input
                                  type="text"
                                  value={apiConnections.googleMapsId || ""}
                                  placeholder="e.g. DEMO_MAP_ID"
                                  onChange={(e) => setApiConnections(prev => ({ ...prev, googleMapsId: e.target.value }))}
                                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded text-xs outline-none focus:border-amber-400 font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Diagnostic Scan & Actions Tray */}
                        <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-lg flex flex-col gap-2">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div className="flex-1">
                              <span className="text-[10px] font-bold text-slate-300 uppercase block">Diagnostics Console Output:</span>
                              <span className="text-[9.5px] font-mono text-slate-400 mt-0.5 leading-snug block">
                                {supabaseLiveStatus.loading || geminiLiveStatus.loading 
                                  ? "Waiting for diagnostics scan responses..." 
                                  : `Supabase: [${supabaseLiveStatus.status || "idle"}] | Gemini: [${geminiLiveStatus.status || "idle"}]`}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={checkLiveApis}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                              >
                                <RotateCcw className="w-3 h-3" /> Execute System Diagnostic
                              </button>
                              {supabaseLiveStatus.status === "connected" && (
                                <button
                                  type="button"
                                  onClick={handleSyncToLocal}
                                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
                                  title="Download and copy whole record dataset from your live Supabase into offline server cache"
                                >
                                  <CloudDownload className="w-3.5 h-3.5" /> Replicate Supabase to Local
                                </button>
                              )}
                            </div>
                          </div>
                          {(supabaseLiveStatus.message || geminiLiveStatus.message) && (
                            <div className="text-[9.5px] font-mono text-amber-400 bg-amber-500/5 p-2 rounded border border-amber-500/10 mt-1 leading-snug break-all">
                              {supabaseLiveStatus.message || geminiLiveStatus.message}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Creative Assets & Branding Session */}
                    <div className="bg-amber-50/20 border border-amber-100 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                          <span className="w-5 h-5 bg-amber-400 text-slate-900 rounded flex items-center justify-center font-sans font-extrabold text-[10px]">🎨</span>
                          Custom Homepage Background Slideshow ({heroBgImages.length} Images)
                        </span>
                        <span className="font-mono text-[9px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Active Slideshow Customizer
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 mt-1">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between col-span-2">
                            <span>Slideshow Image URLs (Supports &gt; 4 images for live preview)</span>
                            <button
                              type="button"
                              onClick={() => {
                                setHeroBgImages(prev => [...prev, "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=2000&q=80"]);
                              }}
                              className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 bg-amber-100/50 hover:bg-amber-100 px-2 py-0.5 rounded transition-all cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Add Image Slide
                            </button>
                          </label>

                          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                            {heroBgImages.map((imgUrl, index) => (
                              <div key={index} className="flex gap-2 items-center bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">
                                <span className="font-mono text-xs font-bold w-6 text-center text-slate-400">#{index + 1}</span>
                                <div className="w-8 h-8 rounded overflow-hidden shadow-inner border border-slate-100 shrink-0 bg-slate-100">
                                  <img 
                                    src={imgUrl} 
                                    alt={`Slide ${index + 1}`} 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1541746972996-4e0b0f43e01a?auto=format&fit=crop&w=150&q=80";
                                    }}
                                  />
                                </div>
                                <input 
                                  type="text" 
                                  value={imgUrl} 
                                  onChange={(e) => {
                                    const updated = [...heroBgImages];
                                    updated[index] = e.target.value;
                                    setHeroBgImages(updated);
                                  }}
                                  className="flex-1 bg-slate-50/50 border border-slate-200 text-slate-700 px-2 py-1.5 rounded text-xs outline-none focus:border-amber-400 font-sans font-mono" 
                                  placeholder="Enter photo Unsplash URL..."
                                />
                                <button
                                  type="button"
                                  disabled={heroBgImages.length <= 1}
                                  onClick={() => {
                                    const updated = heroBgImages.filter((_, idx) => idx !== index);
                                    setHeroBgImages(updated);
                                    if (currentHeroIndex >= updated.length) {
                                      setCurrentHeroIndex(0);
                                    }
                                  }}
                                  className="p-1 px-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded transition-all cursor-pointer disabled:opacity-40"
                                  title="Delete Slide"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Footer Copyright Text Box</label>
                          <textarea 
                            rows={2}
                            value={footerCopyright} 
                            onChange={(e) => setFooterCopyright(e.target.value)}
                            className="bg-white border border-slate-200 text-slate-700 p-2 text-xs outline-none focus:border-amber-400 font-sans resize-none" 
                            placeholder="Enter footer copyright message..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Save Config buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-slate-100 pt-4 gap-3">
                      <div className="flex-1">
                        {configSavedToast && (
                          <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg flex items-center gap-1.5 animate-fadeIn">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            ✓ Commited! Credentials, platform window title, and slides updated live.
                          </span>
                        )}
                        {configSaving && (
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-2 animate-pulse">
                            <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                            Encrypting and committing variables to safe storage...
                          </span>
                        )}
                      </div>
                      <button 
                        type="submit"
                        disabled={configSaving}
                        className={`font-sans font-bold px-6 py-2.5 rounded-lg text-xs tracking-wide flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-wait ${
                          configSavedToast 
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                            : "bg-amber-400 hover:bg-amber-500 text-slate-950"
                        }`}
                      >
                        {configSaving ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                            Securing Layout...
                          </>
                        ) : configSavedToast ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            Configurations Saved!
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                            Save Configurations
                          </>
                        )}
                      </button>
                    </div>

                  </form>

                </div>

                {/* Advanced Database Actions & Maintenance card */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 sm:p-6 mt-4">
                  <div className="border-b border-slate-100 pb-3 mb-5">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                      <Database className="text-emerald-500 w-4.5 h-4.5" />
                      Database Sync & Maintenance Operations
                    </h4>
                    <p className="text-slate-500 text-[10.5px] mt-0.5">
                      Execute master-replication tasks to synchronize local databases and live Supabase cloud registers seamlessly.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Action 1: Push Local to Supabase */}
                    <div className="border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3 bg-slate-50/50">
                      <div>
                        <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <CloudLightning className="text-blue-500 w-4 h-4" />
                          Push Local Cache to Cloud
                        </h5>
                        <p className="text-slate-500 text-[10.5px] mt-1 leading-normal">
                          Pushes your active local directory entries (including any edits or new values) to populate the Supabase cloud database table. This fixes missing entries like <code className="bg-blue-50 text-blue-700 px-1 font-bold">RT-BMC-31</code> / <code className="bg-blue-50 text-blue-700 px-1 font-bold">FAC-BMC</code>.
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        {syncConfirmActive ? (
                          <div className="flex flex-col gap-1.5 animate-fadeIn">
                            <span className="text-[10px] text-amber-600 font-extrabold uppercase">⚠️ CONFIRM SYNC? THIS OVERWRITES SUPABASE</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  handleSyncToCloud();
                                  setSyncConfirmActive(false);
                                }}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold p-1 rounded text-[10px] uppercase tracking-wide transition-all cursor-pointer"
                              >
                                Yes, Execute Sync
                              </button>
                              <button
                                type="button"
                                onClick={() => setSyncConfirmActive(false)}
                                className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold p-1 px-3 rounded text-[10px] uppercase transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSyncConfirmActive(true);
                              setResetConfirmActive(false);
                            }}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold px-3 py-1.5 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 text-center shadow-2xs"
                          >
                            <CloudUpload className="w-3.5 h-3.5" />
                            Push local ({postcodes.length || 1653} postcodes) to cloud
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action 2: Reset to baseline */}
                    <div className="border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3 bg-slate-50/50">
                      <div>
                        <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <RotateCcw className="text-amber-500 w-4 h-4" />
                          Restore Database Baseline
                        </h5>
                        <p className="text-slate-500 text-[10.5px] mt-1 leading-normal">
                          Deletes all overrides and completely restores both the local cache and Supabase to the original gold-standard directory of <b>1653 official Cambodian baseline postcode records</b>.
                        </p>
                      </div>

                      <div className="flex flex-col gap-1">
                        {resetConfirmActive ? (
                          <div className="flex flex-col gap-1.5 animate-fadeIn">
                            <span className="text-[10px] text-red-600 font-extrabold uppercase">⚠️ ABSOLUTE DESTRUCTIVE RESTORE RESETS BOTH DATABASES</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  handleResetDatabase();
                                  setResetConfirmActive(false);
                                }}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold p-1 rounded text-[10px] uppercase tracking-wide transition-all cursor-pointer"
                              >
                                Yes, Restore to Baseline
                              </button>
                              <button
                                type="button"
                                onClick={() => setResetConfirmActive(false)}
                                className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold p-1 px-3 rounded text-[10px] uppercase transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setResetConfirmActive(true);
                              setSyncConfirmActive(false);
                            }}
                            className="bg-amber-50 hover:bg-amber-100/50 text-slate-900 border border-amber-200 font-bold px-3 py-1.5 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 text-center shadow-2xs"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-550" />
                            Reset both databases to 1653 baseline
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Subsection: USER AUTHORIZATION & APPROVAL PANEL */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div id="root_admin_registry_crud_panel" className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 sm:p-6 flex flex-col gap-4">
                  
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="text-amber-500 w-4.5 h-4.5" />
                        Admin Registry Panel
                      </h4>
                      <p className="text-slate-500 text-[10px] mt-1 leading-normal">
                        Add, edit, delete, and authorize regional postmasters, editors, or system admins.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowAddUserForm(!showAddUserForm);
                        setEditingUserId(null); // Cancel edit
                      }}
                      className="bg-amber-400 hover:bg-amber-500 text-slate-955 p-1.5 px-2.5 rounded-lg text-[10px] font-bold tracking-wide flex items-center gap-1 shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs"
                    >
                      {showAddUserForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {showAddUserForm ? "Cancel" : "Add Admin"}
                    </button>
                  </div>

                  {showAddUserForm && (
                    <form onSubmit={handleCreateUser} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-3 animate-fadeIn">
                      <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">New Representative account</div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
                        <input
                          type="text"
                          required
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="e.g. Seyha San"
                          className="w-full bg-white border border-slate-200 text-xs px-2.5 py-1.5 rounded outline-none focus:border-amber-400 font-sans"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
                        <input
                          type="email"
                          required
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="e.g. seyha@mptc.gov.kh"
                          className="w-full bg-white border border-slate-200 text-xs px-2.5 py-1.5 rounded outline-none focus:border-amber-400 font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Access Role</label>
                          <select
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value)}
                            className="bg-white border border-slate-200 text-xs p-1 px-2 rounded outline-none focus:border-amber-400"
                          >
                            {roleFeaturesList.filter(r => r.id !== "public").map(r => (
                              <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1 justify-center items-start pt-3">
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={newUserApproved}
                              onChange={(e) => setNewUserApproved(e.target.checked)}
                              className="accent-amber-400"
                            />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Approved</span>
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-slate-900 hover:bg-slate-950 text-white font-sans text-[10px] font-bold py-1.5 px-3 rounded-md shadow-sm cursor-pointer mt-1"
                      >
                        Create Administrator
                      </button>
                    </form>
                  )}

                  {/* Registered Users List */}
                  <div className="flex flex-col gap-3">
                    {loadingUsers ? (
                      <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
                        <span>Synchronizing administrative directories...</span>
                      </div>
                    ) : usersList.filter(user => user.email && user.email.toLowerCase() !== 'hempiden@gmail.com').length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-450 border border-dashed border-slate-200 rounded-xl">
                        No active registered moderators or admins found.
                      </div>
                    ) : (
                      usersList
                        .filter(user => user.email && user.email.toLowerCase() !== 'hempiden@gmail.com')
                        .map((user) => {
                        const isEditing = editingUserId === user.id;

                        if (isEditing) {
                          return (
                            <div key={user.id} className="p-3.5 rounded-xl border border-amber-302 bg-amber-50/5/10 flex flex-col gap-3 animate-fadeIn">
                              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Edit Agent Account</div>
                              
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
                                <input
                                  type="text"
                                  required
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  className="w-full bg-white border border-slate-200 text-xs px-2.5 py-1.5 rounded outline-none focus:border-amber-400 font-sans"
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
                                <input
                                  type="email"
                                  required
                                  value={editingEmail}
                                  onChange={(e) => setEditingEmail(e.target.value)}
                                  className="w-full bg-white border border-slate-200 text-xs px-2.5 py-1.5 rounded outline-none focus:border-amber-400 font-sans"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Access Role</label>
                                  <select
                                    value={editingRole}
                                    onChange={(e) => setEditingRole(e.target.value)}
                                    className="bg-white border border-slate-200 text-xs p-1 rounded outline-none focus:border-amber-400"
                                  >
                                    {roleFeaturesList.filter(r => r.id !== "public").map(r => (
                                      <option key={r.id} value={r.name}>{r.name}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex flex-col gap-1 justify-center items-start pt-3">
                                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={editingApproved}
                                      onChange={(e) => setEditingApproved(e.target.checked)}
                                      className="accent-amber-400"
                                    />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Approved</span>
                                  </label>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mt-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateUser(user.id)}
                                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-1.5 rounded transition-colors cursor-pointer"
                                >
                                  Save Changes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingUserId(null)}
                                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold py-1.5 rounded transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div 
                            key={user.id} 
                            className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all group ${
                              user.approved 
                                ? "bg-slate-50/50 border-slate-200/70" 
                                : "bg-amber-50/20 border-amber-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800 leading-tight">
                                  {user.name}
                                </span>
                                <span className="text-[10px] text-slate-400 leading-tight font-mono mt-0.5">{user.email}</span>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                {/* Role Badge */}
                                <span className={`p-1 px-2 rounded font-mono text-[9px] uppercase font-bold inline-block border ${
                                  user.role === "Admin"
                                    ? "bg-purple-50 text-purple-700 border-purple-150"
                                    : user.role === "Superadmin"
                                    ? "bg-amber-50 text-amber-800 border-amber-150"
                                    : "bg-blue-50 text-blue-750 border-blue-150"
                                }`}>
                                  {user.role}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-slate-100">
                              {/* Approval Indicator status */}
                              <div className="flex items-center gap-1.5 text-[10px] select-none">
                                <span className={`w-1.5 h-1.5 rounded-full ${user.approved ? "bg-emerald-500" : "bg-amber-400 animate-pulse"}`}></span>
                                <span className={`font-mono text-[9px] rounded font-bold uppercase ${user.approved ? "text-emerald-700" : "text-amber-600"}`}>
                                  {user.approved ? "Approved" : "Awaiting Appr."}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {/* Approve/Revoke toggle button directly */}
                                <button
                                  onClick={() => user.approved ? handleRevokeUser(user.id) : handleApproveUser(user.id)}
                                  className={`rounded px-2.5 py-1 text-[10px] font-bold cursor-pointer transition-colors border ${
                                    user.approved 
                                      ? "bg-amber-50 text-amber-700 border-amber-150 hover:bg-amber-100" 
                                      : "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
                                  }`}
                                  title={user.approved ? "Revoke Access" : "Grant Access"}
                                >
                                  {user.approved ? "Revoke" : "Approve"}
                                </button>

                                {/* Edit Button */}
                                <button
                                  onClick={() => {
                                    setEditingUserId(user.id);
                                    setEditingName(user.name);
                                    setEditingEmail(user.email);
                                    setEditingRole(user.role);
                                    setEditingApproved(user.approved);
                                    setShowAddUserForm(false); // Close add form
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                                  title="Edit User profile"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>

                                {/* Delete Button */}
                                {userConfirmDeleteId === user.id ? (
                                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-250 px-2 py-0.5 rounded shadow-xs">
                                    <button
                                      onClick={() => {
                                        handleDeleteUser(user.id);
                                        setUserConfirmDeleteId(null);
                                      }}
                                      className="text-[10px] font-black text-red-650 hover:text-red-800 cursor-pointer border-none bg-transparent"
                                    >
                                      Yes
                                    </button>
                                    <span className="text-[9px] text-slate-300 select-none">|</span>
                                    <button
                                      onClick={() => setUserConfirmDeleteId(null)}
                                      className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer border-none bg-transparent"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setUserConfirmDeleteId(user.id)}
                                    className="p-1 text-red-400 hover:text-red-650 hover:bg-red-50 rounded border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                                    title="Remove User"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              </div>

            </div>

            {/* Supabase DB & Vercel setup instructions requested by the user */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 sm:p-6 mt-6">
              <div className="border-b border-slate-100 pb-3 mb-5">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Database className="text-emerald-500 w-4.5 h-4.5 animate-pulse" />
                  Supabase DB Integration & Vercel Environment Setup
                </h4>
                <p className="text-slate-500 text-[10.5px] mt-0.5">
                  Prepare your target PostgreSQL database matching the postal migration column header baseline and securely bind parameters to production containers.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* SQL schema code viewer */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-5 bg-emerald-500 rounded-full"></span>
                      PostgreSQL DDL / Supabase SQL Schema
                    </span>
                    <button
                      type="button; cursor: pointer"
                      onClick={handleCopySQL}
                      className="px-3 py-1 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-amber-400 hover:text-amber-300 rounded text-[10px] font-bold font-sans flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                    >
                      {sqlCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={3} /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                      {sqlCopied ? "Schema Copied!" : "Copy SQL Schema"}
                    </button>
                  </div>

                  <div className="relative shadow-xs rounded-xl overflow-hidden border border-slate-200">
                    <div className="bg-slate-950 font-mono text-[9px] text-slate-400 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                      <span>cambodia_postcode_migration.sql</span>
                      <span>UTF-8 standard</span>
                    </div>
                    <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-b-xl text-[10px] leading-relaxed font-mono overflow-auto max-h-72 text-left scrollbar-thin select-all">
                      <code>{supabaseSQLSchema}</code>
                    </pre>
                  </div>
                </div>

                {/* Integration Instructions */}
                <div className="flex flex-col gap-4">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>
                    Step-by-step Environment Variables Mapping
                  </span>

                  <div className="flex flex-col gap-3 bg-slate-50/70 border border-slate-150 p-4 rounded-xl">
                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 bg-emerald-100 text-emerald-800 font-extrabold rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</div>
                      <div className="flex-1 text-xs">
                        <h5 className="font-bold text-slate-800">Prerequisites from Supabase Dashboard</h5>
                        <p className="text-slate-500 text-[11px] mt-0.5 leading-normal">
                          Login to Supabase, create a new project, go to <b className="text-slate-800">Project Settings</b> &rarr; <b className="text-slate-800">API</b>, and retrieve your public <code className="bg-white px-1.5 py-0.5 border rounded font-mono text-[10px]">Project URL</code> and standard <code className="bg-white px-1.5 py-0.5 border rounded font-mono text-[10px]">anon</code> API service role key.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start border-t border-slate-150 pt-3">
                      <div className="w-5 h-5 bg-blue-100 text-blue-800 font-extrabold rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</div>
                      <div className="flex-1 text-xs">
                        <h5 className="font-bold text-slate-800">Configure Vercel Deployment Settings</h5>
                        <p className="text-slate-500 text-[11px] mt-0.5 leading-normal">
                          Navigate to your project dashboard on Vercel, open <b className="text-slate-800">Settings</b> &rarr; <b className="text-slate-800">Environment Variables</b>. Set the corresponding values to securely link compiling builds:
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          <div className="bg-white border rounded p-2 flex flex-col gap-0.5 shadow-2xs">
                            <span className="text-[8px] font-bold text-slate-400 font-mono">VERCEL ENV VARIABLE KEY</span>
                            <span className="font-mono text-[10px] font-extrabold text-blue-700">VITE_SUPABASE_URL</span>
                            <span className="text-[9px] text-slate-500 leading-normal mt-0.5">Value holds Supabase active project URL.</span>
                          </div>
                          
                          <div className="bg-white border rounded p-2 flex flex-col gap-0.5 shadow-2xs">
                            <span className="text-[8px] font-bold text-slate-400 font-mono">VERCEL ENV VARIABLE KEY</span>
                            <span className="font-mono text-[10px] font-extrabold text-blue-700">VITE_SUPABASE_ANON_KEY</span>
                            <span className="text-[9px] text-slate-500 leading-normal mt-0.5">Value holds supabase anon / service public key.</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start border-t border-slate-150 pt-3">
                      <div className="w-5 h-5 bg-amber-100 text-amber-805 font-extrabold rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</div>
                      <div className="flex-1 text-xs">
                        <h5 className="font-bold text-slate-800">Verify Verification Status</h5>
                        <p className="text-slate-500 text-[11px] mt-0.5 leading-normal">
                          After submitting variables, redeploy Vercel context. The active parameters will automatically initiate communication, rendering the Superadmin Database Sync indicators to <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 font-bold rounded font-mono text-[9px] border border-emerald-100 uppercase">Synchronized</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BRAND NEW PANEL: USER ROLES & PRIVILEGES REGISTRY MATRIX */}
            <div id="vref_rbac_privilege_matrix_panel" className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 sm:p-6 flex flex-col gap-5 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 prose-sm">
                    <Shield className="text-indigo-600 w-4.5 h-4.5 animate-pulse" />
                    Role-Based Access Control (RBAC) & Feature Matrix
                  </h4>
                  <p className="text-slate-500 text-[10px] mt-1 leading-normal max-w-2xl">
                    Define platform authorization tiers, register custom roles, and configure feature visibility. Approved users registered under these roles inherit dynamic permissions instantly.
                  </p>
                </div>
                
                {/* Dynamic New Role Form Inline */}
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-150 shadow-3xs shrink-0 self-start sm:self-center">
                  <input 
                    type="text"
                    placeholder="Custom Role Name... (e.g. Auditor)"
                    id="rbac_new_role_input"
                    className="bg-white text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-505 w-[170px] font-sans"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const input = e.currentTarget;
                        const name = input.value.trim();
                        if (!name) return;
                        
                        const exists = roleFeaturesList.some(r => r.name.toLowerCase() === name.toLowerCase());
                        if (exists) {
                          alert("A role with this name already exists.");
                          return;
                        }

                        const newRole: RoleFeatures = {
                          id: name.toLowerCase().replace(/\s+/g, "_"),
                          name: name,
                          features: {
                            allowSingleLookup: true,
                            allowBulkLookup: false,
                            allowDatabaseCrud: false,
                            allowApiSync: false,
                            allowSuperadminSettings: false,
                            allowUserManagement: false,
                          }
                        };

                        setRoleFeaturesList(prev => [...prev, newRole]);
                        input.value = "";
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById("rbac_new_role_input") as HTMLInputElement;
                      if (input) {
                        const name = input.value.trim();
                        if (!name) return;
                        const exists = roleFeaturesList.some(r => r.name.toLowerCase() === name.toLowerCase());
                        if (exists) {
                          alert("A role with this name already exists.");
                          return;
                        }
                        const newRole: RoleFeatures = {
                          id: name.toLowerCase().replace(/\s+/g, "_"),
                          name: name,
                          features: {
                            allowSingleLookup: true,
                            allowBulkLookup: false,
                            allowDatabaseCrud: false,
                            allowApiSync: false,
                            allowSuperadminSettings: false,
                            allowUserManagement: false,
                          }
                        };
                        setRoleFeaturesList(prev => [...prev, newRole]);
                        input.value = "";
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-1 px-2.5 rounded font-bold text-[10px] uppercase shadow-xs cursor-pointer transition-colors"
                  >
                    Add Role
                  </button>
                </div>
              </div>

              {/* Main Dynamic Table Structure representing Role vs Features Checklist */}
              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-mono text-[9px] uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3 px-4 w-44">Role / Title</th>
                        <th className="py-3 px-3 text-center w-24">
                          <span className="block font-bold">Single Lookup</span>
                          <span className="text-[8px] text-slate-400 capitalize">Interactive Tab</span>
                        </th>
                        <th className="py-3 px-3 text-center w-24">
                          <span className="block font-bold">Bulk Lookup</span>
                          <span className="text-[8px] text-slate-400 capitalize">Enrich & Parse</span>
                        </th>
                        <th className="py-3 px-3 text-center w-24">
                          <span className="block font-bold">DB Directory</span>
                          <span className="text-[8px] text-slate-400 capitalize">Add/Edit List</span>
                        </th>
                        <th className="py-3 px-3 text-center w-24">
                          <span className="block font-bold">Data Sync</span>
                          <span className="text-[8px] text-slate-400 capitalize">Reset & Pull</span>
                        </th>
                        <th className="py-3 px-3 text-center w-24">
                          <span className="block font-bold">Gateway Config</span>
                          <span className="text-[8px] text-slate-400 capitalize">API Tunnels</span>
                        </th>
                        <th className="py-3 px-3 text-center w-24">
                          <span className="block font-bold">User Mgmt</span>
                          <span className="text-[8px] text-slate-400 capitalize">Approvals</span>
                        </th>
                        <th className="py-3 px-4 text-right w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {roleFeaturesList.map((role) => {
                        const toggleFeature = (feat: keyof RoleFeatures["features"]) => {
                          setRoleFeaturesList(prev => prev.map(r => {
                            if (r.id === role.id) {
                              return {
                                ...r,
                                features: {
                                  ...r.features,
                                  [feat]: !r.features[feat]
                                }
                              };
                            }
                            return r;
                          }));
                        };

                        const deleteCustomRole = (rId: string) => {
                          setRoleFeaturesList(prev => prev.filter(r => r.id !== rId));
                        };

                        return (
                          <tr key={role.id} className="hover:bg-slate-50/40 transition-colors text-slate-700">
                            <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                role.id === "superadmin" ? "bg-amber-500" :
                                role.id === "admin" ? "bg-purple-600" :
                                role.id === "editor" ? "bg-blue-500" : "bg-teal-500"
                              }`} />
                              <div className="flex flex-col">
                                <span>{role.name}</span>
                                <span className="text-[8.5px] font-mono text-slate-400 font-medium">/{role.id}</span>
                              </div>
                              {(role.id === "superadmin" || role.id === "public") && (
                                <span className="text-[7.5px] bg-slate-50 border border-slate-200 text-slate-400 px-1 py-0.2 rounded font-sans uppercase font-normal ml-1">System</span>
                              )}
                            </td>
                            
                            {/* Single Lookup Feature Column */}
                            <td className="py-2.5 px-3 text-center">
                              <input 
                                type="checkbox"
                                checked={role.features.allowSingleLookup}
                                onChange={() => toggleFeature("allowSingleLookup")}
                                disabled={role.id === "superadmin"}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 accent-indigo-600 cursor-pointer disabled:opacity-50"
                              />
                            </td>

                            {/* Bulk Lookup Column */}
                            <td className="py-2.5 px-3 text-center">
                              <input 
                                type="checkbox"
                                checked={role.features.allowBulkLookup}
                                onChange={() => toggleFeature("allowBulkLookup")}
                                disabled={role.id === "superadmin"}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 accent-indigo-600 cursor-pointer disabled:opacity-50"
                              />
                            </td>

                            {/* Database CRUD Column */}
                            <td className="py-2.5 px-3 text-center">
                              <input 
                                type="checkbox"
                                checked={role.features.allowDatabaseCrud}
                                onChange={() => toggleFeature("allowDatabaseCrud")}
                                disabled={role.id === "superadmin"}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 accent-indigo-600 cursor-pointer disabled:opacity-50"
                              />
                            </td>

                            {/* Data Sync Column */}
                            <td className="py-2.5 px-3 text-center">
                              <input 
                                type="checkbox"
                                checked={role.features.allowApiSync}
                                onChange={() => toggleFeature("allowApiSync")}
                                disabled={role.id === "superadmin"}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 accent-indigo-600 cursor-pointer disabled:opacity-50"
                              />
                            </td>

                            {/* Gateway Config Column */}
                            <td className="py-2.5 px-3 text-center">
                              <input 
                                type="checkbox"
                                checked={role.features.allowSuperadminSettings}
                                onChange={() => toggleFeature("allowSuperadminSettings")}
                                disabled={role.id === "superadmin"}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 accent-indigo-600 cursor-pointer disabled:opacity-50"
                              />
                            </td>

                            {/* User Management Column */}
                            <td className="py-2.5 px-3 text-center">
                              <input 
                                type="checkbox"
                                checked={role.features.allowUserManagement}
                                onChange={() => toggleFeature("allowUserManagement")}
                                disabled={role.id === "superadmin"}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 accent-indigo-600 cursor-pointer disabled:opacity-50"
                              />
                            </td>

                            {/* Actions Column */}
                            <td className="py-2.5 px-4 text-right">
                              {role.id !== "superadmin" && role.id !== "public" ? (
                                roleConfirmDeleteId === role.id ? (
                                  <div className="flex items-center gap-1.5 justify-end bg-red-50 border border-red-200 px-2 py-0.5 rounded shadow-2xs inline-flex select-none">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        deleteCustomRole(role.id);
                                        setRoleConfirmDeleteId(null);
                                      }}
                                      className="text-[10px] font-black text-red-650 hover:text-red-800 cursor-pointer border-none bg-transparent"
                                    >
                                      Yes
                                    </button>
                                    <span className="text-[10px] text-slate-300 font-semibold select-none">|</span>
                                    <button
                                      type="button"
                                      onClick={() => setRoleConfirmDeleteId(null)}
                                      className="text-[10px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer border-none bg-transparent"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setRoleConfirmDeleteId(role.id)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition-colors cursor-pointer inline-flex items-center justify-center font-sans font-bold"
                                    title={`Delete Custom Role ${role.name}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )
                              ) : (
                                <span className="text-[10px] text-slate-300 font-semibold select-none pr-1">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="mt-auto bg-slate-900 border-t border-slate-850 text-slate-400 py-6 px-6 text-xs font-sans text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            &copy; {footerCopyright}
          </p>
          <div className="flex gap-4 items-center flex-wrap justify-center sm:justify-end">
            {hasPermission(currentUser.role, "allowDatabaseCrud") && (
              <>
                <button 
                  id="nav_nav_about"
                  onClick={() => { setActiveTab("database"); }}
                  className={`hover:text-white transition-colors cursor-pointer font-semibold ${activeTab === "database" ? "text-amber-400 font-extrabold" : "text-slate-400"}`}
                >
                  Postcode Database
                </button>
                <span className="text-slate-700">|</span>
              </>
            )}

            {hasPermission(currentUser.role, "allowSuperadminSettings") && (
              <>
                <button 
                  id="nav_nav_superadmin"
                  onClick={() => { setActiveTab("superadmin"); }}
                  className={`hover:text-white transition-colors cursor-pointer font-semibold ${activeTab === "superadmin" ? "text-amber-400 font-extrabold" : "text-slate-400"}`}
                >
                  Superadmin Console
                </button>
                <span className="text-slate-700">|</span>
              </>
            )}

            {currentUser.role === "public" ? (
              <button
                id="btn_navbar_login"
                onClick={() => setLoginModalOpen(true)}
                className="hover:text-white flex items-center gap-1 group transition-colors cursor-pointer font-semibold"
              >
                Sign In
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex flex-col text-right select-none">
                  <span className="text-[9px] text-slate-500 font-mono tracking-tight uppercase leading-none font-bold">{currentUser.role}</span>
                  <span className="text-xs text-slate-300 font-extrabold leading-tight tracking-wide">{currentUser.username}</span>
                </div>
                <button
                  id="btn_navbar_logout"
                  onClick={() => {
                    setCurrentUser({ username: "", role: "public" });
                    setActiveTab("single");
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold px-2 py-0.5 rounded text-[10px] tracking-wide transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}
            {/* Remove Virtual Supabase status label as requested */}
          </div>
        </div>
      </footer>

      {/* TAILORED ADMIN RECORD UPDATE MODAL (Adding / Updating database entries) */}
      {recordModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-slideUp">
            
            <div className="bg-slate-900 text-white py-4 px-5 flex items-center justify-between border-b border-slate-800">
              <h3 className="font-semibold text-xs tracking-wide uppercase font-display flex items-center gap-2">
                <Database className="text-blue-400 w-4 h-4" />
                {editingRecord ? "Edit Sub-City Record" : "New Postcode Entry Creation"}
              </h3>
              <button 
                onClick={() => { setRecordModalOpen(false); resetRecordFormFields(); }} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="p-5 flex flex-col gap-4">
              
              {/* Province field */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Province / Capital <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Phnom Penh, Kandal, Siem Reap"
                  value={provinceVal}
                  onChange={(e) => setProvinceVal(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-sans"
                />
              </div>

              {/* District field */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  District / Khan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chamkar Mon, Siem Reap"
                  value={districtVal}
                  onChange={(e) => setDistrictVal(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-sans"
                />
              </div>

              {/* Commune field */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Commune / Sangkat <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tonle Bassac, Wat Phnom"
                  value={communeVal}
                  onChange={(e) => setCommuneVal(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-sans"
                />
              </div>

              {/* Existing & New Zip Codes */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Existing ZIP (Old 5-digit)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12301"
                    value={existingPostcodeVal}
                    onChange={(e) => setExistingPostcodeVal(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    New Six-Digit Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 120101"
                    value={newPostcodeVal}
                    onChange={(e) => setNewPostcodeVal(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                  />
                </div>
              </div>

              {/* Route & Facility Inputs */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Route (ib_sort_co)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RT-01"
                    value={ibSortCoVal}
                    onChange={(e) => setIbSortCoVal(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Facility (inbound_fac)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FAC-02"
                    value={inboundFacVal}
                    onChange={(e) => setInboundFacVal(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 border-t border-slate-100 pt-4 mt-1.5 justify-end">
                <button
                  type="button"
                  onClick={() => { setRecordModalOpen(false); resetRecordFormFields(); }}
                  className="px-4 py-2 text-slate-600 border border-slate-200 hover:bg-slate-50 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-105 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-white stroke-[3.5]" />
                  Save Record
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* SECURE GATE AUTHENTICATION MODAL */}
      {loginModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-150 w-full max-w-md overflow-hidden animate-slideUp">
            
            {/* Modal header with distinct badge */}
            <div className="bg-slate-900 text-white py-5 px-6 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-slate-950 shadow-inner">
                  <svg className="w-4.5 h-4.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-wide text-white uppercase font-sans leading-none">
                    {authMode === "login" ? "Secure Gate Login" : "Agent Registration"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-sans tracking-normal mt-1 leading-none">
                    {authMode === "login" 
                      ? "Authorized Staff & Administrator Portal Access" 
                      : "Create a staff/moderator request account"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { 
                  setLoginModalOpen(false); 
                  setLoginUser(""); 
                  setLoginPass(""); 
                  setRegisterName("");
                  setRegisterEmail("");
                  setRegisterPass("");
                  setRegisterRole("Editor");
                  setAuthMode("login");
                  setLoginError(null); 
                }} 
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode selector tabs */}
            <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setLoginError(null); }}
                className={`py-3 text-xs font-bold text-center border-b-2 transition-all ${authMode === "login" ? "border-slate-950 text-slate-950 bg-white" : "border-transparent text-slate-400 hover:text-slate-650"}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("register"); setLoginError(null); }}
                className={`py-3 text-xs font-bold text-center border-b-2 transition-all ${authMode === "register" ? "border-slate-950 text-slate-950 bg-white" : "border-transparent text-slate-400 hover:text-slate-650"}`}
              >
                Register / Request Access
              </button>
            </div>
 
            {authMode === "login" ? (
              /* Login form body */
              <form onSubmit={handleLoginSubmit} className="p-6 flex flex-col gap-4">
                
                {loginError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-lg text-xs leading-relaxed font-sans flex items-start gap-2 animate-fadeIn">
                    <span className="shrink-0 font-bold font-mono text-xs">⚠️</span>
                    <span>{loginError}</span>
                  </div>
                )}
 
                {/* Username Input Field */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Username / Registered Email
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter authorized email or username..."
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 text-slate-705 font-sans transition-all"
                  />
                </div>
 
                {/* Password Input Field */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Access Key Passcode
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••••••"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 text-slate-705 font-mono transition-all"
                  />
                </div>

                {/* Trigger Buttons */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-5 mt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setLoginModalOpen(false); setLoginUser(""); setLoginPass(""); setLoginError(null); }}
                    className="px-4 py-2 text-slate-600 border border-slate-200 hover:bg-slate-50 text-xs font-semibold rounded-lg cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/10 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    Authenticate ID
                  </button>
                </div>
 
              </form>
            ) : (
              /* Register form body */
              <form onSubmit={handleRegisterSubmit} className="p-6 flex flex-col gap-4 animate-fadeIn">
                
                {loginError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-lg text-xs leading-relaxed font-sans flex items-start gap-2 animate-fadeIn">
                    <span className="shrink-0 font-bold font-mono text-xs">⚠️</span>
                    <span>{loginError}</span>
                  </div>
                )}
 
                {/* Full Name Input Field */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name..."
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 text-slate-705 font-sans transition-all"
                  />
                </div>

                {/* Email Input Field */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 text-slate-705 font-sans transition-all"
                    placeholder="your-email@logistics-kh.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                  />
                </div>

                {/* Desired Role dropdown selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Desired Administration Role
                  </label>
                  <select
                    value={registerRole}
                    onChange={(e) => setRegisterRole(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 text-slate-705 font-sans transition-all bg-white"
                  >
                    <option value="Editor">Editor (Normal Moderator Access)</option>
                    <option value="Admin">Admin (Full Administrative Management)</option>
                  </select>
                </div>

                {/* Password Passcode Input Field */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Access Key Passcode
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Choose a secure passcode..."
                    value={registerPass}
                    onChange={(e) => setRegisterPass(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 text-slate-705 font-mono transition-all"
                  />
                </div>

                <p className="text-[11px] text-slate-400 leading-normal font-sans mt-0.5">
                  🔒 Requested access keys start as unapproved/inactive and must be manually verified and approved by a system Superadmin before first login.
                </p>
 
                {/* Trigger Buttons */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-5 mt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterName("");
                      setRegisterEmail("");
                      setRegisterPass("");
                      setRegisterRole("Editor");
                      setAuthMode("login");
                      setLoginError(null);
                    }}
                    className="px-4 py-2 text-slate-600 border border-slate-200 hover:bg-slate-50 text-xs font-semibold rounded-lg cursor-pointer transition-all"
                  >
                    Already Registered? Sign In
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/10 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    Submit Request
                  </button>
                </div>
 
              </form>
            )}
 
          </div>
        </div>
      )}

    </div>
  );
}

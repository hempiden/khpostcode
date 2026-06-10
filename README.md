# 🇰🇭 Cambodia Postcode Migration & Integration System

A full-stack geographic parsing, postcode validation, and automated logistics routing intelligence interface engineered for **Cambodia Postcodes**.

This system integrates a high-performance **Local Offline State Cache (1,653 Cambodian Postal Records)** with secure, real-time gateways for **Supabase URL, Gemini AI, and Google Maps Platform**.

---

## 🧭 Architecture & Precedence Model

The application employs a **Failsafe Dual-Mode Architecture** designed to keep operations active under any network conditions:

1. **System Environment Variables**: Configured during initial deployment or via the settings menu.
2. **Interactive Control Console**: Administrators can live-edit, clear, customize, or disable any API configuration directly from the **Parameters Configuration Tab** in the user interface.

### Priority Resolution Model:
* **User Manual Overrides** (saved securely to `/src/data/api_config.json` via the web panel) take **absolute precedence** over environment-injected defaults. This enables developers to live-test separate databases, alternative microservices, and specialized AI keys inline.
* **Fallback to Environment Default**: If a parameter field is left empty or omitted from saved configurations, the server automatically reads and binds the respective system-injected environment variable safely.
* **Local Offline Fallback**: If no database credentials are found, or if network queries encounter an error, the engine seamlessly fails over to the local database container (1,653 verified geographical baseline records) so search and lookup engines never fail.

---

## 🎛️ Complete System Parameters

The following environment variables can be declared in the container or supplied directly in the UI admin module.

### 🌟 1. Core AI Engine (Google Gemini AI)
Used for fuzzy geographical corrections, bulk text structure normalization, and Sangkat/Khan mapping suggestions.
* `GEMINI_API_KEY`: Google Gemini API secret authorization key.

### 🗄️ 2. Secure Storage Ledger (Supabase Cloud)
Manages central storage and synchronization for postcode records directly.
* `SUPABASE_URL`: Fully qualified root HTTP gateway of your Supabase project (e.g. `https://xxx.supabase.co`).
* `SUPABASE_KEY`: Supabase private Service Role key or public anon JWT token keys.
* `SUPABASE_TABLE_NAME`: The active table where postcodes are maintained (defaults to `cambodia_postcode_migration`).

### 🗺️ 3. Google Maps Platform
Used for real-time map rendering, locate markers, and interactive postal territory visualization.
* `VITE_GOOGLE_MAPS_KEY`: Authorized browser API Key for Maps SDK, JavaScript API, and Places API (New).
* `VITE_GOOGLE_MAPS_ID`: Target Custom Map ID supporting vector tile configurations (e.g., `DEMO_MAP_ID`).

---

## ⚡ Quick-Start Verification

A built-it diagnostic route is exposed at the backend to instantly audit configuration health:
* **Database Connection Audit**: `/api/test-supabase` checks Supabase response headers and live row counts.
* **AI Cognitive Health**: `/api/test-gemini` tests network connection and Gemini AI API authorization.
* **Full Active Credentials**: `/api/get-config` serves currently resolved credentials, respecting user manual settings.

To safely reset your remote Supabase cloud record store back to the clean baseline of **1,653 Cambodian Postal Codes**, simply navigate to the admin section and trigger **"Push Local Cache to Cloud"** or call `/api/postcodes/reset` (which batches requests in blocks of 15 entries to prevent HTTP 413 Payload too large timeouts).

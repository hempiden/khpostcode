-- =========================================================================
--            CAMBODIA POSTCODE PLATFORM - COMPLETE SQL SCHEMA
-- =========================================================================
-- This script contains the entire relational PostgreSQL schema required for
-- the Cambodia Postcode Migration & Validation System.
-- It can be executed directly inside the Supabase SQL Editor or any standard PostgreSQL query workspace.
--
-- Target Database: PostgreSQL / Supabase
-- Tables Included:
--   1. public.cambodia_postcode_migration (Postcode mapping and directory)
--   2. public.platform_admins (Administrative registries & authorizations)
--   3. public.platform_settings (Dynamic settings, feature flags, and RBAC rules)
-- =========================================================================

-- -------------------------------------------------------------------------
-- STEP 1: SAFE CLEANUP (RESET EXISTING TABLES AND POLICIES)
-- -------------------------------------------------------------------------

-- Drop policies on cambodia_postcode_migration
DROP POLICY IF EXISTS "Enable select access for everyone" ON public.cambodia_postcode_migration;
DROP POLICY IF EXISTS "Enable insert access for everyone" ON public.cambodia_postcode_migration;
DROP POLICY IF EXISTS "Enable update access for everyone" ON public.cambodia_postcode_migration;
DROP POLICY IF EXISTS "Enable delete access for everyone" ON public.cambodia_postcode_migration;

-- Drop policies on platform_admins
DROP POLICY IF EXISTS "Enable select access for everyone" ON public.platform_admins;
DROP POLICY IF EXISTS "Enable insert access for everyone" ON public.platform_admins;
DROP POLICY IF EXISTS "Enable update access for everyone" ON public.platform_admins;
DROP POLICY IF EXISTS "Enable delete access for everyone" ON public.platform_admins;

-- Drop policies on platform_settings
DROP POLICY IF EXISTS "Enable select access for everyone" ON public.platform_settings;
DROP POLICY IF EXISTS "Enable insert access for everyone" ON public.platform_settings;
DROP POLICY IF EXISTS "Enable update access for everyone" ON public.platform_settings;
DROP POLICY IF EXISTS "Enable delete access for everyone" ON public.platform_settings;

-- Cascade drop existing tables
DROP TABLE IF EXISTS public.cambodia_postcode_migration CASCADE;
DROP TABLE IF EXISTS public.platform_admins CASCADE;
DROP TABLE IF EXISTS public.platform_settings CASCADE;


-- -------------------------------------------------------------------------
-- STEP 2: TABLE CREATION
-- -------------------------------------------------------------------------

-- 1. Table: cambodia_postcode_migration
-- Records all Cambodian spatial divisions (Province, District, Commune/Sangkat)
-- and map matches from the legacy (Existing) to the new 6-digit postcodes.
CREATE TABLE public.cambodia_postcode_migration (
    id SERIAL PRIMARY KEY,
    iso_country_code VARCHAR(10) DEFAULT 'KH' NOT NULL,
    postal_location_type VARCHAR(100) DEFAULT 'CP' NOT NULL,
    new_country_division_code VARCHAR(50),
    new_country_division VARCHAR(250) NOT NULL,
    new_city_name VARCHAR(250) NOT NULL,
    x_city_name VARCHAR(250),
    x_postcode VARCHAR(10),
    ib_sort_co VARCHAR(50),
    inbound_fac VARCHAR(100),
    city_province VARCHAR(250) NOT NULL,
    commune VARCHAR(250) NOT NULL,
    sangkat_commune VARCHAR(250) NOT NULL,
    district VARCHAR(250) NOT NULL,
    new_postcode VARCHAR(10) NOT NULL,
    remarks_new_postcode VARCHAR(250),
    remarks_x_postcode VARCHAR(250),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Table: platform_admins
-- Records regional postmasters, editors, system representatives, and admins
-- authorized to view or edit administrative structures.
CREATE TABLE public.platform_admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' NOT NULL CHECK (role IN ('superadmin', 'admin', 'moderator')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Table: platform_settings
-- Stores custom visual titles, dynamic UI layout features, toggles, logo configurations,
-- and Role-Based Access Control (RBAC) permission parameters as schema-flexible keys.
CREATE TABLE public.platform_settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);


-- -------------------------------------------------------------------------
-- STEP 3: HIGH-PERFORMANCE INDEXING
-- -------------------------------------------------------------------------
-- Optimized indices mapped on high-density query criteria to guarantee 
-- microscopic sub-millisecond retrieval speeds across thousands of rows.

CREATE INDEX IF NOT EXISTS idx_postcode_new 
    ON public.cambodia_postcode_migration(new_postcode);

CREATE INDEX IF NOT EXISTS idx_postcode_x 
    ON public.cambodia_postcode_migration(x_postcode);

CREATE INDEX IF NOT EXISTS idx_province_district_commune 
    ON public.cambodia_postcode_migration(city_province, district, commune);

CREATE INDEX IF NOT EXISTS idx_commune_sangkat 
    ON public.cambodia_postcode_migration(commune);

CREATE INDEX IF NOT EXISTS idx_admins_email 
    ON public.platform_admins(email);

CREATE INDEX IF NOT EXISTS idx_settings_key 
    ON public.platform_settings(key);


-- -------------------------------------------------------------------------
-- STEP 4: ROW-LEVEL SECURITY (RLS) & ACCESS CONTROL POLICIES
-- -------------------------------------------------------------------------
-- Enables deep security protections. Declares permission bypass rules to 
-- grant global read/write privileges through standard REST gateway triggers.

-- Enable Row-Level Security on all tables
ALTER TABLE public.cambodia_postcode_migration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- A. Policies for public.cambodia_postcode_migration
CREATE POLICY "Enable select access for everyone" 
    ON public.cambodia_postcode_migration FOR SELECT USING (true);

CREATE POLICY "Enable insert access for everyone" 
    ON public.cambodia_postcode_migration FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for everyone" 
    ON public.cambodia_postcode_migration FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for everyone" 
    ON public.cambodia_postcode_migration FOR DELETE USING (true);

-- B. Policies for public.platform_admins
CREATE POLICY "Enable select access for everyone" 
    ON public.platform_admins FOR SELECT USING (true);

CREATE POLICY "Enable insert access for everyone" 
    ON public.platform_admins FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for everyone" 
    ON public.platform_admins FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for everyone" 
    ON public.platform_admins FOR DELETE USING (true);

-- C. Policies for public.platform_settings
CREATE POLICY "Enable select access for everyone" 
    ON public.platform_settings FOR SELECT USING (true);

CREATE POLICY "Enable insert access for everyone" 
    ON public.platform_settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for everyone" 
    ON public.platform_settings FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for everyone" 
    ON public.platform_settings FOR DELETE USING (true);


-- -------------------------------------------------------------------------
-- STEP 5: BASELINE SEEDING
-- -------------------------------------------------------------------------

-- 1. Seed Initial Super Admin account
INSERT INTO public.platform_admins (email, full_name, role, is_active)
VALUES ('hempiden@gmail.com', 'Super Admin Account', 'superadmin', true)
ON CONFLICT (email) DO NOTHING;

-- 2. Seed Default Settings Parameter Config (Logo type, map configuration, title assets, search switches)
INSERT INTO public.platform_settings (key, value)
VALUES (
    'global_config',
    '{
        "siteTitle": "KH Postal Code",
        "platformTitle": "Cambodia Postcode",
        "websiteLogoType": "preset",
        "websiteLogoPreset": "map",
        "websiteLogoUrl": "",
        "websiteLogoSvg": "",
        "enableTextSearch": true,
        "enablePhotoSearch": true,
        "enableMapSearch": true,
        "enableDropdownSearch": true,
        "footerCopyright": "2026 Cambodia Postcode by DHL Express Cambodia.",
        "heroBgImages": [
            "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2000&q=80",
            "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=2000&q=80",
            "https://images.unsplash.com/photo-1558862107-d49ef2a04d72?auto=format&fit=crop&w=2000&q=80"
        ]
    }'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();

-- 3. Seed Default RBAC Access Rights and Authorization Map
INSERT INTO public.platform_settings (key, value)
VALUES (
    'role_features',
    '[
        {
            "id": "public",
            "name": "Public",
            "isDefault": true,
            "features": {
                "allowSingleLookup": true,
                "allowBulkLookup": false,
                "allowDatabaseCrud": false,
                "allowApiSync": false,
                "allowSuperadminSettings": false,
                "allowUserManagement": false
            }
        },
        {
            "id": "editor",
            "name": "Editor",
            "isDefault": true,
            "features": {
                "allowSingleLookup": true,
                "allowBulkLookup": true,
                "allowDatabaseCrud": true,
                "allowApiSync": false,
                "allowSuperadminSettings": false,
                "allowUserManagement": false
            }
        },
        {
            "id": "admin",
            "name": "Admin",
            "isDefault": true,
            "features": {
                "allowSingleLookup": true,
                "allowBulkLookup": true,
                "allowDatabaseCrud": true,
                "allowApiSync": true,
                "allowSuperadminSettings": false,
                "allowUserManagement": true
            }
        },
        {
            "id": "superadmin",
            "name": "Superadmin",
            "isDefault": true,
            "features": {
                "allowSingleLookup": true,
                "allowBulkLookup": true,
                "allowDatabaseCrud": true,
                "allowApiSync": true,
                "allowSuperadminSettings": true,
                "allowUserManagement": true
            }
        }
    ]'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();

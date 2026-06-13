-- =========================================================================
--            CAMBODIA POSTCODE PLATFORM - SEARCH HISTORY & CACHE SCHEMA
-- =========================================================================
-- This script contains the search history and dynamic caching schema.
-- It tracks client queries, normalized results, confidence scores,
-- and thumbs-up/down ratings to automatically adapt the matching benchmark.
--
-- INSTRUCTIONS:
-- 1. Copy the entire contents of this file.
-- 2. Open your Supabase Dashboard -> SQL Editor.
-- 3. Create a New Query, paste this script, and click "Run".
-- =========================================================================

-- Step 1: Create the Postcode Search History & Cache table FIRST (so relations exist definitionally)
CREATE TABLE IF NOT EXISTS public.postcode_search_history (
    id VARCHAR(100) PRIMARY KEY,
    query TEXT NOT NULL,
    original_query TEXT NOT NULL,
    datetime TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    result JSONB NOT NULL,
    score INTEGER DEFAULT 0 NOT NULL,
    rating VARCHAR(10) DEFAULT NULL CHECK (rating IN ('up', 'down', NULL)),
    benchmark_used INTEGER DEFAULT 12 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 2: Safely drop and recreate policies now that the table is guaranteed to exist
DROP POLICY IF EXISTS "Enable select access for everyone" ON public.postcode_search_history;
DROP POLICY IF EXISTS "Enable insert access for everyone" ON public.postcode_search_history;
DROP POLICY IF EXISTS "Enable update access for everyone" ON public.postcode_search_history;
DROP POLICY IF EXISTS "Enable delete access for everyone" ON public.postcode_search_history;

-- Step 3: Create high-performance index on query strings for millisecond-level cache hits
CREATE INDEX IF NOT EXISTS idx_search_history_query ON public.postcode_search_history(query);

-- Step 4: Enable Row-Level Security (RLS) to manage secure table CRUD actions
ALTER TABLE public.postcode_search_history ENABLE ROW LEVEL SECURITY;

-- Step 5: Establish Permissive Policies to let the application read, log, and rate queries
CREATE POLICY "Enable select access for everyone" 
    ON public.postcode_search_history FOR SELECT USING (true);

CREATE POLICY "Enable insert access for everyone" 
    ON public.postcode_search_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for everyone" 
    ON public.postcode_search_history FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for everyone" 
    ON public.postcode_search_history FOR DELETE USING (true);

-- Step 6: Grant read/write permissions to anonymous and authenticated API roles
GRANT ALL ON public.postcode_search_history TO anon;
GRANT ALL ON public.postcode_search_history TO authenticated;
GRANT ALL ON public.postcode_search_history TO service_role;

-- =========================================================================
-- SUCCESS: Your cache logging table is ready!
-- The system will now automatically save Gemini query tokens by checking this cache.
-- =========================================================================

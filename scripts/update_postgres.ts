import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

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

async function runUpdate() {
  console.log("==================================================");
  console.log("   CAMBODIA POSTCODE postgres/supabase MIGRATOR   ");
  console.log("==================================================");

  const dataFilePath = path.join(process.cwd(), "src", "data", "cambodia_postcodes.json");
  const backupFilePath = path.join(process.cwd(), "src", "data", "cambodia_postcodes_backup.json");
  const configFilePath = path.join(process.cwd(), "src", "data", "api_config.json");

  // Step 1: Copy backup file to active data file to sync local storage
  try {
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file not found at: ${backupFilePath}`);
    }
    console.log(`[Local Sync] Copying ${backupFilePath} \n             to ${dataFilePath}...`);
    fs.copyFileSync(backupFilePath, dataFilePath);
    console.log("[Local Sync] Local database files successfully synchronized!\n");
  } catch (err: any) {
    console.error(`[Local Sync Error] Failed to update local data file: ${err.message}`);
    process.exit(1);
  }

  // Step 2: Read configurations
  let supabaseUrl = "";
  let supabaseKey = "";
  let supabaseTableName = "cambodia_postcode_migration";

  try {
    if (fs.existsSync(configFilePath)) {
      const config = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
      supabaseUrl = config.supabaseUrl || "";
      supabaseKey = config.supabaseKey || "";
      supabaseTableName = config.supabaseTableName || "cambodia_postcode_migration";
    }
  } catch (err: any) {
    console.warn(`[Config Notice] Failed to read api_config.json: ${err.message}. Fetching from environment variables...`);
  }

  // Bind environment variables as overrides
  supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || supabaseUrl;
  supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || supabaseKey;
  supabaseTableName = process.env.SUPABASE_TABLE_NAME || process.env.VITE_SUPABASE_TABLE_NAME || supabaseTableName;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Database Connection Error] Supabase URL or Key is missing. Please configure them in .env or src/data/api_config.json");
    process.exit(1);
  }

  // Sanitize URL/Key
  supabaseUrl = supabaseUrl.trim().replace(/\/+$/, "");
  supabaseKey = supabaseKey.trim().replace(/^['"]|['"]$/g, "");

  console.log(`[Database Connected] Target URL: ${supabaseUrl}`);
  console.log(`[Database Connected] Target Table: ${supabaseTableName}`);

  // Step 3: Load postcode entries to upload
  let localEntries: PostcodeEntry[] = [];
  try {
    const rawContent = fs.readFileSync(dataFilePath, "utf-8");
    localEntries = JSON.parse(rawContent);
    if (!Array.isArray(localEntries)) {
      throw new Error("Parsed JSON content is not an array");
    }
  } catch (err: any) {
    console.error(`[Loader Error] Failed to parse active database file: ${err.message}`);
    process.exit(1);
  }

  const recordCount = localEntries.length;
  console.log(`[Payload Ready] Loaded ${recordCount} polished records from local database.\n`);

  // Step 4: Clear existing entries in Supabase
  console.log("[Wipe & Sync Step 1] Clearing previous rows in Supabase database table safely...");
  try {
    const deleteUrl = `${supabaseUrl}/rest/v1/${supabaseTableName}?id=gt.0`;
    const deleteRes = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    if (deleteRes.ok) {
      console.log("[Wipe & Sync Step 1] Previous database entries cleared successfully!\n");
    } else {
      const text = await deleteRes.text();
      console.warn(`[Wipe & Sync Warning] Cleared action returned status ${deleteRes.status}: ${text}. Attempting to proceed with inserts...`);
    }
  } catch (err: any) {
    console.warn(`[Wipe & Sync Notice] Delete call encountered an error: ${err.message}. Proceeding to inserts...`);
  }

  // Step 5: Format and batch insert to Supabase
  console.log("[Wipe & Sync Step 2] Formulating payloads and beginning batch upload...");

  const supabasePayloads = localEntries.map((item, index) => {
    // Clean old postcode & new postcode fields of any potential quotes or whitespace
    const existingClean = String(item.existing_postcode || "").replace(/['"]/g, "").trim();
    const newClean = String(item.new_postcode || "").replace(/['"]/g, "").trim();

    return {
      id: index + 1, // Let's explicitly write numeric sequence id to keep stable sort
      iso_country_code: "KH",
      postal_location_type: "CP",
      city_province: (item.province || "").trim(),
      new_country_division: (item.province || "").trim(),
      district: (item.district || "").trim(),
      commune: (item.commune || "").trim(),
      sangkat_commune: (item.commune || "").trim(),
      new_city_name: (item.new_city_name || item.commune || "").trim(),
      x_postcode: existingClean === "null" ? "" : existingClean,
      new_postcode: newClean,
      ib_sort_co: (item.ib_sort_co || "").trim(),
      inbound_fac: (item.inbound_fac || "").trim()
    };
  });

  const batchSize = 40;
  const totalBatches = Math.ceil(supabasePayloads.length / batchSize);
  let successfullyInserted = 0;

  for (let i = 0; i < supabasePayloads.length; i += batchSize) {
    const batch = supabasePayloads.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize) + 1;

    try {
      const insertUrl = `${supabaseUrl}/rest/v1/${supabaseTableName}`;
      const insertRes = await fetch(insertUrl, {
        method: "POST",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(batch)
      });

      if (insertRes.ok) {
        successfullyInserted += batch.length;
        process.stdout.write(`\r[Progress] Batch ${batchIndex}/${totalBatches} completed successfully. Synced: ${successfullyInserted}/${recordCount}`);
      } else {
        const errorText = await insertRes.text();
        console.error(`\n[Batch Error] Batch ${batchIndex} insertion failed! Status: ${insertRes.status}`);
        console.error(`Details: ${errorText}`);
        console.log("Interrupting migration to prevent partial sync...");
        process.exit(1);
      }
    } catch (err: any) {
      console.error(`\n[Execution Error] Batch ${batchIndex} connection error: ${err.message}`);
      process.exit(1);
    }
  }

  console.log("\n\n==================================================");
  console.log("✔️ SUCCESS: PostgreSQL/Supabase database updated!");
  console.log(`✔️ Total synchronized records: ${successfullyInserted}/${recordCount}`);
  console.log("==================================================");
}

runUpdate().catch((error) => {
  console.error("\nUnhandled migration exception:", error);
  process.exit(1);
});

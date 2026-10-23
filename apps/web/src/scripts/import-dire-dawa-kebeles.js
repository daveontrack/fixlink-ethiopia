// Import the verified urban kebeles of Dire Dawa into public.sub_cities.
//
// Source: OCHA Common Operational Dataset — Ethiopia administrative
// boundaries (COD-AB, CC BY-IGO), published through
// https://openadmindata.org/et/ (zone "Dire Dawa urban", p-codes
// ET1501xx). The script reads the dataset at run time and refuses to import
// anything it cannot match to the expected p-codes.
//
// The write is INSERT-IF-MISSING only: an existing code or name is never
// updated, renamed or deleted, so saved job_requests and professionals keep
// their location.
//
// Run from the repository root:
//   node apps/web/src/scripts/import-dire-dawa-kebeles.js
//   node apps/web/src/scripts/import-dire-dawa-kebeles.js --dry-run
//
// The `is_active`, `source` and `source_code` columns must exist
// (migration 20261023000100_sub_city_verified_kebeles.sql).

const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../../../../.env") });
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const SOURCE_URL = "https://openadmindata.org/api/v1/countries/et.json";
const SOURCE_NAME = "OCHA COD-AB ET via openadmindata.org";
const DIRE_DAWA_REGION_ID = "ET15";
const URBAN_ZONE_NAME = "Dire Dawa urban";

// The nine urban kebeles of the city, by official p-code. The name is only
// used to detect source drift: the values that are written come from the
// dataset itself.
const EXPECTED = [
  { sourceCode: "ET150103", code: "sabian", name: "Sabian" },
  { sourceCode: "ET150104", code: "malka_jabti", name: "Malka Jabti /M.Jebdu" },
  { sourceCode: "ET150105", code: "legehare", name: "Legehare" },
  { sourceCode: "ET150109", code: "addis_ketema_dd", name: "Addis Ketema (DD)" },
  { sourceCode: "ET150110", code: "gende_kore", name: "Gende Kore" },
  { sourceCode: "ET150111", code: "dechatu", name: "Dechatu" },
  { sourceCode: "ET150112", code: "hafat_issa", name: "Hafat Issa" },
  { sourceCode: "ET150113", code: "kazira", name: "Kazira" },
  { sourceCode: "ET150114", code: "police_maret", name: "Police Maret" },
];

// A coarse bounding box around Dire Dawa city, used as a sanity check on the
// coordinates of the source. It rejects a record placed in a neighbouring
// region by mistake.
const BBOX = { minLat: 9.4, maxLat: 9.8, minLon: 41.6, maxLon: 42.4 };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. See apps/web/.env.example.",
  );
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fetchSource() {
  const response = await fetch(SOURCE_URL, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`source returned HTTP ${response.status}`);
  }

  const body = await response.json();
  const data = body && body.data;

  if (!data || !data.zone || !data.woreda) {
    throw new Error("source payload does not contain zones and woredas");
  }

  const region = Object.values(data.region ?? {}).find(
    (item) => item.id === DIRE_DAWA_REGION_ID,
  );
  const urbanZone = Object.values(data.zone).find(
    (item) =>
      item.parent_id === DIRE_DAWA_REGION_ID &&
      item.name_en === URBAN_ZONE_NAME,
  );

  if (!region || !urbanZone) {
    throw new Error(
      `source does not list the "${URBAN_ZONE_NAME}" zone under Dire Dawa`,
    );
  }

  const urbanWoredas = Object.values(data.woreda).filter(
    (item) => item.parent_id === urbanZone.id,
  );

  return { urbanZone, urbanWoredas };
}

function mapRecords(urbanWoredas) {
  const byCode = new Map(urbanWoredas.map((item) => [item.id, item]));
  const missing = EXPECTED.filter((item) => !byCode.has(item.sourceCode));

  if (missing.length > 0) {
    throw new Error(
      `source no longer lists these urban kebeles: ${missing
        .map((item) => `${item.sourceCode} (${item.name})`)
        .join(", ")}`,
    );
  }

  return EXPECTED.map((expected) => {
    const record = byCode.get(expected.sourceCode);

    if (record.name_en !== expected.name) {
      console.warn(
        `! ${expected.sourceCode}: source name is "${record.name_en}", expected "${expected.name}" — importing the source name.`,
      );
    }

    if (
      typeof record.lat !== "number" ||
      typeof record.lon !== "number" ||
      record.lat < BBOX.minLat ||
      record.lat > BBOX.maxLat ||
      record.lon < BBOX.minLon ||
      record.lon > BBOX.maxLon
    ) {
      throw new Error(
        `${expected.sourceCode} (${record.name_en}) lies outside Dire Dawa: ${record.lat}, ${record.lon}`,
      );
    }

    return {
      code: expected.code,
      name: record.name_en,
      name_am: null,
      name_om: null,
      longitude: record.lon,
      latitude: record.lat,
      sort_order: (EXPECTED.indexOf(expected) + 1) * 10,
      is_active: true,
      source: `${SOURCE_NAME} (retrieved ${new Date().toISOString().slice(0, 10)})`,
      source_code: record.id,
    };
  });
}

function toGeographyPoint(longitude, latitude) {
  return `SRID=4326;POINT(${longitude} ${latitude})`;
}

async function main() {
  console.log("=== Import: verified Dire Dawa urban kebeles ===\n");

  const { urbanZone, urbanWoredas } = await fetchSource();
  console.log(
    `Source: ${SOURCE_NAME} — zone ${urbanZone.id} (${urbanZone.name_en}), ${urbanWoredas.length} woredas`,
  );

  const records = mapRecords(urbanWoredas);
  console.log(`Verified urban kebeles in the source: ${records.length}\n`);

  // Fail early, and clearly, when the schema has not been migrated yet.
  const { error: schemaError } = await supabase
    .from("sub_cities")
    .select("code, is_active, source, source_code")
    .limit(1);

  if (schemaError) {
    throw new Error(
      `sub_cities is not ready (${schemaError.message}). Apply migration 20261023000100_sub_city_verified_kebeles.sql first.`,
    );
  }

  const inserted = [];
  const reused = [];
  const skipped = [];

  for (const record of records) {
    const { data: existing, error: existingError } = await supabase
      .from("sub_cities")
      .select("code, name, is_active, source_code")
      .eq("code", record.code)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);

    if (existing) {
      reused.push({ ...record, existing });
      console.log(
        `= ${record.code}: already exists ("${existing.name}"), left untouched`,
      );
      continue;
    }

    // `name` is unique: never take a name that another code already owns.
    const { data: sameName, error: nameError } = await supabase
      .from("sub_cities")
      .select("code, name")
      .eq("name", record.name)
      .maybeSingle();

    if (nameError) throw new Error(nameError.message);

    if (sameName) {
      skipped.push({ ...record, conflict: sameName.code });
      console.warn(
        `! ${record.code}: the name "${record.name}" belongs to "${sameName.code}" — skipped`,
      );
      continue;
    }

    if (dryRun) {
      inserted.push(record);
      console.log(`+ ${record.code}: would insert "${record.name}"`);
      continue;
    }

    const { error: insertError } = await supabase.from("sub_cities").insert({
      code: record.code,
      name: record.name,
      name_am: record.name_am,
      name_om: record.name_om,
      location: toGeographyPoint(record.longitude, record.latitude),
      sort_order: record.sort_order,
      is_active: record.is_active,
      source: record.source,
      source_code: record.source_code,
    });

    if (insertError) {
      throw new Error(`${record.code}: ${insertError.message}`);
    }

    inserted.push(record);
    console.log(`+ ${record.code}: inserted "${record.name}"`);
  }

  console.log("\n=== Summary ===");
  console.log(`Inserted: ${inserted.length}`);
  console.log(`Existing records reused: ${reused.length}`);
  console.log(`Skipped (name conflict): ${skipped.length}`);
  if (dryRun) console.log("Dry run: nothing was written.");

  if (inserted.length > 0) {
    console.log("\nImported locations:");
    console.table(
      inserted.map((row) => ({
        code: row.code,
        name: row.name,
        official_code: row.source_code,
        level: "urban kebele (COD-AB woreda)",
        source: SOURCE_NAME,
      })),
    );
  }
}

main().catch((error) => {
  console.error("\nImport failed:", error.message);
  process.exit(1);
});

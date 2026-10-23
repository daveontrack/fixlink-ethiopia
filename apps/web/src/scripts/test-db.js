require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function check() {
  console.log("=== Checking Database Tables ===\n");
  
  // Check service_categories
  console.log("1. service_categories:");
  const { data: cats, error: catError } = await supabase.from("service_categories").select("*").limit(10);
  if (catError) console.log("   Error:", catError.message);
  else console.log("   Data:", cats?.length, "rows:", cats?.slice(0, 3));
  
  // Check sub_cities
  console.log("\n2. sub_cities:");
  const { data: cities, error: cityError } = await supabase.from("sub_cities").select("*").limit(10);
  if (cityError) console.log("   Error:", cityError.message);
  else console.log("   Data:", cities?.length, "rows:", cities?.slice(0, 3));
  
  // Check professional_locations
  console.log("\n3. professional_locations:");
  const { data: profs, error: profError } = await supabase.from("professional_locations").select("*").limit(10);
  if (profError) console.log("   Error:", profError.message);
  else console.log("   Data:", profs?.length, "rows:", profs?.slice(0, 3));
  
  // Check bookings
  console.log("\n4. bookings:");
  const { data: bookings, error: bookError } = await supabase.from("bookings").select("*").limit(10);
  if (bookError) console.log("   Error:", bookError.message);
  else console.log("   Data:", bookings?.length, "rows:", bookings?.slice(0, 3));
  
  // Check quotations
  console.log("\n5. quotations:");
  const { data: quotes, error: quoteError } = await supabase.from("quotations").select("*").limit(10);
  if (quoteError) console.log("   Error:", quoteError.message);
  else console.log("   Data:", quotes?.length, "rows:", quotes?.slice(0, 3));
  
  // Check profiles
  console.log("\n6. profiles:");
  const { data: profs2, error: prof2Error } = await supabase.from("profiles").select("*").limit(10);
  if (prof2Error) console.log("   Error:", prof2Error.message);
  else console.log("   Data:", profs2?.length, "rows:", profs2?.slice(0, 3));
}

check().catch(console.error);
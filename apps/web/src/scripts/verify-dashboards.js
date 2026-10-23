const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log("=== Verifying Dashboard Queries ===\n");

  // 1. Customer Dashboard Queries
  console.log("1. Customer Dashboard:");
  const { data: customers, error: cError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("role", "customer")
    .limit(1);

  if (cError) {
    console.log("   ❌ Customer query error:", cError.message);
    process.exit(1);
  }
  if (!customers || customers.length === 0) {
    console.log("   ❌ No customers found in database");
    process.exit(1);
  }

  const customerId = customers[0].id;
  console.log("   ✅ Customer ID:", customerId);

  const { data: requests, error: rError } = await supabase
    .from("job_requests")
    .select("*")
    .eq("customer_id", customerId)
    .limit(5);

  if (rError) {
    console.log("   ❌ Customer requests query error:", rError.message);
    process.exit(1);
  }
  console.log("   ✅ Customer requests:", requests ? requests.length + " rows" : "0 rows");

  const { data: bookings, error: bError } = await supabase
    .from("bookings")
    .select("*")
    .eq("customer_id", customerId)
    .limit(5);

  if (bError) {
    console.log("   ❌ Customer bookings query error:", bError.message);
    process.exit(1);
  }
  console.log("   ✅ Customer bookings:", bookings ? bookings.length + " rows" : "0 rows");

  // 2. Professional Dashboard Queries
  console.log("\n2. Professional Dashboard:");
  const { data: professionals, error: pError } = await supabase
    .from("professional_locations")
    .select("professional_id")
    .limit(1);

  if (pError) {
    console.log("   ❌ Professional query error:", pError.message);
    process.exit(1);
  }
  if (!professionals || professionals.length === 0) {
    console.log("   ❌ No professionals found in database");
    process.exit(1);
  }

  const profId = professionals[0].professional_id;
  console.log("   ✅ Professional ID:", profId);

  const { data: quotes, error: qError } = await supabase
    .from("quotations")
    .select("*")
    .eq("professional_id", profId)
    .limit(5);

  if (qError) {
    console.log("   ❌ Professional quotations query error:", qError.message);
    process.exit(1);
  }
  console.log("   ✅ Professional quotations:", quotes ? quotes.length + " rows" : "0 rows");

  const { data: pBookings, error: pbError } = await supabase
    .from("bookings")
    .select("*")
    .eq("professional_id", profId)
    .limit(5);

  if (pbError) {
    console.log("   ❌ Professional bookings query error:", pbError.message);
    process.exit(1);
  }
  console.log("   ✅ Professional bookings:", pBookings ? pBookings.length + " rows" : "0 rows");

  // 3. Admin Dashboard Queries
  console.log("\n3. Admin Dashboard:");
  const { data: allProfiles, error: paError } = await supabase
    .from("profiles")
    .select("role")
    .limit(100);

  if (paError) {
    console.log("   ❌ Admin profiles query error:", paError.message);
    process.exit(1);
  }

  const customersCount = (allProfiles ?? []).filter((p) => p.role === "customer").length;
  const professionalsCount = (allProfiles ?? []).filter((p) => p.role === "professional").length;
  console.log("   ✅ Total profiles:", allProfiles?.length);
  console.log("   ✅ Customers count:", customersCount);
  console.log("   ✅ Professionals count:", professionalsCount);

  const { data: allBookings, error: baError } = await supabase
    .from("bookings")
    .select("status")
    .limit(100);

  if (baError) {
    console.log("   ❌ Admin bookings query error:", baError.message);
    process.exit(1);
  }

  const bookedCount = (allBookings ?? []).filter((b) => b.status === "booked").length;
  const completedCount = (allBookings ?? []).filter((b) => b.status === "completed").length;
  console.log("   ✅ Sampled bookings:", allBookings?.length);
  console.log("   ✅ Booked status:", bookedCount);
  console.log("   ✅ Completed status:", completedCount);

  // 4. Service categories
  console.log("\n4. Service Categories:");
  const { data: cats, error: catError } = await supabase.from("service_categories").select("*");

  if (catError) {
    console.log("   ❌ Service categories query error:", catError.message);
    process.exit(1);
  }
  console.log("   ✅ Service categories:", cats?.length + " rows");
  if (cats && cats.length > 0) {
    console.log("   -", cats.slice(0, 3).map((c) => c.name + " (" + c.slug + ")").join(", "));
  }

  console.log("\n=== All Dashboard Queries Verified ===");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
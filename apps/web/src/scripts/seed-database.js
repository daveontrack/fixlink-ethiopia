require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log("=== Starting FixLink Ethiopia Database Seed ===\n");

  // Step 1: Check existing data
  console.log("1. Checking existing data...");

  const existingCatsRes = await supabase.from("service_categories").select("slug").limit(10);
  const existingCats = existingCatsRes.data;
  console.log("   Existing categories:", existingCats ? existingCats.map(c => c.slug).join(", ") : "none");

  const existingCitiesRes = await supabase.from("sub_cities").select("code, name").limit(10);
  const existingCities = existingCitiesRes.data;
  console.log("   Existing sub-cities:", existingCities ? existingCities.map(c => c.code + " (" + c.name + ")").join(", ") : "none");

  const existingProfsRes = await supabase.from("professional_locations").select("full_name, verification_status").limit(10);
  const existingProfs = existingProfsRes.data;
  console.log("   Existing professionals:", existingProfs ? existingProfs.map(p => p.full_name + " (" + p.verification_status + ")").join(", ") : "none");

  // Step 2: Ensure service categories exist
  console.log("\n2. Ensuring service categories exist...");

  const requiredCategories = [
    { slug: "plumbing", name: "Plumbing", description: "Leaking pipes, blocked drains, taps and toilet repairs", iconKey: "pipe" },
    { slug: "electrical-repair", name: "Electrical repair", description: "Sockets, lights, breakers and wiring problems", iconKey: "bolt" },
    { slug: "appliance-repair", name: "Appliance repair", description: "Stoves, fridges, washing machines and small appliances", iconKey: "wrench" },
    { slug: "computer-it", name: "Computer and IT Support", description: "Hardware and software support", iconKey: "monitor" },
  ];

  for (const cat of requiredCategories) {
    const alreadyExists = (existingCats ?? []).some(c => c.slug === cat.slug);
    if (alreadyExists) {
      console.log("   Category already exists:", cat.slug);
      continue;
    }

    const result = await supabase.from("service_categories").insert({
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      name_am: null,
      name_om: null,
      icon_key: cat.iconKey,
      is_active: true,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (result.error) console.error("   Failed to insert category", cat.slug, ":", result.error.message);
    else console.log("   Inserted category:", cat.slug);
  }

  // Step 3: Ensure sub-cities exist
  console.log("\n3. Ensuring sub-cities exist...");

  const subCities = [
    { code: "bole", name: "Bole", name_am: null, name_om: null, sort_order: 30 },
    { code: "kebele-05", name: "Kebele 05", name_am: null, name_om: null, sort_order: 20 },
    { code: "hidar-tabia", name: "Hidar Tabia", name_am: null, name_om: null, sort_order: 10 },
    { code: "kebele-13", name: "Kebele 13", name_am: null, name_om: null, sort_order: 40 },
    { code: "chalenso", name: "Chalenso", name_am: null, name_om: null, sort_order: 50 },
    { code: "legetafo", name: "Legetafo", name_am: null, name_om: null, sort_order: 60 },
  ];

  for (const sc of subCities) {
    const alreadyExists = (existingCities ?? []).some(c => c.code === sc.code);
    if (alreadyExists) {
      console.log("   Sub-city already exists:", sc.code);
      continue;
    }

    const result = await supabase.from("sub_cities").insert({
      code: sc.code,
      name: sc.name,
      name_am: sc.name_am,
      name_om: sc.name_om,
      location: null,
      sort_order: sc.sort_order,
      created_at: new Date().toISOString(),
    });

    if (result.error) console.error("   Failed to insert sub-city", sc.code, ":", result.error.message);
    else console.log("   Inserted sub-city:", sc.code);
  }

  // Step 4: Insert professionals
  console.log("\n4. Inserting professionals...");

  const professionals = [
    {
      fullName: "Mekdes Worku",
      email: "mekdes.worku@example.com",
      verificationStatus: "approved",
      acceptsRequests: true,
      city: "Dire Dawa",
      subCity: "bole",
      bio: "Experienced plumber with over 8 years of fixing residential and commercial plumbing issues.",
      yearsExperience: 8,
      hourlyRate: 150,
      categorySlug: "plumbing",
    },
    {
      fullName: "Assefa Kebede",
      email: "assefa.kebede@example.com",
      verificationStatus: "approved",
      acceptsRequests: true,
      city: "Dire Dawa",
      subCity: "kebele-05",
      bio: "Certified electrician with 6 years of experience in residential wiring and solar panel installation.",
      yearsExperience: 6,
      hourlyRate: 200,
      categorySlug: "electrical-repair",
    },
    {
      fullName: "Selamawit Tadesse",
      email: "selamawit.tadesse@example.com",
      verificationStatus: "pending",
      acceptsRequests: false,
      city: "Dire Dawa",
      subCity: "hidar-tabia",
      bio: "Appliance repair specialist with 4 years of experience diagnosing and fixing home appliances.",
      yearsExperience: 4,
      hourlyRate: 180,
      categorySlug: "appliance-repair",
    },
    {
      fullName: "Abebaw Solomon",
      email: "abebaw.solomon@example.com",
      verificationStatus: "approved",
      acceptsRequests: true,
      city: "Dire Dawa",
      subCity: "chalenso",
      bio: "Computer and IT support technician with 10 years of experience in network setup and system optimization.",
      yearsExperience: 10,
      hourlyRate: 250,
      categorySlug: "computer-it",
    },
  ];

  for (const prof of professionals) {
    const catResult = await supabase.from("service_categories").select("id").eq("slug", prof.categorySlug).single();
    const catId = catResult.data.id;

    // Check if professional already exists by full_name
    const existingProfRes = await supabase.from("professional_locations").select("professional_id").eq("full_name", prof.fullName).single();
    const alreadyExists = existingProfRes.data;

    if (alreadyExists) {
      console.log("   Professional already exists:", prof.fullName);
      continue;
    }

    const result = await supabase.from("professional_locations").insert({
      professional_id: prof.fullName.replace(/\s+/g, "_").toLowerCase() + "-" + Date.now(),
      profile_id: "prof-" + Date.now(),
      full_name: prof.fullName,
      avatar_url: null,
      base_area_name: prof.city,
      sub_city_code: prof.subCity,
      verification_status: prof.verificationStatus,
      accepts_requests: prof.acceptsRequests,
      service_radius_km: 25,
      years_of_experience: prof.yearsExperience,
      average_rating: 4.5,
      total_reviews: 0,
      completed_jobs: 0,
      latitude: 9.6,
      longitude: 41.85,
      categories: [{ category_id: catId }],
    });

    if (result.error) console.error("   Failed to insert professional", prof.fullName, ":", result.error.message);
    else console.log("   Inserted professional:", prof.fullName + " (" + prof.verificationStatus + ")");
  }

  // Step 5: Create service requests via RPC create_job_request
  console.log("\n5. Creating service requests...");

  const requests = [
    {
      customerEmail: "customer1@example.com",
      title: "Leaky faucet in kitchen",
      description: "The kitchen faucet is dripping constantly. Need someone to replace the washer and fix the leak.",
      priority: "normal",
      categorySlug: "plumbing",
      subCityCode: "bole",
    },
    {
      customerEmail: "customer2@example.com",
      title: "Power outlet not working",
      description: "The bedroom power outlet has no electricity. Need an electrician to inspect and replace if necessary.",
      priority: "urgent",
      categorySlug: "electrical-repair",
      subCityCode: "kebele-05",
    },
    {
      customerEmail: "customer3@example.com",
      title: "Washing machine not draining",
      description: "The washing machine completes the wash cycle but won't drain. Water remains in the drum after the cycle ends.",
      priority: "normal",
      categorySlug: "appliance-repair",
      subCityCode: "hidar-tabia",
    },
  ];

  for (const req of requests) {
    const catResult = await supabase.from("service_categories").select("id").eq("slug", req.categorySlug).single();
    const catId = catResult.data.id;

    const result = await supabase.rpc("create_job_request", {
      p_category_id: catId,
      p_title: req.title,
      p_description: req.description,
      p_sub_city_code: req.subCityCode,
      p_priority: req.priority,
    });

    if (result.error) console.error("   Failed to create request", req.title, ":", result.error.message);
    else console.log("   Created request:", req.title);
  }

  // Step 6: Create quotations and bookings
  console.log("\n6. Creating quotations and bookings...");

  const approvedProfsRes = await supabase.from("professional_locations").select("professional_id").eq("verification_status", "approved").limit(2);
  const approvedProfs = approvedProfsRes.data;
  const laborCost = 1500;
  const materialsCost = 500;

  if (approvedProfs && approvedProfs.length > 0) {
    for (const req of requests) {
      const prof = approvedProfs[0];

      const jobId = "req-seed-" + Date.now();

      // Insert quotation
      const quoteResult = await supabase.from("quotations").insert({
        job_id: jobId,
        professional_id: prof.professional_id,
        labor_cost_etb: laborCost,
        materials_cost_etb: materialsCost,
        notes: "Quotation for: " + req.title,
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: "submitted",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (quoteResult.error) console.error("   Failed to create quotation for", req.title, ":", quoteResult.error.message);
      else console.log("   Created quotation for", req.title);

      // Insert booking
      const bookingId = "bk-seed-" + Date.now();
      const bookingResult = await supabase.from("bookings").insert({
        id: bookingId,
        job_id: jobId,
        quotation_id: "q-" + Date.now(),
        customer_id: "cust-seed-" + Date.now(),
        professional_id: prof.professional_id,
        scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "booked",
        accepted_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        cancelled_at: null,
        cancellation_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (bookingResult.error) console.error("   Failed to create booking for", req.title, ":", bookingResult.error.message);
      else console.log("   Created booking for", req.title);
    }
  }

  // Step 7: Create notifications
  console.log("\n7. Creating notifications...");

  const notifResult = await supabase.from("notifications").insert({
    user_id: "prof-" + Date.now(),
    type: "new_quotation",
    title: "New quotation received",
    body: "You have received a new quotation for your service request.",
    is_read: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (notifResult.error) console.error("   Failed to create notification:", notifResult.error.message);
  else console.log("   Created notification");

  // Step 8: Create conversation and message
  console.log("\n8. Creating conversation and message...");

  const convResult = await supabase.from("conversations").insert({
    request_id: null,
    booking_id: "bk-seed-" + Date.now(),
    customer_id: "cust-seed-" + Date.now(),
    professional_id: "prof-" + Date.now(),
  });

  if (convResult && !convResult.error) {
    console.log("   Created conversation", convResult.data.id);

    const msgResult = await supabase.from("messages").insert({
      conversation_id: convResult.data.id,
      sender_id: "prof-" + Date.now(),
      body: "Hello! I've reviewed your request and would like to submit a quotation.",
      is_read: false,
      created_at: new Date().toISOString(),
    });

    if (msgResult.error) console.error("   Failed to create message:", msgResult.error.message);
    else console.log("   Created message in conversation");
  }

  console.log("\n=== Seed Complete ===");
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
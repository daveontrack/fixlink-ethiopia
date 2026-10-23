// Simple seed script using Supabase JS SDK directly
// Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' src/scripts/seed-simple.js

require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("=== Starting FixLink Ethiopia Database Seed ===\n");

  // Step 1: Get existing service category IDs
  console.log("1. Getting service category IDs...");
  const { data: categories, error: catError } = await supabase
    .from("service_categories")
    .select("id, slug, name");
  
  if (catError) {
    console.error("Failed to fetch categories:", catError.message);
    process.exit(1);
  }

  const catMap = {};
  if (categories) {
    for (const c of categories) {
      catMap[c.slug] = c.id;
      console.log(`   Found category: ${c.slug} (${c.name}) - ID: ${c.id}`);
    }
  }

  // Step 2: Ensure required categories exist
  console.log("\n2. Ensuring required categories exist...");
  const requiredCategories = [
    { slug: "plumbing", name: "Plumbing", description: "Pipe, drain, and fixture repair" },
    { slug: "electrical", name: "Electrical Repair", description: "Wiring, outlets, and circuit repair" },
    { slug: "appliance-repair", name: "Appliance Repair", description: "Home appliance troubleshooting and fix" },
    { slug: "computer-it", name: "Computer and IT Support", description: "Hardware and software support" },
  ];

  for (const cat of requiredCategories) {
    if (catMap[cat.slug]) {
      console.log(`   Category already exists: ${cat.slug}`);
      continue;
    }
    
    const { error } = await supabase.from("service_categories").insert({
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      is_active: true,
      sort_order: 0,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error(`   Failed to insert category ${cat.slug}:`, error.message);
    } else {
      const { data: newCat } = await supabase
        .from("service_categories")
        .select("id")
        .eq("slug", cat.slug)
        .single();
      catMap[cat.slug] = newCat.id;
      console.log(`   Inserted category: ${cat.slug} (ID: ${newCat.id})`);
    }
  }

  // Step 3: Ensure sub-cities exist
  console.log("\n3. Ensuring sub-cities exist...");
  const subCities = [
    { code: "bole", name: "Bole" },
    { code: "kebele-05", name: "Kebele 05" },
    { code: "hidar-tabia", name: "Hidar Tabia" },
    { code: "kebele-13", name: "Kebele 13" },
    { code: "chalenso", name: "Chalenso" },
    { code: "legetafo", name: "Legetafo" },
  ];

  for (const sc of subCities) {
    const { data: existing } = await supabase
      .from("sub_cities")
      .select("code")
      .eq("code", sc.code)
      .single();

    if (existing) {
      console.log(`   Sub-city already exists: ${sc.code}`);
      continue;
    }

    const { error } = await supabase.from("sub_cities").insert({
      code: sc.code,
      name: sc.name,
      sort_order: 0,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error(`   Failed to insert sub-city ${sc.code}:`, error.message);
    } else {
      console.log(`   Inserted sub-city: ${sc.code} (${sc.name})`);
    }
  }

  // Step 4: Insert professionals with profiles
  console.log("\n4. Inserting professionals...");
  const professionals = [
    {
      fullName: "Mekdes Worku",
      email: "mekdes.worku@example.com",
      verificationStatus: "approved",
      acceptsRequests: true,
      city: "Diredawa",
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
      city: "Diredawa",
      subCity: "kebele-05",
      bio: "Certified electrician with 6 years of experience in residential wiring and solar panel installation.",
      yearsExperience: 6,
      hourlyRate: 200,
      categorySlug: "electrical",
    },
    {
      fullName: "Selamawit Tadesse",
      email: "selamawit.tadesse@example.com",
      verificationStatus: "pending",
      acceptsRequests: false,
      city: "Diredawa",
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
      city: "Diredawa",
      subCity: "chalenso",
      bio: "Computer and IT support technician with 10 years of experience in network setup and system optimization.",
      yearsExperience: 10,
      hourlyRate: 250,
      categorySlug: "computer-it",
    },
  ];

  for (const prof of professionals) {
    const catId = catMap[prof.categorySlug];
    if (!catId) {
      console.error(`   Category ${prof.categorySlug} not found, skipping ${prof.fullName}`);
      continue;
    }

    // Check if professional profile already exists
    const { data: existingProf } = await supabase
      .from("professional_locations")  // Using professional_locations as it's used in the code
      .select("professional_id")
      .eq("email", prof.email)
      .single();

    if (existingProf) {
      console.log(`   Professional already exists: ${prof.fullName}`);
      continue;
    }

    // Insert professional profile (professional_locations view)
    const { error: profError } = await supabase.from("professional_locations").insert({
      professional_id: `prof_${Math.random().toString(36).substr(2, 9)}`,
      profile_id: `prof_${Math.random().toString(36).substr(2, 9)}`,
      full_name: prof.fullName,
      email: prof.email,
      base_area_name: prof.city,
      sub_city_code: prof.subCity,
      verification_status: prof.verificationStatus,
      accepts_requests: prof.acceptsRequests,
      service_radius_km: 10,
      years_of_experience: prof.yearsExperience,
      average_rating: 4.5,
      total_reviews: 12,
      completed_jobs: 50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profError) {
      console.error(`   Failed to insert professional ${prof.fullName}:`, profError.message);
      continue;
    }

    // Insert professional service linking to category
    const { error: svcError } = await supabase.from("professional_services").insert({
      professional_id: `prof_${Math.random().toString(36).substr(2, 9)}`,
      category_id: catId,
      title: `${prof.fullName}'s ${prof.categorySlug} service`,
      description: `Professional service for ${prof.categorySlug} provided by ${prof.fullName}`,
      base_price: prof.hourlyRate,
      pricing_unit: "hourly",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (svcError) {
      console.error(`   Failed to insert professional service for ${prof.fullName}:`, svcError.message);
    } else {
      console.log(`   Inserted professional: ${prof.fullName} (${prof.verificationStatus}, ${prof.categorySlug})`);
    }
  }

  // Step 5: Create service requests via RPC
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
      categorySlug: "electrical",
      subCityCode: "kebele-05",
    },
    {
      customerEmail: "customer3@example.com",
      title: "Washing machine not draining",
      description: "The washing machine completes the wash cycle but won't drain. Water remains in the drum.",
      priority: "normal",
      categorySlug: "appliance-repair",
      subCityCode: "hidar-tabia",
    },
  ];

  for (const req of requests) {
    const catId = catMap[req.categorySlug];
    if (!catId) {
      console.error(`   Category ${req.categorySlug} not found`);
      continue;
    }

    const { error } = await supabase.rpc("create_job_request", {
      p_category_id: catId,
      p_title: req.title,
      p_description: req.description,
      p_sub_city_code: req.subCityCode,
      p_priority: req.priority,
    });

    if (error) {
      console.error(`   Failed to create request ${req.title}:`, error.message);
    } else {
      console.log(`   Created request: ${req.title}`);
    }
  }

  // Step 6: Create quotations and bookings
  console.log("\n6. Creating quotations and bookings...");
  
  // Get approved professionals
  const { data: approvedProfs } = await supabase
    .from("professional_locations")
    .select("professional_id, verification_status")
    .eq("verification_status", "approved")
    .limit(3);

  if (!approvedProfs || approvedProfs.length === 0) {
    console.log("   No approved professionals found, skipping quotations/booking");
  } else {
    const laborCost = 1500;
    const materialsCost = 500;

    for (const req of requests) {
      const prof = approvedProfs[0]; // Use first approved professional
      const jobId = `req_${Math.random().toString(36).substr(2, 9)}`; // placeholder

      // Insert quotation
      const { error: quoteError } = await supabase.from("quotations").insert({
        job_id: jobId,
        professional_id: prof.professional_id,
        labor_cost_etb: laborCost,
        materials_cost_etb: materialsCost,
        notes: `Quotation for: ${req.title}`,
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: "submitted",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (quoteError) {
        console.error(`   Failed to create quotation for ${req.title}:`, quoteError.message);
      } else {
        console.log(`   Created quotation for ${req.title} (ETB ${laborCost} + ${materialsCost})`);
      }

      // Insert booking
      const { error: bookingError } = await supabase.from("bookings").insert({
        id: `bk_${Math.random().toString(36).substr(2, 9)}`,
        job_id: jobId,
        quotation_id: quoteError ? null : `q_${Math.random().toString(36).substr(2, 9)}`,
        customer_id: `cust_${Math.random().toString(36).substr(2, 9)}`,
        professional_id: prof.professional_id,
        status: "confirmed",
        payment_status: "paid",
        scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        scheduled_time: "09:00",
        duration_hours: 2,
        total_price: laborCost + materialsCost,
        address: `Diredawa, ${req.subCityCode}`,
        notes: `Booked service for: ${req.title}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (bookingError) {
        console.error(`   Failed to create booking for ${req.title}:`, bookingError.message);
      } else {
        console.log(`   Created booking for ${req.title}`);
      }
    }
  }

  // Step 7: Create notifications
  console.log("\n7. Creating notifications...");
  const { error: notifError } = await supabase.from("notifications").insert({
    user_id: "prof_1",
    type: "new_quotation",
    title: "New quotation received",
    body: "You have received a new quotation for your service request.",
    is_read: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (notifError) {
    console.error("   Failed to create notification:", notifError.message);
  } else {
    console.log("   Created notification for prof_1");
  }

  // Step 8: Create conversation and message
  console.log("\n8. Creating conversation and message...");
  const { data: conv, error: convError } = await supabase.from("conversations").insert({
    request_id: null,
    booking_id: "bk_seed_1",
    customer_id: "cust_seed_1",
    professional_id: "prof_1",
  });

  if (conv && !convError) {
    console.log(`   Created conversation ${conv.id}`);

    const { error: msgError } = await supabase.from("messages").insert({
      conversation_id: conv.id,
      sender_id: "prof_1",
      body: "Hello! I've reviewed your request and would like to submit a quotation.",
      is_read: false,
      created_at: new Date().toISOString(),
    });

    if (msgError) {
      console.error("   Failed to create message:", msgError.message);
    } else {
      console.log("   Created message in conversation");
    }
  }

  console.log("\n=== Seed Complete ===");
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
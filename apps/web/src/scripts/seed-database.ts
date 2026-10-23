"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClerkClient } from "@/lib/supabase/clerk";

async function main() {
  console.log("=== Starting FixLink Ethiopia Database Seed ===\n");

  // 1. Seed service categories
  console.log("1. Seeding service categories...");
  // This script targets an older draft of the schema and is kept for
  // reference only; the untyped client lets it stay compilable while the
  // live schema is enforced by the migrations and the services.
  const supabase: any = createAdminClient();

  const categories = [
    { slug: "plumbing", name: "Plumbing", description: "Pipe, drain, and fixture repair", icon: "Droplets" },
    { slug: "electrical", name: "Electrical Repair", description: "Wiring, outlets, and circuit repair", icon: "Zap" },
    { slug: "appliance-repair", name: "Appliance Repair", description: "Home appliance troubleshooting and fix", icon: "Wrench" },
    { slug: "computer-it", name: "Computer and IT Support", description: "Hardware and software support", icon: "Monitor" },
  ];

  for (const cat of categories) {
    // Check if category with this slug already exists
    const { data: existing } = await supabase
      .from("service_categories")
      .select("id")
      .eq("slug", cat.slug)
      .single();

    if (existing) {
      console.log(`   Category already exists: ${cat.slug}`);
      continue;
    }

    const { error } = await supabase.from("service_categories").insert({
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      is_active: true,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error(`   Failed to insert category ${cat.slug}:`, error.message);
    } else {
      console.log(`   Inserted category: ${cat.slug} (${cat.name})`);
    }
  }

  // 2. Seed sub-cities
  console.log("\n2. Seeding sub-cities...");
  const subCities = [
    { code: "bole", name: "Bole", sort_order: 1 },
    { code: "kebele-05", name: "Kebele 05", sort_order: 2 },
    { code: "hidar-tabia", name: "Hidar Tabia", sort_order: 3 },
    { code: "kebele-13", name: "Kebele 13", sort_order: 4 },
    { code: "chalenso", name: "Chalenso", sort_order: 5 },
    { code: "legetafo", name: "Legetafo", sort_order: 6 },
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
      sort_order: sc.sort_order,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error(`   Failed to insert sub-city ${sc.code}:`, error.message);
    } else {
      console.log(`   Inserted sub-city: ${sc.code} (${sc.name})`);
    }
  }

  // 3. Seed professionals with profiles
  console.log("\n3. Seeding professionals...");
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
      serviceCategories: ["plumbing"],
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
      serviceCategories: ["electrical"],
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
      serviceCategories: ["appliance-repair"],
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
      serviceCategories: ["computer-it"],
    },
  ];

  for (const prof of professionals) {
    // Check if profile already exists for this email
    const { data: existingProfile } = await supabase
      .from("professional_profiles")
      .select("id")
      .eq("email", prof.email)
      .single();

    if (existingProfile) {
      console.log(`   Professional already exists: ${prof.fullName}`);
      continue;
    }

    // Insert professional profile
    const { error: profileError } = await supabase.from("professional_profiles").insert({
      full_name: prof.fullName,
      email: prof.email,
      verification_status: prof.verificationStatus,
      accepts_requests: prof.acceptsRequests,
      verification_status_changed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error(`   Failed to insert professional profile ${prof.fullName}:`, profileError.message);
      continue;
    }

    const profileId = existingProfile?.id ?? `prof_${Math.random().toString(36).substr(2, 9)}`;

    // Insert user profile linked to auth
    const { error: userError } = await supabase.from("profiles").insert({
      id: `prof_${profileId}`,
      clerk_user_id: `clerk_${profileId}`,
      role: "professional",
      full_name: prof.fullName,
      email: prof.email,
      phone: null,
      avatar_url: null,
      city: prof.city,
      sub_city: prof.subCity,
      address: `${prof.city}, ${prof.subCity}`,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (userError) {
      console.error(`   Failed to insert user profile ${prof.fullName}:`, userError.message);
      continue;
    }

    // Insert professional services linking to categories
    for (const catId of prof.serviceCategories) {
      // Check if category exists
      const { data: catData } = await supabase
        .from("service_categories")
        .select("id")
        .eq("slug", catId)
        .single();

      if (!catData) {
        console.warn(`   Category ${catId} not found, skipping professional service link`);
        continue;
      }

      // Check if professional_service already exists
      const { data: existingSvc } = await supabase
        .from("professional_services")
        .select("id")
        .eq("professional_id", `prof_${profileId}`)
        .eq("category_id", catData.id)
        .single();

      if (existingSvc) {
        console.log(`   Professional service already exists for ${prof.fullName} / ${catId}`);
        continue;
      }

      const basePrice = prof.hourlyRate;

      const { error: svcError } = await supabase.from("professional_services").insert({
        professional_id: `prof_${profileId}`,
        category_id: catData.id,
        title: `${prof.fullName}'s ${catId} service`,
        description: `Professional service for ${catId} provided by ${prof.fullName}`,
        base_price: basePrice,
        pricing_unit: "hourly",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (svcError) {
        console.error(`   Failed to insert professional service for ${prof.fullName} / ${catId}:`, svcError.message);
      } else {
        console.log(`   Inserted professional service: ${prof.fullName} / ${catId} (ETB ${basePrice}/hr)`);
      }
    }

    console.log(`   Seeded professional: ${prof.fullName} (${prof.verificationStatus})`);
  }

  // 4. Seed service requests
  console.log("\n4. Seeding service requests...");
  const requests = [
    {
      customerEmail: "customer1@example.com",
      title: "Leaky faucet in kitchen",
      description: "The kitchen faucet is dripping constantly. Need someone to replace the washer and fix the leak. Priority is normal.",
      priority: "normal",
      category: "plumbing",
      subCity: "bole",
    },
    {
      customerEmail: "customer2@example.com",
      title: "Power outlet not working",
      description: "The bedroom power outlet has no electricity. Need an electrician to inspect and replace if necessary. Priority is urgent.",
      priority: "urgent",
      category: "electrical",
      subCity: "kebele-05",
    },
    {
      customerEmail: "customer3@example.com",
      title: "Washing machine not draining",
      description: "The washing machine completes the wash cycle but won't drain. Water remains in the drum after the cycle ends.",
      priority: "normal",
      category: "appliance-repair",
      subCity: "hidar-tabia",
    },
    {
      customerEmail: "customer4@example.com",
      title: "Laptop not charging and slow performance",
      description: "Laptop won't charge when plugged in and runs very slowly. Possible virus or hardware issue.",
      priority: "high",
      category: "computer-it",
      subCity: "chalenso",
    },
    {
      customerEmail: "customer5@example.com",
      title: "Install new water heater",
      description: "Need a new electric water heater installed for a 3-bedroom house. Include removal of old unit and connection to existing plumbing.",
      priority: "normal",
      category: "plumbing",
      subCity: "kebele-13",
    },
  ];

  for (const req of requests) {
    // Find professionals in the same sub-city with the required category
    const { data: svc } = await supabase
      .from("professional_services")
      .select("professional_id")
      .eq("category_id", req.category)
      .limit(3);

    const professionalIds = (svc ?? []).map((s: any) => s.professional_id);

    // Create the job request via RPC
    const { data: created, error } = await supabase.rpc("create_job_request", {
      p_category_id: req.category,
      p_title: req.title,
      p_description: req.description,
      p_sub_city_code: req.subCity,
      p_priority: req.priority,
    });

    if (error) {
      console.error(`   Failed to create request ${req.title}:`, error.message);
      continue;
    }

    const jobId = Array.isArray(created) ? created[0]?.id : created?.id;

    if (!jobId) {
      console.error(`   No job ID returned for request: ${req.title}`);
      continue;
    }

    // Assign a professional match if available
    if (professionalIds.length > 0) {
      const profId = professionalIds[0];

      const { error: matchError } = await supabase.from("job_matches").insert({
        job_id: jobId,
        professional_id: profId,
      });

      if (matchError) {
        console.warn(`   Could not match professional to request ${req.title}:`, matchError.message);
      } else {
        console.log(`   Matched professional ${profId} to request ${req.title}`);
      }
    }

    // Create a quotation for this request
    // Check if any professional is approved
    const { data: anyProf } = await supabase
      .from("professionals")
      .select("id, verification_status")
      .limit(1)
      .maybeSingle();

    const isApproved = anyProf?.verification_status === "approved";

    if (!isApproved) {
      console.log(`   Skipping quotation for ${req.title} - no approved professionals`);
      continue;
    }

    // Use the first professional's ID for the quotation
    const profId = professionalIds?.[0] ?? "";

    const laborCost = 1500; // ETB
    const materialsCost = 500; // ETB

    const { data: quotation, error: quoteError } = await supabase.from("quotations").insert({
      job_id: jobId,
      professional_id: profId,
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
      console.log(`   Created quotation ${quotation.id} for ${req.title} (ETB ${laborCost} + ${materialsCost})`);
    }

    // Create a booking
    const { error: bookingError } = await supabase.from("bookings").insert({
      request_id: jobId,
      quotation_id: quotation?.id,
      customer_id: `cust_${Date.now()}`,
      professional_id: profId,
      status: "confirmed",
      payment_status: "paid",
      scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      scheduled_time: "09:00",
      duration_hours: 2,
      total_price: laborCost + materialsCost,
      address: `Diredawa, ${req.subCity}`,
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

  // 5. Seed notifications and messages
  console.log("\n5. Seeding notifications and messages...");
  const notifications = [
    {
      userId: "prof_1",
      type: "new_quotation",
      title: "New quotation received",
      body: "You have received a new quotation for your service request.",
    },
    {
      userId: "prof_2",
      type: "booking_update",
      title: "Booking confirmed",
      body: "Your booking has been confirmed for tomorrow.",
    },
    {
      userId: "customer_1",
      type: "quotation_sent",
      title: "Quotation sent",
      body: "Your quotation has been sent to the professional.",
    },
  ];

  for (const notif of notifications) {
    const { error } = await supabase.from("notifications").insert({
      user_id: notif.userId,
      type: notif.type,
      title: notif.title,
      body: notif.body,
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error(`   Failed to create notification:`, error.message);
    } else {
      console.log(`   Created notification for user ${notif.userId}`);
    }
  }

  // Seed a conversation and message
  const { data: conv } = await supabase.from("conversations").insert({
    request_id: null,
    booking_id: "bk_seed_1",
    customer_id: "cust_seed_1",
    professional_id: "prof_1",
  });

  if (conv && !conv.error) {
    console.log(`   Created conversation ${conv.id}`);

    const { error: msgError } = await supabase.from("messages").insert({
      conversation_id: conv.id,
      sender_id: "prof_1",
      body: "Hello! I've reviewed your request and would like to submit a quotation.",
      is_read: false,
      created_at: new Date().toISOString(),
    });

    if (msgError) {
      console.error(`   Failed to create message:`, msgError.message);
    } else {
      console.log(`   Created message in conversation ${conv.id}`);
    }
  }

  console.log("\n=== Seed Complete ===");
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
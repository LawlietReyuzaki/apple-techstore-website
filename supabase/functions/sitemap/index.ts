import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const baseUrl = "https://appletechstore.pk";
    const today = new Date().toISOString().split("T")[0];

    // Fetch all products
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, updated_at")
      .order("updated_at", { ascending: false });

    if (productsError) {
      console.error("Error fetching products:", productsError);
    }

    // Fetch all spare parts (visible only)
    const { data: spareParts, error: sparePartsError } = await supabase
      .from("spare_parts")
      .select("id, updated_at")
      .eq("visible", true)
      .order("updated_at", { ascending: false });

    if (sparePartsError) {
      console.error("Error fetching spare parts:", sparePartsError);
    }

    // Fetch all shop items (visible only)
    const { data: shopItems, error: shopItemsError } = await supabase
      .from("shop_items")
      .select("id, updated_at")
      .eq("visible", true)
      .order("updated_at", { ascending: false });

    if (shopItemsError) {
      console.error("Error fetching shop items:", shopItemsError);
    }

    // Fetch all shop categories
    const { data: shopCategories, error: categoriesError } = await supabase
      .from("shop_categories")
      .select("slug, created_at")
      .order("sort_order", { ascending: true });

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError);
    }

    // Build sitemap XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/shop</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/spare-parts</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/used-phones</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/laptops</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/accessories</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/book-repair</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/track-repair</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/request-part</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;

    // Add shop categories
    if (shopCategories && shopCategories.length > 0) {
      xml += `\n  <!-- Shop Categories -->\n`;
      for (const category of shopCategories) {
        const lastmod = category.created_at 
          ? new Date(category.created_at).toISOString().split("T")[0] 
          : today;
        xml += `  <url>
    <loc>${baseUrl}/shop/${category.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>\n`;
      }
    }

    // Add products
    if (products && products.length > 0) {
      xml += `\n  <!-- Products -->\n`;
      for (const product of products) {
        const lastmod = product.updated_at 
          ? new Date(product.updated_at).toISOString().split("T")[0] 
          : today;
        xml += `  <url>
    <loc>${baseUrl}/product/${product.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
      }
    }

    // Add spare parts
    if (spareParts && spareParts.length > 0) {
      xml += `\n  <!-- Spare Parts -->\n`;
      for (const part of spareParts) {
        const lastmod = part.updated_at 
          ? new Date(part.updated_at).toISOString().split("T")[0] 
          : today;
        xml += `  <url>
    <loc>${baseUrl}/spare-part/${part.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
      }
    }

    // Add shop items
    if (shopItems && shopItems.length > 0) {
      xml += `\n  <!-- Shop Items -->\n`;
      for (const item of shopItems) {
        const lastmod = item.updated_at 
          ? new Date(item.updated_at).toISOString().split("T")[0] 
          : today;
        xml += `  <url>
    <loc>${baseUrl}/shop-item/${item.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
      }
    }

    xml += `</urlset>`;

    console.log(`Generated sitemap with ${(products?.length || 0) + (spareParts?.length || 0) + (shopItems?.length || 0)} product URLs`);

    return new Response(xml, {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://appletechstore.pk/</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`,
      {
        headers: corsHeaders,
        status: 200,
      }
    );
  }
});

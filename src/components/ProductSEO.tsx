import { Helmet } from "react-helmet";
import { getAbsoluteImageUrl } from "@/lib/imageUrl";

interface ProductSEOProps {
  name: string;
  description?: string | null;
  price: number;
  salePrice?: number | null;
  brand: string;
  image?: string | null;
  stock?: number;
  url: string;
  category?: string | null;
}

export function ProductSEO({
  name,
  description,
  price,
  salePrice,
  brand,
  image,
  stock = 0,
  url,
  category,
}: ProductSEOProps) {
  const displayPrice = salePrice && salePrice < price ? salePrice : price;
  const availability = stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  const fullUrl = `https://appletechstore.pk${url}`;
  const imageUrl = getAbsoluteImageUrl(image);
  
  const truncatedDescription = description 
    ? description.substring(0, 155) + (description.length > 155 ? "..." : "")
    : `Buy ${name} at best price in Pakistan. ${brand} product available at AppleTechStore with fast delivery.`;

  const pageTitle = `${name} - Buy at Best Price | AppleTechStore Pakistan`;

  // Product structured data
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: name,
    description: truncatedDescription,
    image: imageUrl,
    brand: {
      "@type": "Brand",
      name: brand,
    },
    offers: {
      "@type": "Offer",
      price: displayPrice,
      priceCurrency: "PKR",
      availability: availability,
      url: fullUrl,
      seller: {
        "@type": "Organization",
        name: "AppleTechStore",
      },
    },
    ...(category && {
      category: category,
    }),
  };

  // BreadcrumbList structured data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://appletechstore.pk/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category || "Products",
        item: `https://appletechstore.pk/shop`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: name,
        item: fullUrl,
      },
    ],
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="title" content={pageTitle} />
      <meta name="description" content={truncatedDescription} />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="product" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={truncatedDescription} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content="AppleTechStore" />
      <meta property="og:locale" content="en_PK" />
      <meta property="product:price:amount" content={displayPrice.toString()} />
      <meta property="product:price:currency" content="PKR" />
      <meta property="product:availability" content={stock > 0 ? "in stock" : "out of stock"} />
      <meta property="product:brand" content={brand} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={truncatedDescription} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(productSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
    </Helmet>
  );
}

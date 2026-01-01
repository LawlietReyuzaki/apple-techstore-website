import { Helmet } from "react-helmet";

interface PageSEOProps {
  title: string;
  description: string;
  url: string;
  type?: "website" | "product" | "article";
  image?: string;
  keywords?: string;
  noindex?: boolean;
}

export function PageSEO({
  title,
  description,
  url,
  type = "website",
  image,
  keywords,
  noindex = false,
}: PageSEOProps) {
  const fullUrl = url.startsWith("http") ? url : `https://appletechstore.pk${url}`;
  const imageUrl = image || "https://appletechstore.pk/favicon.png";
  const truncatedDescription = description.substring(0, 155) + (description.length > 155 ? "..." : "");
  const pageTitle = title.length > 60 ? title.substring(0, 57) + "..." : title;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="title" content={pageTitle} />
      <meta name="description" content={truncatedDescription} />
      <link rel="canonical" href={fullUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={truncatedDescription} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content="AppleTechStore" />
      <meta property="og:locale" content="en_PK" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={truncatedDescription} />
      <meta name="twitter:image" content={imageUrl} />
    </Helmet>
  );
}

// Structured data for product listings/collections
interface CollectionSchemaProps {
  name: string;
  description: string;
  url: string;
  itemCount?: number;
}

export function CollectionSchema({ name, description, url, itemCount }: CollectionSchemaProps) {
  const fullUrl = url.startsWith("http") ? url : `https://appletechstore.pk${url}`;
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": name,
    "description": description,
    "url": fullUrl,
    ...(itemCount !== undefined && { "numberOfItems": itemCount }),
    "isPartOf": {
      "@type": "WebSite",
      "name": "AppleTechStore",
      "url": "https://appletechstore.pk"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

// Breadcrumb structured data
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url.startsWith("http") ? item.url : `https://appletechstore.pk${item.url}`
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

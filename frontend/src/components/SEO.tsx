import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
}

const SITE = 'https://www.biz-salama.co.tz';
const DEFAULT_TITLE = 'Biz-Salama — Secure Escrow Marketplace for Tanzania';
const DEFAULT_DESC =
  "Tanzania's #1 trusted escrow marketplace. Your money stays protected until you receive your goods. Buy from verified sellers.";
const DEFAULT_IMAGE = `${SITE}/og-image.png`;

const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESC,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noindex = false,
}) => {
  const fullTitle = title ? `${title} — Biz-Salama` : DEFAULT_TITLE;
  const fullUrl = url ? `${SITE}${url}` : SITE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEO;

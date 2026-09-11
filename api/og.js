import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://avrpxknjthaglcswtagw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cnB4a25qdGhhZ2xjc3d0YWd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NjQ4MzcsImV4cCI6MjA5ODQ0MDgzN30.Ql1vNF0IBLSOLkgKMySHZgtmPvLjp3QmgYTVxp8TfaU';

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  const { prop } = req.query;

  if (!prop) {
    return res.status(400).json({ error: 'Missing prop parameter' });
  }

  try {
    // Fetch property data from Supabase
    const { data: property, error } = await db
      .from('properties')
      .select('*')
      .eq('id', prop)
      .single();

    if (error || !property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Get cover image
    const images = property.images || [];
    const coverIndex = property.cover_index || 0;
    const coverImage = images[coverIndex] ? `${images[coverIndex]}?width=1200&quality=80` : '/logo.png';

    // Generate HTML with Open Graph meta tags
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="${escapeHtml(property.title || 'Mimi Home')}">
  <meta property="og:description" content="${escapeHtml(getDescription(property))}">
  <meta property="og:image" content="${escapeHtml(coverImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="https://mimifindhome.vercel.app/?prop=${prop}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(property.title || 'Mimi Home')}">
  <meta name="twitter:description" content="${escapeHtml(getDescription(property))}">
  <meta name="twitter:image" content="${escapeHtml(coverImage)}">
  <meta http-equiv="refresh" content="0; url=/?prop=${prop}">
</head>
<body>
  <p>Redirecting to property...</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getDescription(property) {
  const rent = property.rent ? `NT$${property.rent.toLocaleString()}/月` : '';
  const layout = property.layout || '';
  const district = property.district || '';
  const parts = [rent, layout, district].filter(Boolean);
  return parts.join(' | ') || 'Mimi Home - 生活尋家 台中租屋';
}

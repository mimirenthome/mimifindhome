const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://avrpxknjthaglcswtagw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cnB4a25qdGhhZ2xjc3d0YWd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NjQ4MzcsImV4cCI6MjA5ODQ0MDgzN30.Ql1vNF0IBLSOLkgKMySHZgtmPvLjp3QmgYTVxp8TfaU';
const SITE_URL = 'https://www.mimifindhome.com';

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function fetchProperty(propId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(propId)}&select=title,district,rent,images,cover_index`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

module.exports = async (req, res) => {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  const propId = String(req.query.prop || '');

  let output = html;
  const prop = /^[\w-]+$/.test(propId) ? await fetchProperty(propId).catch(() => null) : null;

  if (prop) {
    const images = prop.images || [];
    const original = images[prop.cover_index || 0] || images[0];
    const image = original && original.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/').replace(/\?.*$/, '') + '?width=1200&quality=85';
    const title = `${prop.title || '物件'}｜Mimi Home`;
    const description = `NT$${Number(prop.rent || 0).toLocaleString()}/月｜${prop.district || ''}`;
    const pageUrl = `${SITE_URL}/index.html?prop=${encodeURIComponent(propId)}`;

    const meta = [
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="Mimi Home" />`,
      `<meta property="og:title" content="${escapeHtml(title)}" />`,
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
      `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
      image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : '',
      `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
      `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
      `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
      image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : '',
    ].filter(Boolean).join('\n  ');

    output = html
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>\n  ${meta}`);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.status(200).send(output);
};

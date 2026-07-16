/* ============================================
   SUPABASE CLIENT + DATA HELPERS
   ============================================ */

const SUPABASE_URL = 'https://avrpxknjthaglcswtagw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1WPr7jAJccuERfuRmYWkOQ_YdlyP4Q6';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 從 layout 和 type 推導 layoutCategory（舊資料 fallback 用）
// 分類規則：1房 → 套房；1＋1房 → 2房
function deriveLayoutCategory(layout, type) {
  const l = (layout || '').trim();
  const t = (type || '').trim();
  if (/套房/.test(t) || /^套房/.test(l)) return '套房';
  // 1＋1房、1+1房 → 視為 2房（落入下方正則，n = 1+1 = 2）
  const m = l.match(/^(\d+)[＋+]?(\d+)?房/);
  if (m) {
    const n = parseInt(m[1]) + (m[2] ? parseInt(m[2]) : 0);
    if (n >= 5) return '5房以上';
    if (n === 4) return '4房';
    if (n === 3) return '3房';
    if (n === 2) return '2房';
    if (n === 1) return '套房';  // 1房 併入套房
  }
  if (/套房/.test(l)) return '套房';
  return '';
}

// 正規化分類：把既有資料中的舊分類值轉成新制（1＋1房→2房）
function normalizeLayoutCat(cat) {
  const c = (cat || '').trim();
  if (/^1[＋+]1房$/.test(c)) return '2房';
  return c;
}

// DB row → JS object (snake_case → camelCase)
function propFromDb(row) {
  const layout = row.layout || '';
  const type   = row.type   || '';
  const layoutCategory = normalizeLayoutCat(row.layout_category || deriveLayoutCategory(layout, type));
  return {
    id: row.id,
    title: row.title,
    district: row.district,
    address: row.address || '',
    rent: row.rent,
    layout,
    layoutCategory,
    size: row.size || 0,
    floor: row.floor || '',
    totalFloors: row.total_floors || 0,
    type,
    nearbyLandmarks: row.nearby_landmarks || '',
    highlights: row.highlights || '',
    tags: row.tags || [],
    pros: row.pros || '',
    cons: row.cons || '',
    images: row.images || [],
    coverIndex: row.cover_index || 0,
    video: row.video || '',
    isActive: row.is_active,
    recommendCategories: row.recommend_categories || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// JS object → DB row (camelCase → snake_case)
function propToDb(p) {
  const row = {
    id: p.id,
    title: p.title,
    district: p.district,
    address: p.address || '',
    rent: p.rent,
    layout: p.layout || '',
    layout_category: p.layoutCategory || '',
    size: p.size || 0,
    floor: p.floor || '',
    total_floors: p.totalFloors || 0,
    type: p.type || '',
    nearby_landmarks: p.nearbyLandmarks || '',
    highlights: p.highlights || '',
    tags: p.tags || [],
    pros: p.pros || '',
    cons: p.cons || '',
    images: p.images || [],
    cover_index: p.coverIndex || 0,
    is_active: p.isActive !== undefined ? p.isActive : true,
    recommend_categories: p.recommendCategories || [],
    updated_at: new Date().toISOString(),
  };
  if (p.createdAt) row.created_at = p.createdAt;
  return row;
}

// Appointment JS → DB row
function apptToDb(a) {
  return {
    id: a.id,
    name: a.name || '',
    phone: a.phone || '',
    property_title: a.propertyTitle || '',
    date: a.date || '',
    time: a.time || '',
    move_in_date: a.moveInDate || '',
    occupants: a.occupants || '',
    relationship: a.relationship || '',
    occupation: a.occupation || '',
    age: a.age || '',
    has_pet: a.hasPet || '',
    pet_detail: a.petDetail || '',
    smokes: a.smokes || '',
    knows_fee: a.knowsFee || '',
    needs_subsidy: a.needsSubsidy || '',
    needs_registration: a.needsRegistration || '',
    can_provide_proof: a.canProvideProof || '',
    notes: a.notes || '',
    status: a.status || '未處理',
  };
}

// Appointment DB row → JS object
function apptFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    propertyTitle: row.property_title,
    date: row.date,
    time: row.time,
    moveInDate: row.move_in_date,
    occupants: row.occupants,
    relationship: row.relationship,
    occupation: row.occupation,
    age: row.age,
    hasPet: row.has_pet,
    petDetail: row.pet_detail,
    smokes: row.smokes,
    knowsFee: row.knows_fee,
    needsSubsidy: row.needs_subsidy,
    needsRegistration: row.needs_registration,
    canProvideProof: row.can_provide_proof,
    notes: row.notes,
    status: row.status,
    submittedAt: row.submitted_at,
  };
}

// Convert base64 dataUrl to Blob for Storage upload
function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

// Upload image blob to Supabase Storage, return public URL
async function uploadImageToStorage(dataUrl, propId, index) {
  const filename = `${propId}/${Date.now()}-${index}.jpg`;
  const blob = dataUrlToBlob(dataUrl);
  const { error } = await db.storage
    .from('property-images')
    .upload(filename, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = db.storage
    .from('property-images')
    .getPublicUrl(filename);
  return publicUrl;
}

async function uploadVideoToStorage(dataUrl, propId) {
  const filename = `${propId}/video-${Date.now()}.mp4`;
  const blob = dataUrlToBlob(dataUrl);
  const { error } = await db.storage
    .from('property-images')
    .upload(filename, blob, { contentType: 'video/mp4', upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = db.storage
    .from('property-images')
    .getPublicUrl(filename);
  return publicUrl;
}

/* ============================================
   MIMI HOME - FRONTEND SCRIPT
   ============================================ */

// 頁面加載時回到頂部
window.addEventListener('load', () => {
  window.scrollTo(0, 0);
});

// ===== SAMPLE DATA =====
const SAMPLE_PROPERTIES = [];

// ===== STATE =====
let allProperties = [];
let filteredProperties = [];
let compareList = [];
let allAppointments = [];
let activeTagFilters = [];
let selectedDistricts = [];
let currentDetailId = null;
let savedScrollPosition = 0;
let currentSort = '';
let lightboxCurrentIndex = 0;
// PhotoSwipe gallery 管理
let currentGalleryImages = [];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  initFilters();
  initAppointmentForm();
  setMinDate();
  await initData();
  renderProperties();

  // 頁面加載完成後，等待200ms讓form render，然後刷新一次預約
  setTimeout(() => {
    const dateInput = document.getElementById('appt-date');
    if (dateInput) {
      updateAvailableTimeSlots();
    }
  }, 200);

  // 分享連結：自動開啟指定物件
  const propId = new URLSearchParams(location.search).get('prop');
  if (propId) {
    const p = allProperties.find(x => x.id === propId);
    if (p) openDetailModal(propId);
  }
});

async function initData() {
  // 隱藏物件網格直到加載完成
  const grid = document.getElementById('properties-grid');
  if (grid) grid.style.opacity = '0.5';

  try {
    const { data, error } = await db.from('properties')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const props = (data || []).map(propFromDb);
  // 推薦分類置頂：最新物件 > 私心推薦 > 近期熱門 > 學生首選 > 無分類
  const recPriority = (p) => {
    const cats = p.recommendCategories || [];
    if (cats.includes('♡ 最新物件')) return 4;
    if (cats.includes('♡ 私心推薦')) return 3;
    if (cats.includes('♡ 近期熱門')) return 2;
    if (cats.includes('♡ 學生首選')) return 1;
    return 0;
  };
  props.sort((a, b) => recPriority(b) - recPriority(a));
  allProperties = props;
  } catch(e) {
    console.error('載入物件失敗', e);
    allProperties = [];
  }
  filteredProperties = [...allProperties];

  // 加載預約數據
  try {
    const { data: appts, error: apptError } = await db.from('appointments').select('*');
    if (apptError) throw apptError;
    allAppointments = (appts || []).map(apptFromDb);
  } catch(e) {
    console.error('載入預約失敗', e);
    allAppointments = [];
  }

  // 加載完成後，恢復顯示
  if (grid) grid.style.opacity = '1';
}

function setMinDate() {
  const dateInput = document.getElementById('appt-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
  }
}

async function updateAvailableTimeSlots() {
  const dateInput = document.getElementById('appt-date');
  const timeSelect = document.getElementById('appt-time');
  const selectedDate = dateInput.value;

  if (!selectedDate) return;

  try {
    // 📌 直接查詢 Supabase，不依賴舊的 allAppointments
    const { data: appts, error } = await db.from('appointments')
      .select('date, time, status')
      .eq('date', selectedDate);

    if (error) throw error;

    // 找出該日期已預約或已鎖定的時間
    const bookedTimes = (appts || []).map(a => a.time);
    const bookedStatus = {};
    (appts || []).forEach(a => {
      bookedStatus[a.time] = a.status || '已預約';
    });

    console.log(`📅 選擇日期: ${selectedDate}`);
    console.log(`🕐 該日期已預約時間: ${bookedTimes.join(', ') || '無'}`);

    // 時間轉分鐘函數
    const timeToMinutes = (time) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    // 找出前一個時間是否被預約（用於判斷相鄰）
    const adjacentToPrev = {};
    Array.from(timeSelect.options).forEach(option => {
      if (option.value === '') return;
      const optionTime = option.value;
      const optionMinutes = timeToMinutes(optionTime);

      // 檢查是否有時間恰好在前30分鐘（假設30分鐘時間間隔）
      const prevTime = Object.keys(bookedStatus).find(t => {
        const tMinutes = timeToMinutes(t);
        return optionMinutes - tMinutes === 30;
      });

      if (prevTime) {
        adjacentToPrev[optionTime] = true;
      }
    });

    // 更新所有時間選項：已預約/已鎖定的禁用，未預約的啟用
    Array.from(timeSelect.options).forEach(option => {
      if (option.value === '') return; // 跳過「選擇時間」選項

      if (bookedTimes.includes(option.value)) {
        option.disabled = true;
        const status = bookedStatus[option.value];
        const label = status === '已鎖定' ? '(已鎖定)' : '(已預約)';
        option.textContent = option.value + ' ' + label;
      } else {
        option.disabled = false;
        option.textContent = option.value;
      }

      // 標記相鄰時間
      option.dataset.adjacentToPrev = adjacentToPrev[option.value] ? 'true' : 'false';
    });
  } catch(e) {
    console.error('查詢預約失敗:', e);
  }
}

async function refreshAppointments() {
  const btn = document.getElementById('refresh-appt-btn');
  const dateInput = document.getElementById('appt-date');

  btn.disabled = true;
  btn.textContent = '⏳ 刷新中...';

  try {
    // 重新加載所有預約
    const { data: appts, error } = await db.from('appointments').select('*');
    if (error) throw error;

    allAppointments = (appts || []).map(apptFromDb);

    // 如果已選擇日期，刷新該日期的時間選項
    if (dateInput && dateInput.value) {
      updateAvailableTimeSlots();
    }

    showToast('✅ 預約資料已更新！已禁用所有已預約時間', 'success');
  } catch(e) {
    console.error('刷新預約失敗', e);
    showToast('❌ 刷新失敗，請稍後再試', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 刷新';
  }
}

// ===== HAMBURGER =====
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobile-nav');
const navOverlay = document.getElementById('nav-overlay');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  mobileNav.classList.toggle('open');
  navOverlay.classList.toggle('show');
});
navOverlay.addEventListener('click', closeMobileNav);

function closeMobileNav() {
  hamburger.classList.remove('open');
  mobileNav.classList.remove('open');
  navOverlay.classList.remove('show');
}

// ===== FILTERS =====
function initFilters() {
  const tagBtns = document.querySelectorAll('.filter-tag-btn');
  tagBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      if (activeTagFilters.includes(tag)) {
        activeTagFilters = activeTagFilters.filter(t => t !== tag);
        btn.classList.remove('active');
      } else {
        activeTagFilters.push(tag);
        btn.classList.add('active');
      }
      applyFilters();
    });
  });

  // live filter on select change
  // 點選外部關閉地區下拉
  document.addEventListener('click', e => {
    const ms = document.getElementById('district-ms');
    if (ms && !ms.contains(e.target)) closeDistrictDropdown();
  });
  document.getElementById('filter-layout').addEventListener('change', applyFilters);
  document.getElementById('filter-rent-min').addEventListener('input', debounce(applyFilters, 400));
  document.getElementById('filter-rent-max').addEventListener('input', debounce(applyFilters, 400));
}

// ===== 地區多選 =====
function toggleDistrictDropdown(e) {
  e.stopPropagation();
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    document.getElementById('district-backdrop').classList.add('open');
    document.getElementById('district-sheet').classList.add('open');
  } else {
    const dd = document.getElementById('district-dropdown');
    const arrow = document.getElementById('district-arrow');
    const isOpen = dd.classList.toggle('open');
    arrow.classList.toggle('open', isOpen);
  }
}

function closeDistrictDropdown() {
  document.getElementById('district-dropdown').classList.remove('open');
  document.getElementById('district-arrow').classList.remove('open');
  document.getElementById('district-backdrop').classList.remove('open');
  document.getElementById('district-sheet').classList.remove('open');
}

function onDistrictChange() {
  // 同步桌機和手機 checkbox 狀態
  const allBoxes = document.querySelectorAll('.district-opt input[type="checkbox"]');
  const mobileBoxes  = document.querySelectorAll('.district-opt input[data-mobile]');
  const desktopBoxes = document.querySelectorAll('.district-opt input:not([data-mobile])');
  // 找到剛被觸發的 checkbox（最後一個 change）
  const changed = [...allBoxes].find(b => b === document.activeElement) || null;
  if (changed) {
    const val = changed.value;
    const checked = changed.checked;
    allBoxes.forEach(b => { if (b.value === val) b.checked = checked; });
  }
  selectedDistricts = [...new Set([...allBoxes].filter(b => b.checked).map(b => b.value))];
  updateDistrictTrigger();
  applyFilters();
}

function removeDistrict(name) {
  selectedDistricts = selectedDistricts.filter(d => d !== name);
  document.querySelectorAll('.district-opt input[type="checkbox"]')
    .forEach(b => { if (b.value === name) b.checked = false; });
  updateDistrictTrigger();
  applyFilters();
}

function clearDistrictFilter() {
  selectedDistricts = [];
  document.querySelectorAll('.district-opt input[type="checkbox"]').forEach(b => b.checked = false);
  updateDistrictTrigger();
  applyFilters();
}

function updateDistrictTrigger() {
  const trigger = document.getElementById('district-trigger');
  const triggerText = document.getElementById('district-trigger-text');
  const tagsEl = document.getElementById('district-tags');
  const n = selectedDistricts.length;
  if (n === 0) {
    triggerText.textContent = '全部地區';
    trigger.classList.remove('active');
    tagsEl.innerHTML = '';
  } else {
    triggerText.textContent = n <= 3 ? selectedDistricts.join('、') : `已選 ${n} 區`;
    trigger.classList.add('active');
    tagsEl.innerHTML = selectedDistricts.map(d =>
      `<span class="district-tag">${d}<span class="district-tag-remove" onclick="removeDistrict('${d}')">×</span></span>`
    ).join('');
  }
}

// ===== 類型 Dropdown 函數（同地區邏輯）=====
let selectedTypes = [];

function toggleTypeDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('type-dropdown');
  const arrow = document.getElementById('type-arrow');
  const isOpen = dropdown.style.display === 'block';
  dropdown.style.display = isOpen ? 'none' : 'block';
  arrow.classList.toggle('open');
  if (!isOpen) {
    document.addEventListener('click', closeTypeDropdown);
  } else {
    document.removeEventListener('click', closeTypeDropdown);
  }
}

function closeTypeDropdown() {
  document.getElementById('type-dropdown').style.display = 'none';
  document.getElementById('type-arrow').classList.remove('open');
}

function onTypeChange() {
  const allBoxes = document.querySelectorAll('.filter-type-checkbox');
  selectedTypes = [...new Set([...allBoxes].filter(b => b.checked).map(b => b.value))];
  updateTypeTrigger();
  filterProperties();
}

function clearTypeFilter() {
  selectedTypes = [];
  document.querySelectorAll('.filter-type-checkbox').forEach(b => b.checked = false);
  updateTypeTrigger();
  filterProperties();
}

function updateTypeTrigger() {
  const trigger = document.getElementById('type-trigger');
  const triggerText = document.getElementById('type-trigger-text');
  const tagsEl = document.getElementById('type-tags');
  const n = selectedTypes.length;
  if (n === 0) {
    triggerText.textContent = '全部類型';
    trigger.classList.remove('active');
    tagsEl.innerHTML = '';
  } else {
    triggerText.textContent = n <= 3 ? selectedTypes.join('、') : `已選 ${n} 種`;
    trigger.classList.add('active');
    tagsEl.innerHTML = selectedTypes.map(t =>
      `<span class="district-tag">${t}<span class="district-tag-remove" onclick="removeType('${t}')">×</span></span>`
    ).join('');
  }
}

function removeType(name) {
  selectedTypes = selectedTypes.filter(t => t !== name);
  document.querySelectorAll('.filter-type-checkbox')
    .forEach(b => { if (b.value === name) b.checked = false; });
  updateTypeTrigger();
  filterProperties();
}

function applyFilters() {
  const layout = document.getElementById('filter-layout').value;
  const rentMin = parseInt(document.getElementById('filter-rent-min').value) || 0;
  const rentMax = parseInt(document.getElementById('filter-rent-max').value) || Infinity;

  const keyword = (document.getElementById('filter-keyword')?.value || '').trim().toLowerCase();

  filteredProperties = allProperties.filter(p => {
    if (selectedDistricts.length > 0 && !selectedDistricts.includes(p.district)) return false;
    if (layout) {
      const cat = p.layoutCategory || deriveLayoutCategory(p.layout || '', p.type || '');
      if (layout === '5房以上') { if (cat !== '5房以上') return false; }
      else if (cat !== layout) return false;
    }
    // 檢查類型：物件可能有多個類型（用「、」分隔），需要檢查是否有任何一個被選中
    if (selectedTypes.length > 0) {
      const propTypes = (p.type || '').split('、').filter(Boolean);
      const hasMatchingType = propTypes.some(t => selectedTypes.includes(t));
      if (!hasMatchingType) return false;
    }
    if (p.rent < rentMin) return false;
    if (p.rent > rentMax) return false;
    if (activeTagFilters.length > 0) {
      const hasTags = activeTagFilters.every(tag => p.tags && p.tags.includes(tag));
      if (!hasTags) return false;
    }
    if (keyword) {
      const searchable = [p.title, p.address, p.nearbyLandmarks, p.district, p.highlights, p.pros]
        .filter(Boolean).join(' ').toLowerCase();
      if (!searchable.includes(keyword)) return false;
    }
    return true;
  });

  mobileExpanded = false;
  desktopExpanded = false;
  renderProperties();
  updateFilterHint(layout, rentMin, rentMax);
  updateFilterCount();
}

function clearFilters() {
  clearDistrictFilter();
  document.getElementById('filter-layout').value = '';
  clearTypeFilter();
  document.getElementById('filter-rent-min').value = '';
  document.getElementById('filter-rent-max').value = '';
  const kw = document.getElementById('filter-keyword');
  if (kw) kw.value = '';
  activeTagFilters = [];
  document.querySelectorAll('.filter-tag-btn').forEach(b => b.classList.remove('active'));
  filteredProperties = [...allProperties];
  mobileExpanded = false;
  desktopExpanded = false;
  document.getElementById('properties-sort').value = '';
  currentSort = '';
  renderProperties();
  updateFilterHint();
  updateFilterCount();
}

function applySorting() {
  const sortEl = document.getElementById('properties-sort');
  currentSort = sortEl.value;

  if (!currentSort) {
    renderProperties();
    return;
  }

  const sorted = [...filteredProperties];

  switch(currentSort) {
    case 'price-low':
      sorted.sort((a, b) => a.rent - b.rent);
      break;
    case 'price-high':
      sorted.sort((a, b) => b.rent - a.rent);
      break;
    case 'newest':
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'area-small':
      sorted.sort((a, b) => a.size - b.size);
      break;
    case 'area-large':
      sorted.sort((a, b) => b.size - a.size);
      break;
  }

  filteredProperties = sorted;
  mobileExpanded = false;
  desktopExpanded = false;
  renderProperties();
}

function updateFilterHint(layout, rentMin, rentMax) {
  const hint = document.getElementById('filter-active-hint');
  if (!hint) return;
  const parts = [];
  if (selectedDistricts.length > 0) parts.push(selectedDistricts.join('、'));
  layout = layout ?? document.getElementById('filter-layout')?.value ?? '';
  rentMin = rentMin ?? (parseInt(document.getElementById('filter-rent-min')?.value) || 0);
  rentMax = rentMax ?? (parseInt(document.getElementById('filter-rent-max')?.value) || Infinity);
  if (layout) parts.push(layout);
  if (selectedTypes.length > 0) parts.push(selectedTypes.join('、'));
  if (rentMin > 0) parts.push(`租金 $${rentMin.toLocaleString()}+`);
  if (rentMax < Infinity) parts.push(`租金 ≤ $${rentMax.toLocaleString()}`);
  if (activeTagFilters.length > 0) parts.push(activeTagFilters.join('、'));
  const kw = (document.getElementById('filter-keyword')?.value || '').trim();
  if (kw) parts.push(`關鍵字：${kw}`);
  hint.textContent = parts.length > 0 ? `篩選中：${parts.join(' · ')}` : '';
}

// ===== RENDER PROPERTIES =====
const MOBILE_INITIAL_COUNT = 8;
const DESKTOP_INITIAL_COUNT = 12;
let mobileExpanded = false;
let desktopExpanded = false;

function renderProperties() {
  const grid = document.getElementById('properties-grid');
  const count = document.getElementById('prop-count');
  count.textContent = filteredProperties.length;
  const statCount = document.getElementById('stat-count');
  if (statCount) statCount.textContent = allProperties.length;

  // Remove existing expand buttons
  ['mobile-expand-btn', 'desktop-expand-btn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  if (filteredProperties.length === 0) {
    mobileExpanded = false;
    desktopExpanded = false;
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="icon">🏠</div>
        <h3>目前沒有符合的物件</h3>
        <p>可以放寬租金或需求，或直接告訴米米你的條件。</p>
        <a href="#appointment" class="btn btn-primary">📝 留下需求</a>
      </div>`;
    return;
  }

  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    const needsToggle = filteredProperties.length > MOBILE_INITIAL_COUNT;
    const visible = (needsToggle && !mobileExpanded)
      ? filteredProperties.slice(0, MOBILE_INITIAL_COUNT)
      : filteredProperties;
    grid.innerHTML = visible.map(p => renderPropertyCardMobile(p)).join('');
    if (needsToggle) {
      const btn = document.createElement('div');
      btn.id = 'mobile-expand-btn';
      btn.innerHTML = `
        <button onclick="toggleMobileExpand()" class="prop-expand-btn">
          ${mobileExpanded ? '收合物件' : '展開看全部物件'}
        </button>
        <p class="prop-expand-hint">找到喜歡的物件後，可加入比較或直接預約看屋。</p>`;
      grid.parentElement.insertBefore(btn, grid.nextSibling);
    }
  } else {
    const needsToggle = filteredProperties.length > DESKTOP_INITIAL_COUNT;
    const visible = (needsToggle && !desktopExpanded)
      ? filteredProperties.slice(0, DESKTOP_INITIAL_COUNT)
      : filteredProperties;
    grid.innerHTML = visible.map(p => renderPropertyCard(p)).join('');
    if (needsToggle) {
      const btn = document.createElement('div');
      btn.id = 'desktop-expand-btn';
      btn.innerHTML = `
        <button onclick="toggleDesktopExpand()" class="prop-expand-btn prop-expand-btn--desktop">
          ${desktopExpanded ? '收合物件' : '查看全部物件'}
        </button>
        <p class="prop-expand-hint prop-expand-hint--desktop">想找更符合的房子？也可以直接留下需求讓米米協助。</p>`;
      grid.parentElement.insertBefore(btn, grid.nextSibling);
    }
  }
}

function toggleMobileExpand() {
  mobileExpanded = !mobileExpanded;
  renderProperties();
  if (!mobileExpanded) {
    document.getElementById('properties').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function toggleDesktopExpand() {
  desktopExpanded = !desktopExpanded;
  renderProperties();
  if (!desktopExpanded) {
    document.getElementById('properties').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderPropertyCard(p) {
  const coverImg = getCoverImage(p);
  const imgHtml = coverImg
    ? `<img src="${coverImg}" alt="${escHtml(p.title)}" loading="lazy" />`
    : `<div class="property-img-placeholder"><div class="icon">🏠</div><div>暫無照片</div></div>`;

  const inCompare = compareList.some(c => c.id === p.id);
  const tags = (p.tags || []).slice(0, 5).map(t => `<span class="tag">${escHtml(t)}</span>`).join('');

  const recBadges = (p.recommendCategories || []).map(c =>
    `<span class="rec-badge">${escHtml(c)}</span>`
  ).join('');

  return `
    <div class="property-card" id="card-${p.id}">
      <div class="property-card-img">
        ${imgHtml}
        ${recBadges ? `<div class="rec-badges-wrap">${recBadges}</div>` : ''}
      </div>
      <div class="property-card-body">
        <div class="property-title">${escHtml(p.title)}</div>
        <div class="property-meta">
          <span class="property-meta-item">📍 ${escHtml(p.district)}</span>
          <span class="property-meta-item dot">·</span>
          <span class="property-meta-item">${escHtml(p.layout)}</span>
          <span class="property-meta-item dot">·</span>
          <span class="property-meta-item">${p.size} 坪</span>
          ${p.floor ? `<span class="property-meta-item dot">·</span><span class="property-meta-item">${escHtml(p.floor)}${p.totalFloors ? '/'+p.totalFloors : ''}F</span>` : ''}
          <span class="property-meta-item dot">·</span>
          <span class="property-meta-item">${escHtml(p.type)}</span>
        </div>
        <div class="property-rent">NT$ ${p.rent.toLocaleString()} <span>/ 月</span></div>
        <div class="property-tags">${tags}</div>
        <div class="property-highlight">${escHtml(p.highlights || '')}</div>
        <div class="property-actions">
          <button class="btn btn-primary btn-sm" onclick="openDetailModal('${p.id}')">查看詳情</button>
          <button class="btn btn-outline btn-sm compare-btn-${p.id}" onclick="toggleCompare('${p.id}')">${inCompare ? '✓ 已加入' : '比較'}</button>
          <button class="btn btn-ghost btn-sm" onclick="goToAppt('${escHtml(p.title)}')">預約看屋</button>
        </div>
      </div>
    </div>`;
}

// 手機版橫式小卡片
function renderPropertyCardMobile(p) {
  const coverImg = getCoverImage(p);
  const imgHtml = coverImg
    ? `<img src="${coverImg}" alt="${escHtml(p.title)}" loading="lazy" />`
    : `<div class="property-img-placeholder-mobile"><div class="icon">🏠</div></div>`;

  const inCompare = compareList.some(c => c.id === p.id);

  // 最多 3 個標籤，超過顯示 +N；排除「衛浴乾濕分離」，優先顯示短標籤
  const filteredTags = (p.tags || []).filter(t => t !== '衛浴乾濕分離').sort((a, b) => a.length - b.length);
  const tagsArr = filteredTags.slice(0, 3);
  const tagsDisplay = tagsArr.length > 0
    ? tagsArr.map(t => `<span class="tag-mobile">${escHtml(t)}</span>`).join('') +
      (tagsArr.length < filteredTags.length ? `<span class="tag-more">+${filteredTags.length - 3}</span>` : '')
    : '';

  const recBadges = (p.recommendCategories || []).map(c =>
    `<span class="rec-badge-mobile">${escHtml(c)}</span>`
  ).join('');

  return `
    <div class="property-card-mobile" id="card-${p.id}">
      <div class="property-card-mobile-img">
        ${imgHtml}
        ${recBadges ? `<div class="rec-badges-wrap-mobile">${recBadges}</div>` : ''}
      </div>
      <div class="property-card-mobile-body">
        <div class="property-title-mobile">${escHtml(p.title)}</div>
        <div class="property-meta-rent-row">
          <div class="property-rent-mobile">NT$ ${p.rent.toLocaleString()}</div>
          <div class="property-meta-mobile">📍 ${escHtml(p.district)} · ${escHtml(p.layout)} · ${p.size} 坪</div>
        </div>
        <div class="property-highlight-mobile">${escHtml((p.highlights || '').slice(0, 40))}${(p.highlights || '').length > 40 ? '...' : ''}</div>
        <div class="property-tags-mobile">${tagsDisplay}</div>
        <div class="property-actions-mobile">
          <button class="btn-mobile-action" onclick="openDetailModal('${p.id}')">查看</button>
          <button class="btn-mobile-action compare-btn-${p.id}" onclick="toggleCompare('${p.id}')">${inCompare ? '✓' : '比較'}</button>
          <button class="btn-mobile-action" onclick="goToAppt('${escHtml(p.title)}')">預約</button>
        </div>
      </div>
    </div>`;
}

function getCoverImage(p) {
  if (!p.images || p.images.length === 0) return null;
  const idx = Math.min(p.coverIndex || 0, p.images.length - 1);
  return p.images[idx];
}

// ===== DETAIL MODAL =====
function openDetailModal(id) {
  const p = allProperties.find(x => x.id === id);
  if (!p) return;
  currentDetailId = id;
  savedScrollPosition = window.scrollY;

  const body = document.getElementById('detail-modal-body');
  const imgs = p.images || [];
  const hasVideo = !!p.video;
  let galleryHtml = '';

  // 準備主顯示內容（照片或影片）
  let mainDisplayHtml = '';
  if (imgs.length > 0) {
    mainDisplayHtml = `<img class="detail-main-img" id="detail-main-img" src="${imgs[Math.min(p.coverIndex||0, imgs.length-1)]}" alt="${escHtml(p.title)}" style="cursor:zoom-in;" onclick="openMediaLightbox(allProperties.find(x => x.id === '${id}'))" />`;
  } else if (hasVideo) {
    mainDisplayHtml = `<video id="detail-main-img" width="100%" height="300" controls style="display:block;width:100%;background:#000;"><source src="${p.video}" />你的瀏覽器不支援影片播放</video>`;
  } else {
    mainDisplayHtml = `<div class="detail-no-img"><div class="icon">🏠</div><div>暫無照片</div></div>`;
  }

  // 準備縮略圖列表（包含影片）
  let thumbnailsHtml = '';
  if ((imgs.length + (hasVideo ? 1 : 0)) > 1) {
    const allItems = [];

    // 加入照片
    imgs.forEach((img, i) => {
      allItems.push(`<img class="detail-thumb" src="${img}" onclick="openMediaLightbox(allProperties.find(x => x.id === '${id}'), ${i})" />`);
    });

    // 加入影片
    if (hasVideo) {
      allItems.push(`<div class="detail-thumb" onclick="openMediaLightbox(allProperties.find(x => x.id === '${id}'), ${imgs.length})" style="background:#000;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:4px;"><span style="color:#fff;font-size:24px;">▶</span></div>`);
    }

    thumbnailsHtml = `<div class="detail-thumbnails">${allItems.join('')}</div>`;
  }

  if (mainDisplayHtml) {
    galleryHtml = `
      <div class="detail-gallery">
        ${mainDisplayHtml}
        ${thumbnailsHtml}
      </div>`;
  } else {
    galleryHtml = `
      <div class="detail-gallery">
        <div class="detail-no-img"><div class="icon">🏠</div><div>暫無照片</div></div>
      </div>`;
  }

  // 保存圖片列表到模態框，供 lightbox 使用
  if (imgs.length > 0) {
    window.currentDetailImages = imgs;
  }

  const tags = (p.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('');
  const inCompare = compareList.some(c => c.id === id);

  body.innerHTML = `
    ${galleryHtml}
    <div class="detail-title-mobile" style="padding:12px 0 8px;border-bottom:1px solid var(--color-border);margin-bottom:16px;">${escHtml(p.title)}</div>
    <div class="detail-info-grid">
      <div class="detail-info-item full">
        <span class="detail-info-label">租金</span>
        <span class="detail-rent-big">NT$ ${p.rent.toLocaleString()} <span style="font-size:15px;font-weight:400;color:var(--color-text-muted);">/ 月</span></span>
      </div>
      <div class="detail-meta-row">
        <div class="detail-info-item">
          <span class="detail-info-label">地區</span>
          <span class="detail-info-value">📍 ${escHtml(p.district)}</span>
        </div>
        <div class="detail-info-item">
          <span class="detail-info-label">格局</span>
          <span class="detail-info-value">${escHtml(p.layout)}</span>
        </div>
        <div class="detail-info-item">
          <span class="detail-info-label">坪數</span>
          <span class="detail-info-value">${p.size} 坪</span>
        </div>
        ${p.floor ? `<div class="detail-info-item">
          <span class="detail-info-label">樓層</span>
          <span class="detail-info-value">${escHtml(p.floor)}${p.totalFloors ? ' / 共 '+p.totalFloors+' 樓' : ''}</span>
        </div>` : ''}
        <div class="detail-info-item">
          <span class="detail-info-label">類型</span>
          <span class="detail-info-value">${escHtml(p.type)}</span>
        </div>
      </div>
      ${p.address ? `
      <div class="detail-info-item full">
        <span class="detail-info-label">大略位置</span>
        <span class="detail-info-value" style="font-size:15px;">📍 ${escHtml(maskAddress(p.address))}</span>
      </div>` : ''}
      ${p.nearbyLandmarks ? `
      <div class="detail-info-item full">
        <span class="detail-info-label">附近商圈 / 地標</span>
        <span class="detail-info-value" style="font-size:15px;">${escHtml(p.nearbyLandmarks)}</span>
      </div>` : ''}
    </div>
    ${tags ? `<div class="detail-section"><div class="detail-section-title">特色標籤</div><div style="display:flex;flex-wrap:wrap;gap:6px;">${tags}</div></div>` : ''}
    ${p.highlights ? `<div class="detail-section"><div class="detail-section-title">物件重點</div><div class="detail-text">${escHtml(p.highlights)}</div></div>` : ''}
    ${p.pros ? `<div class="detail-section"><div class="detail-section-title">✅ 優點</div><div class="detail-text detail-pros">${escHtml(p.pros)}</div></div>` : ''}
    ${p.cons ? `<div class="detail-section"><div class="detail-section-title">⚠️ 注意事項</div><div class="detail-text detail-cons">${escHtml(p.cons)}</div></div>` : ''}
    <div class="detail-company-note">
      <div>⌂ 生活尋家租賃管理顧問有限公司</div>
      <div>▸ 台中市西屯區至善路93號</div>
      <div>經紀業證號｜趙修平（113）南市字第00966號</div>
      <div>營業員證號｜（115）登字第506668號</div>
      <div>※ 成交時收取租金 50% 服務費</div>
    </div>
  `;

  const compareBtn = document.getElementById('detail-compare-btn');
  compareBtn.textContent = inCompare ? '✓ 已加入比較' : '加入比較';
  compareBtn.onclick = () => {
    toggleCompare(id);
    const nowIn = compareList.some(c => c.id === id);
    compareBtn.textContent = nowIn ? '✓ 已加入比較' : '加入比較';
  };

  document.getElementById('detail-appt-btn').onclick = () => {
    closeDetailModal();
    goToAppt(p.title);
  };

  document.getElementById('detail-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function shareProperty() {
  const p = allProperties.find(x => x.id === currentDetailId);
  if (!p) return;
  const shareUrl = `${location.origin}${location.pathname}?prop=${p.id}`;
  if (navigator.share) {
    navigator.share({ title: p.title, text: `NT$${p.rent.toLocaleString()}/月｜${p.district}`, url: shareUrl });
  } else {
    navigator.clipboard.writeText(shareUrl).then(() => showToast('連結已複製！', 'success'));
  }
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.add('hidden');
  document.body.style.overflow = '';
  currentDetailId = null;
  window.scrollTo(0, savedScrollPosition);
}

function switchDetailImg(el, src, type = 'image') {
  const mainImg = document.getElementById('detail-main-img');
  const gallery = document.querySelector('.detail-gallery');

  if (type === 'video') {
    // 換成影片
    const videoHtml = `<video id="detail-main-img" width="100%" height="300" controls style="display:block;width:100%;background:#000;"><source src="${src}" />你的瀏覽器不支援影片播放</video>`;
    gallery.innerHTML = videoHtml + gallery.innerHTML.substring(gallery.innerHTML.indexOf('<div class="detail-thumbnails">'));
  } else {
    // 換成照片
    if (mainImg.tagName === 'VIDEO') {
      const imgHtml = `<img class="detail-main-img" id="detail-main-img" src="${src}" style="cursor:zoom-in;" />`;
      gallery.innerHTML = imgHtml + gallery.innerHTML.substring(gallery.innerHTML.indexOf('<div class="detail-thumbnails">'));

      // 為新的圖片元素添加點擊事件
    } else {
      mainImg.src = src;
    }
  }

  document.querySelectorAll('.detail-thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}


// ===== 媒體輪播系統（照片+影片） =====
let mediaLightboxState = {
  items: [],
  currentIndex: 0,
  touchStartX: 0,
  isPlaying: false,
  keyHandlerRef: null,
  touchStartRef: null,
  touchEndRef: null
};

function openMediaLightbox(property, startIndex = 0) {
  if (!property) return;

  // 先移除舊的事件監聽器（如果存在）
  closeMediaLightbox();

  const images = property.images || [];
  const video = property.video || null;

  // 建立媒體陣列：照片 + 影片
  mediaLightboxState.items = [
    ...images.map(src => ({ type: 'image', src })),
    ...(video ? [{ type: 'video', src: video }] : [])
  ];

  if (mediaLightboxState.items.length === 0) return;

  mediaLightboxState.currentIndex = Math.min(startIndex, mediaLightboxState.items.length - 1);
  mediaLightboxState.isPlaying = false;

  // 顯示 Lightbox
  const overlay = document.getElementById('media-lightbox');
  overlay.classList.remove('hidden');

  // 繪製當前媒體
  renderMediaLightbox();

  // 綁定事件 - 保存引用以便後續移除
  mediaLightboxState.keyHandlerRef = mediaLightboxKeyHandler;
  mediaLightboxState.touchStartRef = mediaLightboxTouchStart;
  mediaLightboxState.touchEndRef = mediaLightboxTouchEnd;

  document.addEventListener('keydown', mediaLightboxState.keyHandlerRef);
  overlay.addEventListener('touchstart', mediaLightboxState.touchStartRef, false);
  overlay.addEventListener('touchend', mediaLightboxState.touchEndRef, false);
}

function renderMediaLightbox() {
  const item = mediaLightboxState.items[mediaLightboxState.currentIndex];
  const overlay = document.getElementById('media-lightbox');

  // 清空所有容器
  document.getElementById('media-lightbox-img').classList.add('hidden');
  document.getElementById('media-lightbox-video-wrapper').classList.add('hidden');
  document.getElementById('media-lightbox-youtube-wrapper').classList.add('hidden');

  if (item.type === 'image') {
    const img = document.getElementById('media-lightbox-img');
    img.src = item.src;
    img.classList.remove('hidden');
  } else if (item.type === 'video') {
    const videoWrapper = document.getElementById('media-lightbox-video-wrapper');
    const video = document.getElementById('media-lightbox-video');
    const source = document.getElementById('media-lightbox-video-source');

    // 檢測是否為 YouTube 網址
    const youtubeMatch = item.src.match(/(?:youtube\.com|youtu\.be)\/(?:embed\/|v\/|watch\?v=)?([^&\n?#]+)/);

    if (youtubeMatch) {
      // YouTube 影片
      const ytWrapper = document.getElementById('media-lightbox-youtube-wrapper');
      const ytFrame = document.getElementById('media-lightbox-youtube');
      ytFrame.src = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
      ytWrapper.classList.remove('hidden');
    } else {
      // 本地影片
      source.src = item.src;
      video.load();
      videoWrapper.classList.remove('hidden');
    }
  }

  // 更新計數器
  const counter = document.getElementById('media-lightbox-counter');
  counter.textContent = `${mediaLightboxState.currentIndex + 1} / ${mediaLightboxState.items.length}`;

  // 更新箭頭按鈕是否可用
  updateMediaLightboxArrows();
}

function updateMediaLightboxArrows() {
  const prevBtn = document.querySelector('.media-lightbox-prev');
  const nextBtn = document.querySelector('.media-lightbox-next');

  // 禁用/啟用按鈕（無循環）
  prevBtn.style.opacity = mediaLightboxState.currentIndex === 0 ? '0.3' : '1';
  nextBtn.style.opacity = mediaLightboxState.currentIndex === mediaLightboxState.items.length - 1 ? '0.3' : '1';
  prevBtn.style.pointerEvents = mediaLightboxState.currentIndex === 0 ? 'none' : 'auto';
  nextBtn.style.pointerEvents = mediaLightboxState.currentIndex === mediaLightboxState.items.length - 1 ? 'none' : 'auto';
}

function prevMediaItem() {
  if (mediaLightboxState.currentIndex > 0) {
    stopMediaPlayback();
    mediaLightboxState.currentIndex--;
    renderMediaLightbox();
  }
}

function nextMediaItem() {
  if (mediaLightboxState.currentIndex < mediaLightboxState.items.length - 1) {
    stopMediaPlayback();
    mediaLightboxState.currentIndex++;
    renderMediaLightbox();
  }
}

function stopMediaPlayback() {
  const video = document.getElementById('media-lightbox-video');
  if (video) {
    video.pause();
    video.currentTime = 0;
  }
}

function closeMediaLightbox(event) {
  if (event) event.stopPropagation();
  stopMediaPlayback();
  const overlay = document.getElementById('media-lightbox');
  overlay.classList.add('hidden');

  // 移除事件監聽器
  if (mediaLightboxState.keyHandlerRef) {
    document.removeEventListener('keydown', mediaLightboxState.keyHandlerRef);
    mediaLightboxState.keyHandlerRef = null;
  }
  if (mediaLightboxState.touchStartRef) {
    overlay.removeEventListener('touchstart', mediaLightboxState.touchStartRef);
    mediaLightboxState.touchStartRef = null;
  }
  if (mediaLightboxState.touchEndRef) {
    overlay.removeEventListener('touchend', mediaLightboxState.touchEndRef);
    mediaLightboxState.touchEndRef = null;
  }
}

function mediaLightboxKeyHandler(e) {
  if (e.key === 'Escape') closeMediaLightbox();
  if (e.key === 'ArrowLeft') prevMediaItem();
  if (e.key === 'ArrowRight') nextMediaItem();
}

function mediaLightboxTouchStart(e) {
  mediaLightboxState.touchStartX = e.touches[0].clientX;
}

function mediaLightboxTouchEnd(e) {
  const touchEndX = e.changedTouches[0].clientX;
  const diff = mediaLightboxState.touchStartX - touchEndX;

  // 向左滑（下一張）
  if (diff > 50) {
    nextMediaItem();
  }
  // 向右滑（上一張）
  else if (diff < -50) {
    prevMediaItem();
  }
}

// 舊的 GLightbox 函數（保留相容性）

// ===== COMPARE =====
function toggleCompare(id) {
  const p = allProperties.find(x => x.id === id);
  if (!p) return;

  const idx = compareList.findIndex(c => c.id === id);
  if (idx >= 0) {
    compareList.splice(idx, 1);
    showToast(`已從比較清單移除「${p.title.slice(0,12)}...」`, 'info');
  } else {
    if (compareList.length >= 3) {
      showToast('最多只能比較 3 個物件，請先移除一個', 'error');
      return;
    }
    compareList.push(p);
    showToast(`已加入比較：${p.title.slice(0,12)}...`, 'success');
  }

  updateCompareBar();
  updateCompareButtons();
}

function updateCompareBar() {
  const bar = document.getElementById('compare-bar');
  const items = document.getElementById('compare-bar-items');
  const countText = document.getElementById('compare-count-text');
  const startBtn = document.getElementById('compare-start-btn');

  if (compareList.length === 0) {
    bar.classList.remove('show');
    return;
  }

  bar.classList.add('show');
  countText.textContent = `已選 ${compareList.length} 件`;
  items.innerHTML = compareList.map(p => `
    <div class="compare-bar-item">
      <span>${p.title.slice(0,14)}${p.title.length > 14 ? '...' : ''}</span>
      <button class="compare-bar-remove" onclick="toggleCompare('${p.id}')">✕</button>
    </div>`).join('');

  if (compareList.length < 2) {
    startBtn.disabled = true;
    startBtn.title = '請至少選擇 2 個物件';
  } else {
    startBtn.disabled = false;
    startBtn.title = '';
  }
}

function updateCompareButtons() {
  document.querySelectorAll('[class*="compare-btn-"]').forEach(btn => {
    const cls = [...btn.classList].find(c => c.startsWith('compare-btn-'));
    if (!cls) return;
    const id = cls.replace('compare-btn-', '');
    const inCompare = compareList.some(c => c.id === id);
    btn.textContent = inCompare ? '✓ 已加入' : '比較';
    btn.classList.toggle('btn-primary', inCompare);
    btn.classList.toggle('btn-outline', !inCompare);
  });
}

function clearCompare() {
  compareList = [];
  updateCompareBar();
  updateCompareButtons();
}

function openCompareModal() {
  if (compareList.length < 2) {
    showToast('請至少選擇 2 個物件才能比較', 'error');
    return;
  }

  const n = compareList.length;
  const body = document.getElementById('compare-modal-body');

  // ── winner detection ──
  function winner(vals, lowerIsBetter = false) {
    const nums = vals.map(v => typeof v === 'number' ? v : null);
    if (nums.some(v => v === null)) return null;
    const best = lowerIsBetter ? Math.min(...nums) : Math.max(...nums);
    const ws = nums.reduce((a, v, i) => v === best ? [...a, i] : a, []);
    return ws.length === 1 ? ws[0] : null;
  }
  const rentWinner = winner(compareList.map(p => p.rent), true);
  const sizeWinner = winner(compareList.map(p => p.size || 0));
  const tagsWinner = winner(compareList.map(p => (p.tags || []).length));
  const crown  = (i, w) => w === i ? '<span class="cg-crown">👑</span>' : '';
  const winCls = (i, w) => w === i ? 'cg-winner' : '';

  // ── mobile: card layout ──
  if (window.innerWidth <= 768) {
    const cards = compareList.map((p, i) => {
      const img = getCoverImage(p);
      const tags = (p.tags || []);
      const tagHtml = tags.map(t => `<span class="tag" style="font-size:12px">${escHtml(t)}</span>`).join('') || '—';
      const isRentWinner = rentWinner === i;
      const isSizeWinner = sizeWinner === i;
      const isTagsWinner = tagsWinner === i;
      // 把 • 開頭的每行變成 flex 結構，確保 • 固定在最左
      function bulletLines(text) {
        if (!text) return '—';
        return text.split('\n').map(line => {
          const m = line.match(/^([•·▸\-]\s?)(.*)/);
          if (m) return `<div class="cmp-pros-line"><span class="cmp-bullet">•</span><span>${escHtml(m[2])}</span></div>`;
          return line ? `<div class="cmp-pros-line"><span class="cmp-bullet">•</span><span>${escHtml(line)}</span></div>` : '';
        }).join('');
      }
      const fields = [
        { label:'地區',     val:`📍 ${escHtml(p.district||'—')}` },
        { label:'格局',     val:escHtml(p.layout||'—') },
        { label:'坪數',     val:p.size ? p.size+' 坪':'—', winner:isSizeWinner },
        { label:'樓層',     val:p.floor ? escHtml(p.floor)+(p.totalFloors ? '/'+p.totalFloors+'F':'F') : '—' },
        { label:'類型',     val:escHtml(p.type||'—') },
        { label:'租金',     val:`NT$ ${p.rent.toLocaleString()} / 月`, winner:isRentWinner },
        { label:'大略位置', val:p.address ? '📍 '+escHtml(maskAddress(p.address)):'—' },
        { label:'附近商圈', val:escHtml(p.nearbyLandmarks||'—') },
        { label:'標籤',     val:tagHtml, isHtml:true, winner:isTagsWinner },
        { label:'物件重點', val:escHtml(p.highlights||'—') },
        { label:'✅ 優點',  val:bulletLines(p.pros), isHtml:true, cls:'cg-pros' },
        { label:'⚠️ 注意', val:bulletLines(p.cons), isHtml:true, cls:'cg-cons' },
      ];
      return `<div class="cmp-card">
        ${img ? `<img class="cmp-card-img" src="${img}" alt="" />` : `<div class="cmp-card-no-img">🏠</div>`}
        <div class="cmp-card-title">${isRentWinner ? '👑 ' : ''}${escHtml(p.title)}</div>
        <div class="cmp-card-rent">${isRentWinner ? '👑 ' : ''}NT$ ${p.rent.toLocaleString()} / 月</div>
        <div class="cmp-card-fields">
          ${fields.map(f => `
            <div class="cmp-card-field ${f.winner ? 'cg-winner':''} ${f.cls||''}">
              <span class="cmp-card-field-label">${f.label}</span>
              <span class="cmp-card-field-val">${f.winner ? '👑 ':''}${f.isHtml ? f.val : f.val}</span>
            </div>`).join('')}
        </div>
        <button class="btn btn-primary btn-sm btn-full" style="margin-top:14px;" onclick="closeCompareModal();goToAppt('${escHtml(p.title)}')">📅 預約看屋</button>
        <button class="cg-remove-btn" style="margin-top:6px;width:100%;" onclick="removeFromCompareAndRefresh('${p.id}')">✕ 移除此物件</button>
      </div>`;
    }).join('');
    body.innerHTML = `
      <p style="font-size:12px;color:var(--color-text-muted);margin-bottom:10px;">👑 皇冠 = 該項目最優　左右滑動可查看所有物件</p>
      <div class="cmp-cards-scroll">${cards}</div>`;
    document.getElementById('compare-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    return;
  }

  // ── desktop grid column sizing: minmax(0,1fr) so all N cols fit evenly ──
  const gridCols = `110px repeat(${n}, minmax(0, 1fr))`;

  // ── header cards ──
  const headerCards = compareList.map((p, i) => {
    const img = getCoverImage(p);
    const isLast = i === n - 1;
    const imagesJson = JSON.stringify(p.images || []);
    return `<div class="cg-header-card${isLast ? ' cg-last' : ''}">
      ${img
        ? `<img class="cg-header-img" src="${img}" alt="" style="cursor:zoom-in" data-images='${imagesJson}' />`
        : `<div class="cg-header-no-img">🏠</div>`}
      <div class="cg-header-info">
        <div class="cg-header-title">${escHtml(p.title)}</div>
        <div class="cg-header-rent">${crown(i, rentWinner)}NT$&nbsp;${p.rent.toLocaleString()}&nbsp;/&nbsp;月</div>
        <button class="cg-remove-btn" onclick="removeFromCompareAndRefresh('${p.id}')">✕ 移除</button>
      </div>
    </div>`;
  }).join('');

  // ── row builders ──
  function sec(title) {
    return `<div class="cg-sec">${title}</div>`;
  }
  // Short text row (no-wrap)
  function shortRow(label, makeVal, makeCls) {
    const cells = compareList.map((p, i) => {
      const cls = (makeCls ? makeCls(i) : '') + (i === n-1 ? ' cg-last' : '');
      return `<div class="cg-cell ${cls}"><span class="cg-nowrap">${makeVal(p, i)}</span></div>`;
    }).join('');
    return `<div class="cg-label">${label}</div>${cells}`;
  }
  // Long text row (wraps, left-aligned)
  function textRow(label, makeVal, extraCls = '') {
    const cells = compareList.map((p, i) => {
      const last = i === n-1 ? ' cg-last' : '';
      return `<div class="cg-cell cg-text ${extraCls}${last}">${makeVal(p, i)}</div>`;
    }).join('');
    return `<div class="cg-label">${label}</div>${cells}`;
  }
  // Tags row
  function tagsRow() {
    const cells = compareList.map((p, i) => {
      const tags = p.tags || [];
      const tagsHtml = tags.length
        ? tags.map(t => `<span class="tag" style="font-size:12px">${escHtml(t)}</span>`).join('')
        : '<span style="color:var(--color-text-muted)">—</span>';
      const cls = winCls(i, tagsWinner) + (i === n-1 ? ' cg-last' : '');
      return `<div class="cg-cell ${cls}">${crown(i, tagsWinner)}<div class="cg-tags">${tagsHtml}</div></div>`;
    }).join('');
    return `<div class="cg-label">標籤</div>${cells}`;
  }
  // Action row
  function actionRow() {
    const cells = compareList.map((p, i) => {
      const last = i === n-1 ? ' cg-last' : '';
      return `<div class="cg-cell cg-action${last}">
        <button class="btn btn-primary btn-sm btn-full" onclick="closeCompareModal();goToAppt('${escHtml(p.title)}')">📅 預約看屋</button>
      </div>`;
    }).join('');
    return `<div class="cg-label"></div>${cells}`;
  }

  // ── assemble ──
  body.innerHTML = `
    <div class="cg-border">
      <div class="cg-wrap">
      <div class="cg-grid" style="grid-template-columns:${gridCols}">
        <div class="cg-header-blank"></div>
        ${headerCards}

        ${sec('基本資訊')}
        ${shortRow('地區',   p => `📍&nbsp;${escHtml(p.district||'—')}`)}
        ${shortRow('格局',   p => escHtml(p.layout||'—'))}
        ${shortRow('坪數',   (p,i) => `${crown(i,sizeWinner)}${p.size ? p.size+'&nbsp;坪' : '—'}`, i => winCls(i,sizeWinner))}
        ${shortRow('樓層',   p => p.floor ? escHtml(p.floor)+(p.totalFloors ? '/'+p.totalFloors+'F':'F') : '—')}
        ${shortRow('類型',   p => escHtml(p.type||'—'))}
        ${shortRow('租金',   (p,i) => `${crown(i,rentWinner)}NT$&nbsp;${p.rent.toLocaleString()}&nbsp;/&nbsp;月`, i => winCls(i,rentWinner))}

        ${sec('地點')}
        ${textRow('大略位置', p => p.address ? `📍 ${escHtml(maskAddress(p.address))}` : '—')}
        ${textRow('附近商圈', p => escHtml(p.nearbyLandmarks||'—'))}

        ${sec('特色標籤')}
        ${tagsRow()}

        ${sec('物件說明')}
        ${textRow('物件重點', p => escHtml(p.highlights||'—').replace(/\n/g,'<br>'))}
        ${textRow('✅ 優點',  p => escHtml(p.pros||'—').replace(/\n/g,'<br>'), 'cg-pros')}
        ${textRow('⚠️ 注意', p => escHtml(p.cons||'—').replace(/\n/g,'<br>'), 'cg-cons')}

        ${sec('操作')}
        ${actionRow()}
      </div>
      </div>
    </div>
    <p class="cg-legend">👑 皇冠代表該項目最優（租金最低 / 坪數最大 / 標籤最多）</p>`;

  // 為比較 modal 中的圖片添加點擊事件打開 PhotoSwipe（事件委託）
  const compareModal = document.getElementById('compare-modal');
  compareModal.addEventListener('click', (e) => {
  });

  document.getElementById('compare-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function removeFromCompareAndRefresh(id) {
  toggleCompare(id);
  if (compareList.length < 2) {
    closeCompareModal();
  } else {
    openCompareModal();
  }
}

function closeCompareModal() {
  document.getElementById('compare-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ===== APPOINTMENT =====
function goToAppt(propertyTitle) {
  document.getElementById('appt-property').value = propertyTitle || '';
  const apptSection = document.getElementById('appointment');
  apptSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => {
    document.getElementById('appt-name').focus();
  }, 600);
}

function initAppointmentForm() {
  const form = document.getElementById('appt-form');
  const dateInput = document.getElementById('appt-date');
  const timeSelect = document.getElementById('appt-time');

  // 當日期改變時，更新可用時間
  dateInput.addEventListener('change', updateAvailableTimeSlots);

  // 當時間改變時，檢查是否與前一位相鄰
  timeSelect.addEventListener('change', () => {
    const selectedOption = timeSelect.options[timeSelect.selectedIndex];
    const adjacentWarning = document.getElementById('adjacent-time-warning');

    if (selectedOption && selectedOption.dataset.adjacentToPrev === 'true') {
      if (!adjacentWarning) {
        const warning = document.createElement('div');
        warning.id = 'adjacent-time-warning';
        warning.style.cssText = 'background:#ffe0e0;border:1px solid #ff6b6b;color:#c92a2a;padding:12px;border-radius:6px;margin:12px 0;font-size:14px;display:flex;gap:8px;align-items:flex-start;';
        warning.innerHTML = '<div style="flex-shrink:0;font-size:18px;">⚠️</div><div>若行程較緊湊，預約時間可能微調。</div>';
        timeSelect.parentNode.insertAdjacentElement('afterend', warning);
      } else {
        adjacentWarning.style.display = 'block';
      }
    } else if (adjacentWarning) {
      adjacentWarning.style.display = 'none';
    }
  });

  // pet detail show/hide
  document.querySelectorAll('input[name="pet"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const show = document.querySelector('input[name="pet"]:checked').value === '是';
      document.getElementById('pet-detail-row').style.display = show ? 'block' : 'none';
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!(await validateApptForm())) return;

    const hasPet = document.querySelector('input[name="pet"]:checked').value;
    let petDetail = '';
    if (hasPet === '是') {
      const petType = document.getElementById('appt-pet-type').value.trim();
      const petCount = document.getElementById('appt-pet-count').value.trim();
      const petSize = document.getElementById('appt-pet-size').value.trim();
      const petOther = document.getElementById('appt-pet-other').value.trim();
      petDetail = `${petType}${petCount ? ' ' + petCount : ''}${petSize ? ' ' + petSize : ''}${petOther ? ' (' + petOther + ')' : ''}`.trim();
    }

    const data = {
      id: 'appt_' + Date.now(),
      submittedAt: new Date().toISOString(),
      propertyTitle: document.getElementById('appt-property').value.trim(),
      name: document.getElementById('appt-name').value.trim(),
      phone: document.getElementById('appt-phone').value.trim(),
      date: document.getElementById('appt-date').value,
      time: document.getElementById('appt-time').value,
      occupants: document.getElementById('appt-occupants').value.trim(),
      relationship: document.getElementById('appt-relationship').value.trim(),
      occupation: document.getElementById('appt-occupation').value.trim(),
      age: document.getElementById('appt-age').value.trim(),
      moveInDate: document.getElementById('appt-movein').value.trim(),
      hasPet: hasPet,
      petDetail: petDetail,
      smokes: document.querySelector('input[name="smoke"]:checked').value,
      knowsFee: document.querySelector('input[name="knowfee"]:checked').value,
      needsSubsidy: document.querySelector('input[name="subsidy"]:checked').value,
      needsRegistration: document.querySelector('input[name="registration"]:checked').value,
      canProvideProof: document.querySelector('input[name="proof"]:checked').value,
      notes: document.getElementById('appt-notes').value.trim(),
      status: '未處理'
    };

    // 儲存預約到 Supabase
    const { error: apptError } = await db.from('appointments').insert(apptToDb(data));
    if (apptError) { showToast('預約送出失敗：' + (apptError.message || apptError.code || JSON.stringify(apptError)), 'error'); console.error(apptError); return; }

    // 重新載入預約列表
    try {
      const { data: appts } = await db.from('appointments').select('*');
      allAppointments = appts || [];
    } catch(e) {
      console.error('重新載入預約失敗', e);
    }

    const submittedName = document.getElementById('appt-name').value.trim();
    const nameEl = document.getElementById('appt-success-name');
    if (nameEl) nameEl.textContent = submittedName || '您的姓名';
    const nameLineEl = document.getElementById('appt-success-name-line');
    if (nameLineEl) nameLineEl.textContent = submittedName || '您的姓名';

    form.style.display = 'none';
    document.getElementById('appt-success').classList.add('show');
    showToast('預約資料已送出！', 'success');
  });
}

async function validateApptForm() {
  let valid = true;
  const name = document.getElementById('appt-name').value.trim();
  const phone = document.getElementById('appt-phone').value.trim();
  const date = document.getElementById('appt-date').value;
  const time = document.getElementById('appt-time').value;

  // clear errors
  document.querySelectorAll('.form-error').forEach(e => e.classList.remove('show'));

  if (!name) { document.getElementById('err-name').classList.add('show'); valid = false; }
  if (!phone || !/^09\d{8}$/.test(phone)) { document.getElementById('err-phone').classList.add('show'); valid = false; }
  if (!date) { document.getElementById('err-date').classList.add('show'); valid = false; }
  if (!time) { document.getElementById('err-time').classList.add('show'); valid = false; }

  // 📌 直接查詢 Supabase，檢查該時間是否已被預約
  if (valid && date && time) {
    try {
      const { data: booked, error } = await db.from('appointments')
        .select('id')
        .eq('date', date)
        .eq('time', time)
        .limit(1);

      if (error) throw error;

      if (booked && booked.length > 0) {
        showToast('❌ 該時間已被預約，請選擇其他時間', 'error');
        document.getElementById('err-time').classList.add('show');
        valid = false;
      }
    } catch(e) {
      console.error('驗證預約失敗:', e);
      showToast('❌ 驗證失敗，請稍後再試', 'error');
      valid = false;
    }
  }

  return valid;
}

function resetApptForm() {
  document.getElementById('appt-form').reset();
  document.getElementById('appt-form').style.display = '';
  document.getElementById('appt-success').classList.remove('show');
  document.getElementById('pet-detail-row').style.display = 'none';
  document.querySelectorAll('.form-error').forEach(e => e.classList.remove('show'));
}

// ===== MODALS close on overlay click =====
document.getElementById('detail-modal').addEventListener('click', function(e) {
  if (e.target === this) closeDetailModal();
});
document.getElementById('compare-modal').addEventListener('click', function(e) {
  if (e.target === this) closeCompareModal();
});

// ===== MOBILE FILTER TOGGLE =====
function toggleMobileFilter() {
  const panel = document.getElementById('filter-panel');
  const btn   = document.getElementById('filter-toggle-btn');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  const n = getActiveFilterCount();
  btn.innerHTML = `<span>${isOpen ? '✕' : '🔍'}</span> ${isOpen ? '收合篩選' : '快速篩選'}
    <span class="filter-active-count${n > 0 ? ' show' : ''}" id="filter-active-count">${n || ''}</span>`;
}

function getActiveFilterCount() {
  let n = 0;
  if (selectedDistricts.length > 0) n++;
  const layout  = document.getElementById('filter-layout');
  const rentMin = document.getElementById('filter-rent-min');
  const rentMax = document.getElementById('filter-rent-max');
  if (layout  && layout.value)  n++;
  if (rentMin && rentMin.value) n++;
  if (rentMax && rentMax.value) n++;
  n += document.querySelectorAll('.filter-tag-btn.active').length;
  return n;
}

function updateFilterCount() {
  const countEl = document.getElementById('filter-active-count');
  if (!countEl) return;
  const n = getActiveFilterCount();
  countEl.textContent = n || '';
  countEl.classList.toggle('show', n > 0);
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== MASK ADDRESS (前台用) =====
// 只顯示路名，隱藏門牌號碼
function maskAddress(addr) {
  if (!addr) return '';
  // 移除台灣、台中市、區名等行政區資訊
  const stripped = addr
    .replace(/台灣|台中市/g, '')
    .replace(/中區|東區|南區|西區|北區|北屯區|西屯區|南屯區|太平區|大里區|霧峰區|烏日區|豐原區|潭子區|大雅區|沙鹿區|清水區|梧棲區|龍井區|大肚區|大甲區/g, '')
    .trim();

  // 嘗試抓路名（含段落）：XX路、XX街、XX大道、XX段
  const m = stripped.match(/([^\s,，]+(?:路|街|大道|大路)(?:[一二三四五六七八九十百]+段)?)/);
  if (m) return m[1] + ' 附近';

  // fallback：去掉號碼以後的部分
  const final = stripped
    .replace(/\d+號.*/g, '')
    .replace(/[A-Za-z0-9-]+F.*/i, '')
    .trim();
  return final ? final + ' 附近' : '';
}

// ===== UTILS =====
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// make compareList accessible for inline onclick
window.compareList = compareList;

/* ===== 網站回饋中心 ===== */
function openFeedbackCenter() {
  document.getElementById('feedback-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  loadAnnouncements();
}
function closeFeedbackCenter() {
  document.getElementById('feedback-modal').classList.add('hidden');
  document.body.style.overflow = '';
}
function switchFeedbackTab(tab) {
  ['report','announce','wish'].forEach(t => {
    document.getElementById('ftab-' + t).classList.toggle('active', t === tab);
    document.getElementById('fpanel-' + t).classList.toggle('active', t === tab);
  });
  if (tab === 'announce') loadAnnouncements();
}
async function loadAnnouncements() {
  const list = document.getElementById('announce-list');
  list.innerHTML = '<div class="announce-empty">載入中…</div>';
  try {
    const { data, error } = await db.from('feedback_announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    const items = data || [];
    if (!items.length) {
      list.innerHTML = '<div class="announce-empty">目前沒有公告。</div>';
      return;
    }
    list.innerHTML = items.map(a => `
      <div class="announce-item">
        <div class="announce-item-date">${escHtml(a.date)}</div>
        <div class="announce-item-title">${escHtml(a.title)}</div>
        <div class="announce-item-body">${escHtml(a.body)}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error('載入公告失敗', err);
    list.innerHTML = '<div class="announce-empty">公告載入失敗，請稍後再試。</div>';
  }
}
async function submitReport(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = '送出中…'; }
  try {
    const { error } = await db.from('feedback_reports').insert({
      type: document.getElementById('report-type').value,
      description: document.getElementById('report-desc').value,
      prop: document.getElementById('report-prop').value,
      contact: document.getElementById('report-contact').value,
      status: '未處理',
    });
    if (error) throw error;
    document.getElementById('report-form').classList.add('hidden');
    document.getElementById('report-success').classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('report-form').reset();
      document.getElementById('report-form').classList.remove('hidden');
      document.getElementById('report-success').classList.add('hidden');
    }, 3000);
  } catch (err) {
    console.error('送出回報失敗', err);
    alert('送出失敗，請稍後再試 🙏');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '送出回報'; }
  }
}
async function submitWish(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = '送出中…'; }
  try {
    const { error } = await db.from('feedback_wishes').insert({
      type: document.getElementById('wish-type').value,
      content: document.getElementById('wish-content').value,
      contact: document.getElementById('wish-contact').value,
      status: '未處理',
    });
    if (error) throw error;
    document.getElementById('wish-form').classList.add('hidden');
    document.getElementById('wish-success').classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('wish-form').reset();
      document.getElementById('wish-form').classList.remove('hidden');
      document.getElementById('wish-success').classList.add('hidden');
    }, 3000);
  } catch (err) {
    console.error('送出許願失敗', err);
    alert('送出失敗，請稍後再試 🙏');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '送出許願'; }
  }
}

function togglePetDetail() {
  const petRadios = document.querySelectorAll('input[name="pet"]');
  const petDetailRow = document.getElementById('pet-detail-row');
  const isPetYes = Array.from(petRadios).find(r => r.checked)?.value === '是';

  if (petDetailRow) {
    petDetailRow.style.display = isPetYes ? 'block' : 'none';
  }
}

function togglePetSize() {
  const petTypeEl = document.getElementById('appt-pet-type');
  const petSizeFieldEl = document.getElementById('pet-size-field');
  const petSizeEl = document.getElementById('appt-pet-size');

  if (!petSizeFieldEl || !petSizeEl) return;

  const isDog = petTypeEl?.value === '狗狗';
  petSizeFieldEl.style.display = isDog ? 'block' : 'none';
  if (!isDog) petSizeEl.value = '';
}

function togglePetOther() {
  const petTypeEl = document.getElementById('appt-pet-type');
  const petOtherFieldEl = document.getElementById('pet-other-field');
  const petOtherEl = document.getElementById('appt-pet-other');

  if (!petOtherFieldEl) return;

  const isOther = petTypeEl?.value === '其他';
  petOtherFieldEl.style.display = isOther ? 'block' : 'none';
  if (!isOther && petOtherEl) petOtherEl.value = '';
}

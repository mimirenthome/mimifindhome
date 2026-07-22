/* ============================================
   MIMI HOME - ADMIN SCRIPT
   ============================================ */

// 大略位置遮蔽函數（同 script.js）
function maskAddress(addr) {
  if (!addr) return '';
  const m = addr.match(/([^\s,，台中市台灣]+(?:路|街|大道|大路)(?:[一二三四五六七八九十百]+段)?)/);
  if (m) return m[1] + ' 附近';
  const parts = addr.split(/[,，]/)[0].trim().split(/[\s]/)[0];
  return parts || addr;
}

// ===== AUTH (Supabase) =====
function showLoginOverlay() {
  const overlay = document.getElementById('login-overlay');
  if (overlay) overlay.style.display = 'flex';
}
function hideLoginOverlay() {
  const overlay = document.getElementById('login-overlay');
  if (overlay) overlay.style.display = 'none';
  localStorage.setItem('mimi_admin_token', '1');
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = '登入中...';
  errEl.classList.add('hidden');

  try {
    // 先試 Supabase Auth
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (!error) {
      // 成功：auth state change 會接手
      btn.disabled = false;
      btn.textContent = '登入';
      return;
    }
    console.warn('Supabase auth error:', error.message);

    // 備用：本地帳密 mimi / mimi0314（方便測試）
    if ((email === 'mimi' || email === 'mimi.rent.00@gmail.com') && password === 'mimi0314') {
      btn.disabled = false;
      btn.textContent = '登入';
      hideLoginOverlay();
      await initAdmin();
      return;
    }

    errEl.textContent = '帳號或密碼錯誤。（錯誤：' + error.message + '）';
    errEl.classList.remove('hidden');
  } catch(err) {
    console.error('Login exception:', err);
    errEl.textContent = '登入失敗：' + (err.message || '請檢查網路連線');
    errEl.classList.remove('hidden');
  }

  btn.disabled = false;
  btn.textContent = '登入';
  document.getElementById('login-password').value = '';
  document.getElementById('login-password').focus();
}

function toggleLoginPw() {
  const pw = document.getElementById('login-password');
  pw.type = pw.type === 'password' ? 'text' : 'password';
}

async function logout() {
  await db.auth.signOut();
  localStorage.removeItem('mimi_admin_token');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').classList.add('hidden');
  showLoginOverlay();
}

// ===== BOOT =====
let recommendListenersSetup = false;

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    hideLoginOverlay();
    await initAdmin();
  } else {
    showLoginOverlay();
  }
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      hideLoginOverlay();
      await initAdmin();
    } else if (event === 'SIGNED_OUT') {
      showLoginOverlay();
    }
  });
});

const SAMPLE_PROPERTIES = [
  {
    id: 'prop_1',
    title: '北屯區溫馨套房｜近大坑風景區｜可租補可貓',
    district: '北屯區', rent: 8000, layout: '套房', size: 8, type: '套房',
    nearbyLandmarks: '大坑風景區、全聯福利中心、北屯區公所、昌平路商圈',
    highlights: '台水台電計費、網路已安裝。',
    tags: ['可租補', '可貓', '台水台電', '網路'],
    pros: '• 租金實惠，可申請租屋補助\n• 可養貓，寵物友善環境\n• 台水台電，費用透明\n• 網路已安裝，立即可用\n• 鄰近大坑休閒區，環境清幽',
    cons: '• 坪數較小，適合單身或一人居住\n• 無附車位，需自行尋找停車',
    images: [], coverIndex: 0, isActive: true,
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 'prop_2',
    title: '西屯區精緻一房｜近台中港路商圈｜附車位',
    district: '西屯區', rent: 13500, layout: '1房', size: 14, type: '電梯大樓',
    nearbyLandmarks: '台中港路商圈、好市多、大遠百、老虎城購物中心',
    highlights: '附車位、陽台採光佳、變頻冷氣、衛浴乾濕分離。',
    tags: ['車位', '陽台', '變頻冷氣', '衛浴乾濕分離', '網路'],
    pros: '• 附車位，停車免煩惱\n• 陽台採光充足，通風良好\n• 衛浴乾濕分離，使用舒適\n• 變頻冷氣省電節能\n• 鄰近多個大型購物中心',
    cons: '• 租金略高，適合有穩定收入的租客\n• 位於熱鬧區域，週末可能較吵',
    images: [], coverIndex: 0, isActive: true,
    createdAt: '2025-01-18T09:00:00Z', updatedAt: '2025-01-18T09:00:00Z'
  },
  {
    id: 'prop_3',
    title: '南屯區兩房住家｜台水台電｜可開伙｜近文心路',
    district: '南屯區', rent: 18000, layout: '2房', size: 22, type: '公寓',
    nearbyLandmarks: '文心路商圈、大潤發、南屯老街、永春市場',
    highlights: '可開伙、獨立洗曬空間、台水台電計費。',
    tags: ['可開伙', '獨洗曬', '台水台電', '陽台'],
    pros: '• 空間寬敞，兩房一廳適合2人居住\n• 可開伙，享受在家下廚的樂趣\n• 獨立洗曬空間，不與他人共用\n• 台水台電，費用透明好計算',
    cons: '• 公寓無電梯，需爬樓梯（3樓）\n• 無附停車位，周邊停車費需自行負擔',
    images: [], coverIndex: 0, isActive: true,
    createdAt: '2025-01-20T14:00:00Z', updatedAt: '2025-01-20T14:00:00Z'
  },
  {
    id: 'prop_4',
    title: '北區一房｜寵物友善｜近中國醫藥大學',
    district: '北區', rent: 10500, layout: '1房', size: 11, type: '公寓',
    nearbyLandmarks: '中國醫藥大學、育德市場、育德路商圈、忠明南路',
    highlights: '大陽台、採光充足、寵物友善（可狗可貓）。',
    tags: ['可狗', '可貓', '陽台', '網路'],
    pros: '• 寵物友善，可養狗可養貓\n• 大陽台，適合寵物活動\n• 鄰近大學，生活機能方便\n• 採光充足，室內明亮',
    cons: '• 公寓無電梯，需爬樓梯（4樓）\n• 坪數適中，大型寵物需評估',
    images: [], coverIndex: 0, isActive: true,
    createdAt: '2025-02-01T10:00:00Z', updatedAt: '2025-02-01T10:00:00Z'
  },
  {
    id: 'prop_5',
    title: '大里區三房透天｜有車位｜管理室｜近大里市區',
    district: '大里區', rent: 22000, layout: '3房', size: 28, type: '透天',
    nearbyLandmarks: '大里市區、大買家量販、大里高中、草湖溪廊道',
    highlights: '附停車位、社區管理室、衛浴乾濕分離、全室變頻冷氣。',
    tags: ['車位', '管理室', '衛浴乾濕分離', '變頻冷氣', '陽台'],
    pros: '• 空間寬敞，三房適合家庭入住\n• 附停車位，一家出行方便\n• 社區管理室，安全有保障\n• 衛浴乾濕分離，衛生舒適\n• 變頻冷氣全室配備',
    cons: '• 租金較高，適合有穩定家庭收入者\n• 距台中市中心稍遠，通勤時間需考量',
    images: [], coverIndex: 0, isActive: true,
    createdAt: '2025-02-05T09:00:00Z', updatedAt: '2025-02-05T09:00:00Z'
  },
  {
    id: 'prop_6',
    title: '太平區雅致套房｜飲水機網路含管費｜近崇德路',
    district: '太平區', rent: 7500, layout: '套房', size: 7, type: '套房',
    nearbyLandmarks: '崇德路商圈、太平區公所、太平高工',
    highlights: '含管理費、網路、飲水機，全新裝修、台水台電、變頻冷氣。',
    tags: ['飲水機', '網路', '台水台電', '變頻冷氣'],
    pros: '• 租金含管理費、網路、飲水機，費用透明\n• 全新裝修，入住即可使用\n• 台水台電，計費清楚\n• 變頻冷氣省電',
    cons: '• 坪數較小，適合單身居住\n• 距台中市中心較遠，建議有自備車輛',
    images: [], coverIndex: 0, isActive: true,
    createdAt: '2025-02-10T11:00:00Z', updatedAt: '2025-02-10T11:00:00Z'
  }
];

// ===== STATE =====
let allProps = [];
let currentImages = []; // {dataUrl, name}
let currentCoverIndex = 0;
let editingId = null;
let confirmCallback = null;

// ===== INIT =====
async function initAdmin() {
  if (propFormInitialized) {
    await loadProps();
    renderAdminProps();
    return;
  }
  await loadProps();
  renderAdminProps();
  initPropForm();
  initPwForm();
  initPhotoUpload();
  initVideoUpload();
  ['admin-filter-district','admin-filter-layout','admin-filter-status'].forEach(id => {
    document.getElementById(id).addEventListener('change', renderAdminProps);
  });

  // 單次添加全局推薦分類事件委托
  setupRecommendListeners();
}

// ===== DATA =====
async function loadProps() {
  const { data, error } = await db.from('properties')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) { showToast('載入物件失敗', 'error'); console.error(error); return; }
  allProps = (data || []).map(propFromDb);
}

async function loadAppts() {
  // 預約資料加載由 renderAppts() 直接從資料庫查詢，此函數作為佔位符
}

// ===== NAVIGATION =====
async function showSection(name) {
  document.querySelectorAll('.admin-section').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const target = document.getElementById(`section-${name}`);
  if (!target) return;
  target.classList.add('active');
  target.style.display = 'block';
  window.scrollTo(0, 0);
  document.querySelectorAll('.admin-nav-link, .admin-mobile-nav .admin-nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll(`.admin-nav-link`).forEach(l => {
    if (l.getAttribute('onclick') && l.getAttribute('onclick').includes(`'${name}'`)) l.classList.add('active');
  });

  // 切換分頁時重新加載數據
  if (name === 'props') {
    await loadProps();
    renderAdminProps();
  }
  if (name === 'appts') {
    await loadAppts();
    renderAppts();
  }
  if (name === 'feedback') loadFeedbackSection();
  if (name === 'pw') updateKeyStatus();
  if (name === 'add' && !editingId) {
    document.getElementById('form-section-title').textContent = '新增物件';
  }
}

function toggleAdminNav() {
  document.getElementById('admin-mobile-nav').classList.toggle('open');
}
function closeAdminMobileNav() {
  document.getElementById('admin-mobile-nav').classList.remove('open');
}


// ===== RENDER PROPERTY LIST =====
function renderAdminProps() {
  const district = document.getElementById('admin-filter-district').value;
  const layout = document.getElementById('admin-filter-layout').value;
  const status = document.getElementById('admin-filter-status').value;
  const search = (document.getElementById('admin-search').value || '').toLowerCase();

  let list = allProps.filter(p => {
    // 預設只顯示上架物件，除非用戶明確選擇「全部」或「下架」
    if (status === '' || status === null) {
      if (!p.isActive) return false;
    } else if (status === '1' && !p.isActive) return false;
    else if (status === '0' && p.isActive) return false;

    if (district && p.district !== district) return false;
    if (layout) {
      const cat = p.layoutCategory || deriveLayoutCategory(p.layout || '', p.type || '');
      if (layout === '5房以上') { if (!/^[5-9]\d*房以上$|^[5-9]房/.test(cat) && cat !== '5房以上') return false; }
      else if (cat !== layout) return false;
    }
    if (search && !p.title.toLowerCase().includes(search) && !(p.address || '').toLowerCase().includes(search)) return false;
    return true;
  });
  // 按推薦分類排序：設定了標籤的在上面，沒設定的在下面
  const recPriorityAdmin = (p) => {
    const cats = p.recommendCategories || [];
    if (cats.includes('♡ 最新物件')) return 4;
    if (cats.includes('♡ 私心推薦')) return 3;
    if (cats.includes('♡ 近期熱門')) return 2;
    if (cats.includes('♡ 學生首選')) return 1;
    return 0;
  };
  list.sort((a, b) => {
    const prioA = recPriorityAdmin(a);
    const prioB = recPriorityAdmin(b);
    if (prioA !== prioB) return prioB - prioA;
    const dateA = new Date(a.updatedAt);
    const dateB = new Date(b.updatedAt);
    return dateB - dateA;
  });

  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    // 手機版：卡片式
    const container = document.getElementById('admin-props-cards');
    const tableWrap  = document.getElementById('admin-props-table-wrap');
    if (container) container.style.display = 'block';
    if (tableWrap)  tableWrap.style.display = 'none';

    if (!container) return;
    if (list.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:32px;color:var(--color-text-muted);">沒有符合的物件</div>`;
      return;
    }
    container.innerHTML = list.map(p => {
      const img = getCoverImg(p);
      const layoutSize = [p.layout, p.size ? p.size + '坪' : ''].filter(Boolean).join(' · ') || '—';
      return `
        <div class="admin-prop-card">
          <div class="admin-prop-card-top">
            ${img
              ? `<img src="${img}" class="admin-prop-card-img admin-thumb" alt="" onclick="openAdminImages('${p.id}')" title="點擊看大圖" />`
              : `<div class="admin-prop-card-img admin-prop-card-img--placeholder">🏠</div>`}
            <div class="admin-prop-card-info">
              ${p.address ? `<div class="admin-prop-card-addr">📍 ${escHtml(p.address)}</div>` : ''}
              ${p.address ? `<div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">📌 大略位置：${escHtml(maskAddress(p.address))}</div>` : ''}
              <div class="admin-prop-card-title">${escHtml(p.title)}</div>
              <div class="admin-prop-card-meta">
                <span>${escHtml(p.district)}</span>
                <span>·</span>
                <span>${escHtml(layoutSize)}</span>
                <span>·</span>
                <span style="font-weight:600;color:var(--color-primary-dark);">$${p.rent.toLocaleString()}</span>
              </div>
              <div style="margin-top:4px;font-size:11px;color:var(--color-text-muted);">
                ${(p.recommendCategories||[]).length ? (p.recommendCategories).map(c=>`<span style="background:#e8f0e8;border-radius:4px;padding:1px 6px;margin-right:3px;">${escHtml(c)}</span>`).join('') : '<span style="color:var(--color-border);">未設定</span>'}
              </div>
            </div>
            <span class="status-badge ${p.isActive ? 'status-active' : 'status-inactive'}" style="align-self:flex-start;white-space:nowrap;flex-shrink:0;">
              ${p.isActive ? '● 上架' : '○ 下架'}
            </span>
          </div>
          <div class="admin-prop-card-actions">
            <button class="btn btn-outline btn-sm" onclick="editProp('${p.id}')">✏️ 編輯</button>
            <button class="btn btn-ghost btn-sm" onclick="toggleActive('${p.id}')">${p.isActive ? '下架' : '✅ 上架'}</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProp('${p.id}')">🗑 刪除</button>
          </div>
        </div>`;
    }).join('');
    return;
  }

  // 桌機版：表格
  const container = document.getElementById('admin-props-cards');
  const tableWrap  = document.getElementById('admin-props-table-wrap');
  if (container) container.style.display = 'none';
  if (tableWrap)  tableWrap.style.display = 'block';

  const tbody = document.getElementById('admin-props-tbody');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--color-text-muted);">沒有符合的物件</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => {
    const img = getCoverImg(p);
    const date = new Date(p.createdAt).toLocaleDateString('zh-TW', { month:'2-digit', day:'2-digit', year:'2-digit' });
    const addrDisplay = p.address
      ? `<div style="font-size:12px;"><div style="color:var(--color-text);">${escHtml(p.address)}</div><div style="color:var(--color-text-muted);font-size:11px;margin-top:2px;">📌 ${escHtml(maskAddress(p.address))}</div></div>`
      : '<span style="color:var(--color-border);font-size:12px;">—</span>';
    const floorStr = p.floor ? (p.totalFloors ? `${p.floor}/${p.totalFloors}F` : `${p.floor}F`) : '';
    const layoutSize = [p.layout, p.size ? p.size+'坪' : '', floorStr].filter(Boolean).join(' · ') || '—';
    return `
      <tr>
        <td style="padding:6px 8px;position:relative;">
          ${img
            ? `<div style="position:relative;display:inline-block;">
                <img src="${img}" alt="" class="admin-thumb" onclick="openAdminImages('${p.id}')" style="width:52px;height:38px;object-fit:cover;border-radius:5px;display:block;cursor:pointer;" />
                <img src="${img}" alt="" style="position:absolute;top:-120px;left:0;width:240px;height:180px;object-fit:cover;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);display:none;z-index:999;" class="admin-thumb-preview" />
              </div>
              <script>
                document.currentScript.previousElementSibling.addEventListener('mouseenter', function() {
                  this.querySelector('.admin-thumb-preview').style.display = 'block';
                });
                document.currentScript.previousElementSibling.addEventListener('mouseleave', function() {
                  this.querySelector('.admin-thumb-preview').style.display = 'none';
                });
              </script>`
            : `<div style="width:52px;height:38px;background:var(--color-soft-green);border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:16px;opacity:0.4;">🏠</div>`}
        </td>
        <td style="max-width:180px;">
          <div style="font-weight:600;font-size:12px;line-height:1.4;color:var(--color-primary-dark);">${escHtml(p.title)}</div>
        </td>
        <td style="max-width:160px;">${addrDisplay}</td>
        <td style="white-space:nowrap;font-size:12px;">${escHtml(p.district)}</td>
        <td style="white-space:nowrap;font-size:12px;font-weight:600;color:var(--color-primary-dark);">$${p.rent.toLocaleString()}</td>
        <td style="white-space:nowrap;font-size:12px;">${escHtml(layoutSize)}</td>
        <td style="font-size:12px;">${escHtml(p.type || '—')}</td>
        <td>
          <span class="status-badge ${p.isActive ? 'status-active' : 'status-inactive'}" style="font-size:11px;">
            ${p.isActive ? '● 上架' : '○ 下架'}
          </span>
        </td>
        <td style="white-space:nowrap;font-size:11px;color:var(--color-text-muted);">${date}</td>
        <td style="font-size:11px;">
          <div style="position:relative;display:inline-block;">
            <button class="recommend-btn" data-prop-id="${p.id}" style="padding:4px 8px;border:1px solid var(--color-border);border-radius:4px;background:transparent;cursor:pointer;font-size:11px;min-width:80px;">
              ${(p.recommendCategories||[]).length ? '編輯推薦' : '設定推薦'}
            </button>
            <div class="recommend-dropdown" data-prop-id="${p.id}" style="position:absolute;top:100%;left:0;background:white;border:1px solid var(--color-border);border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.1);z-index:100;min-width:150px;display:none;margin-top:4px;">
              ${['♡ 最新物件', '♡ 近期熱門', '♡ 學生首選', '♡ 私心推薦'].map(cat => {
                const isChecked = (p.recommendCategories||[]).includes(cat);
                return `<label style="cursor:pointer;display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--color-soft-green);">
                  <input type="checkbox" class="recommend-checkbox" data-prop-id="${p.id}" data-category="${cat}" ${isChecked ? 'checked' : ''} style="cursor:pointer;margin:0;width:14px;height:14px;" />
                  <span style="font-size:11px;">${cat}</span>
                </label>`;
              }).join('')}
            </div>
          </div>
          ${(p.recommendCategories||[]).length > 0 ? `<div style="margin-top:4px;display:flex;gap:3px;flex-wrap:wrap;">
            ${(p.recommendCategories||[]).map(cat => `<span style="background:#e8f0e8;border-radius:3px;padding:2px 6px;font-size:10px;">${escHtml(cat)}</span>`).join('')}
          </div>` : ''}
        </td>
        <td>
          <div class="table-actions">
            <button class="btn btn-outline btn-sm" onclick="editProp('${p.id}')" style="padding:4px 10px;font-size:12px;">編輯</button>
            <button class="btn btn-ghost btn-sm" onclick="toggleActive('${p.id}')" style="padding:4px 10px;font-size:12px;">${p.isActive ? '下架' : '上架'}</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProp('${p.id}')" style="padding:4px 10px;font-size:12px;">刪除</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function setupRecommendListeners() {
  if (recommendListenersSetup) return;
  recommendListenersSetup = true;

  const tableWrap = document.getElementById('admin-props-table-wrap');
  if (!tableWrap) return;

  // 事件委托：推薦按鈕點擊
  tableWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.recommend-btn');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      const propId = btn.dataset.propId;
      const dropdown = document.querySelector(`.recommend-dropdown[data-prop-id="${propId}"]`);
      if (dropdown) {
        // 先關閉其他所有下拉菜單
        document.querySelectorAll('.recommend-dropdown').forEach(d => {
          if (d !== dropdown) d.style.display = 'none';
        });
        // 切換當前下拉菜單
        const isOpen = dropdown.style.display !== 'none';
        dropdown.style.display = isOpen ? 'none' : 'block';
      }
      return;
    }

    // 阻止在下拉菜單上的點擊傳播
    if (e.target.closest('.recommend-dropdown')) {
      e.stopPropagation();
    }
  });

  // 事件委托：複選框變化
  tableWrap.addEventListener('change', async (e) => {
    if (e.target.classList.contains('recommend-checkbox')) {
      e.preventDefault();
      e.stopPropagation();
      const propId = e.target.dataset.propId;
      const category = e.target.dataset.category;
      await handleRecommendCheckboxChange(propId, category);
    }
  }, true);

  // 點擊頁面其他地方關閉下拉菜單
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.recommend-btn') && !e.target.closest('.recommend-dropdown')) {
      document.querySelectorAll('.recommend-dropdown').forEach(d => {
        d.style.display = 'none';
      });
    }
  });
}

function toggleRecommendDropdown(e, propId) {
  e.stopPropagation();
  const dropdown = document.getElementById(`recommend-dropdown-${propId}`);
  const isOpen = dropdown.style.display !== 'none';
  dropdown.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    document.addEventListener('click', () => {
      dropdown.style.display = 'none';
    }, { once: true });
  }
}

async function handleRecommendCheckboxChange(propId, category) {
  const scrollPos = window.scrollY;
  let updateCompleted = false;

  try {
    const { data: p, error: fetchError } = await db.from('properties').select('*').eq('id', propId).single();
    if (fetchError) throw fetchError;

    let cats = p.recommend_categories || [];
    if (cats.includes(category)) {
      cats = cats.filter(c => c !== category);
    } else {
      cats.push(category);
    }

    const { error: updateError } = await db.from('properties').update({ recommend_categories: cats }).eq('id', propId);
    if (updateError) throw updateError;

    updateCompleted = true;
    showToast('推薦分類已更新', 'success');

    // 只更新該列的推薦分類顯示，不重新渲染整個表格
    const tbody = document.getElementById('admin-props-tbody');
    if (tbody) {
      const rows = tbody.querySelectorAll('tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
          const titleCell = cells[1]?.textContent;
          if (titleCell && titleCell.includes(p.title)) {
            // 找到對應的行，只更新推薦分類列（第10列）
            const recommendCell = cells[9];
            if (recommendCell) {
              // 更新下拉菜單中的複選框狀態
              const checkboxes = recommendCell.querySelectorAll('.recommend-checkbox');
              checkboxes.forEach(cb => {
                if (cb.dataset.category === category) {
                  cb.checked = cats.includes(category);
                }
              });

              // 更新標籤顯示
              const tagDivs = recommendCell.querySelectorAll('div');
              if (tagDivs.length > 0) {
                const lastDiv = tagDivs[tagDivs.length - 1];
                // 確保不是下拉菜單div
                if (!lastDiv.classList.contains('recommend-dropdown')) {
                  if (cats.length > 0) {
                    lastDiv.innerHTML = cats.map(cat => `<span style="background:#e8f0e8;border-radius:3px;padding:2px 6px;font-size:10px;">${escHtml(cat)}</span>`).join('');
                    lastDiv.style.marginTop = '4px';
                    lastDiv.style.display = 'flex';
                    lastDiv.style.gap = '3px';
                    lastDiv.style.flexWrap = 'wrap';
                  } else {
                    lastDiv.innerHTML = '';
                  }
                }
              }

              // 關閉下拉菜單
              const dropdown = recommendCell.querySelector('.recommend-dropdown');
              if (dropdown) {
                dropdown.style.display = 'none';
              }
            }
          }
        }
      });
    }

    // 立即恢復滾動位置，不依賴於任何異步完成
    if (updateCompleted) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPos);
      });
    }
  } catch(e) {
    console.error('更新推薦分類失敗', e);
    showToast('更新失敗', 'error');
    // 即使出錯也要恢復滾動位置
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPos);
    });
  }
}

async function toggleRecommendCategory(propId, category) {
  return handleRecommendCheckboxChange(propId, category);
}

function getCoverImg(p) {
  if (!p.images || p.images.length === 0) return null;
  return p.images[Math.min(p.coverIndex || 0, p.images.length - 1)];
}

// ===== 縮圖放大檢視 =====
let adminLightboxImages = [];
let adminLightboxIndex = 0;
function openAdminImages(propId) {
  const p = allProps.find(x => x.id === propId);
  if (!p || !p.images || !p.images.length) return;
  adminLightboxImages = p.images.slice();
  // 從封面圖開始
  adminLightboxIndex = Math.min(p.coverIndex || 0, adminLightboxImages.length - 1);
  renderAdminLightbox();
  document.getElementById('admin-lightbox').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function renderAdminLightbox() {
  const imgEl = document.getElementById('admin-lightbox-img');
  const counter = document.getElementById('admin-lightbox-counter');
  if (imgEl) imgEl.src = adminLightboxImages[adminLightboxIndex] || '';
  if (counter) counter.textContent = adminLightboxImages.length > 1
    ? `${adminLightboxIndex + 1} / ${adminLightboxImages.length}` : '';
  const multi = adminLightboxImages.length > 1;
  document.querySelectorAll('.admin-lightbox-nav').forEach(b => b.style.display = multi ? 'flex' : 'none');
}
function adminImageStep(dir, e) {
  if (e) e.stopPropagation();
  const n = adminLightboxImages.length;
  if (!n) return;
  adminLightboxIndex = (adminLightboxIndex + dir + n) % n;
  renderAdminLightbox();
}
function closeAdminImages(e) {
  if (e) e.stopPropagation();
  document.getElementById('admin-lightbox').classList.add('hidden');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => {
  const lb = document.getElementById('admin-lightbox');
  if (!lb || lb.classList.contains('hidden')) return;
  if (e.key === 'Escape') closeAdminImages();
  else if (e.key === 'ArrowLeft') adminImageStep(-1);
  else if (e.key === 'ArrowRight') adminImageStep(1);
});

function switchPropsTab(val) {
  document.getElementById('admin-filter-status').value = val;
  document.getElementById('tab-active').classList.toggle('active', val === '1');
  document.getElementById('tab-inactive').classList.toggle('active', val === '0');
  renderAdminProps();
}

function clearAdminFilters() {
  document.getElementById('admin-filter-district').value = '';
  document.getElementById('admin-filter-layout').value = '';
  document.getElementById('admin-filter-status').value = '';
  document.getElementById('admin-search').value = '';
  renderAdminProps();
}

// ===== TOGGLE ACTIVE =====
async function toggleActive(id) {
  const p = allProps.find(x => x.id === id);
  if (!p) return;
  const newActive = !p.isActive;
  const { error } = await db.from('properties')
    .update({ is_active: newActive, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { showToast('更新失敗', 'error'); return; }
  p.isActive = newActive;
  renderAdminProps();
  showToast(newActive ? '物件已上架' : '物件已下架', 'success');
}

// ===== DELETE =====
function deleteProp(id) {
  const p = allProps.find(x => x.id === id);
  if (!p) return;
  openConfirm(`確定要刪除「${p.title.slice(0,20)}」？此操作無法復原。`, async () => {
    const { error } = await db.from('properties').delete().eq('id', id);
    if (error) { showToast('刪除失敗', 'error'); return; }
    allProps = allProps.filter(x => x.id !== id);
    renderAdminProps();
    showToast('物件已刪除', 'success');
  });
}

// ===== EDIT =====
function editProp(id) {
  const p = allProps.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('form-section-title').textContent = '編輯物件';
  document.getElementById('edit-prop-id').value = id;

  document.getElementById('f-title').value = p.title || '';
  document.getElementById('f-address').value = p.address || '';
  document.getElementById('f-district').value = p.district || '';
  document.getElementById('f-rent').value = p.rent || '';
  document.getElementById('f-layout').value = p.layout || '';
  document.getElementById('f-layout-cat').value = p.layoutCategory || deriveLayoutCategory(p.layout || '', p.type || '');
  document.getElementById('f-size').value = p.size || '';
  document.getElementById('f-floor').value = p.floor || '';
  document.getElementById('f-total-floors').value = p.totalFloors || '';

  document.getElementById('f-type').value = p.type || '';

  document.getElementById('f-nearby').value = p.nearbyLandmarks || '';
  document.getElementById('f-highlights').value = p.highlights || '';
  document.getElementById('f-pros').value = p.pros || '';
  document.getElementById('f-cons').value = p.cons || '';

  // tags
  document.querySelectorAll('#tags-selector .tag-btn').forEach(btn => {
    btn.classList.toggle('selected', (p.tags || []).includes(btn.dataset.tag));
  });

  // active status
  const activeVal = p.isActive ? '1' : '0';
  document.querySelector(`input[name="f-active"][value="${activeVal}"]`).checked = true;

  // 推薦分類
  document.querySelectorAll('input[name="f-recommend"]').forEach(cb => {
    cb.checked = (p.recommendCategories || []).includes(cb.value);
  });

  // images (existing ones are already URLs, no need to re-upload)
  currentImages = (p.images || []).map((url, i) => ({ dataUrl: url, url, name: `photo_${i}`, isNew: false }));
  currentCoverIndex = p.coverIndex || 0;
  renderPhotoPreview();

  // 恢復影片
  currentVideo = p.video ? { dataUrl: p.video, url: p.video, name: 'video', isNew: false } : null;
  renderVideoPreview();

  showSection('add');
}

// ===== PROP FORM =====
let propFormInitialized = false;
function initPropForm() {
  if (propFormInitialized) return;
  propFormInitialized = true;

  document.querySelectorAll('#tags-selector .tag-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('selected'));
  });

  document.getElementById('prop-form').addEventListener('submit', saveProp);
}

async function saveProp(e) {
  e.preventDefault();
  const title = document.getElementById('f-title').value.trim();
  const district = document.getElementById('f-district').value;
  const rent = parseInt(document.getElementById('f-rent').value);

  if (!title || !district || !rent) {
    showToast('請填寫必填欄位（標題、地區、租金）', 'error');
    if (!title) document.getElementById('f-title').focus();
    else if (!district) document.getElementById('f-district').focus();
    else document.getElementById('f-rent').focus();
    document.getElementById('section-add').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const saveBtn = document.querySelector('#prop-form button[type="submit"]');
  saveBtn.disabled = true;
  saveBtn.textContent = '儲存中...';

  try {
    const propId = editingId || ('prop_' + Date.now());

    // 上傳新照片到 Supabase Storage，已存在的直接使用 URL
    const imageUrls = [];
    for (let i = 0; i < currentImages.length; i++) {
      const img = currentImages[i];
      if (!img.isNew) {
        imageUrls.push(img.url || img.dataUrl);
      } else {
        const url = await uploadImageToStorage(img.dataUrl, propId, i);
        imageUrls.push(url);
      }
    }

    // 處理影片上傳
    let videoUrl = null;
    if (currentVideo && currentVideo.isNew) {
      try {
        videoUrl = await uploadVideoToStorage(currentVideo.dataUrl, propId);
        showToast('影片上傳成功', 'success');
      } catch (videoErr) {
        console.error('影片上傳失敗:', videoErr);
        showToast(`影片上傳失敗: ${videoErr.message}`, 'error');
        throw videoErr;
      }
    } else if (currentVideo && currentVideo.url) {
      videoUrl = currentVideo.url;
    }

    const selectedTags = [...document.querySelectorAll('#tags-selector .tag-btn.selected')].map(b => b.dataset.tag);
    const isActive = document.querySelector('input[name="f-active"]:checked').value === '1';
    const recommendCategories = [...document.querySelectorAll('input[name="f-recommend"]:checked')].map(cb => cb.value);

    const row = {
      id: propId,
      title,
      district,
      address: document.getElementById('f-address').value.trim(),
      rent,
      layout: document.getElementById('f-layout').value,
      layout_category: document.getElementById('f-layout-cat').value,
      size: parseFloat(document.getElementById('f-size').value) || 0,
      floor: document.getElementById('f-floor').value.trim(),
      total_floors: parseInt(document.getElementById('f-total-floors').value) || 0,
      type: document.getElementById('f-type').value,
      nearby_landmarks: document.getElementById('f-nearby').value.trim(),
      highlights: document.getElementById('f-highlights').value.trim(),
      tags: selectedTags,
      pros: document.getElementById('f-pros').value.trim(),
      cons: document.getElementById('f-cons').value.trim(),
      images: imageUrls,
      cover_index: currentCoverIndex,
      video: videoUrl,
      is_active: isActive,
      recommend_categories: recommendCategories,
      updated_at: new Date().toISOString(),
    };
    if (!editingId) row.created_at = new Date().toISOString();

    const { error } = await db.from('properties').upsert(row);
    if (error) throw error;

    showToast(editingId ? '物件已更新' : '物件已新增', 'success');
    resetPropForm();
    await loadProps();
    setTimeout(() => showSection('props'), 600);

  } catch(err) {
    console.error(err);
    showToast('儲存失敗：' + (err.message || '請重試'), 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 儲存物件';
  }
}

function resetPropForm() {
  editingId = null;
  document.getElementById('edit-prop-id').value = '';
  document.getElementById('prop-form').reset();
  document.getElementById('f-address').value = '';
  document.getElementById('form-section-title').textContent = '新增物件';
  document.querySelectorAll('#tags-selector .tag-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('input[name="f-recommend"]').forEach(cb => cb.checked = false);
  currentImages = [];
  currentCoverIndex = 0;
  currentVideo = null;
  renderPhotoPreview();
  renderVideoPreview();
  document.getElementById('ai-raw-text').value = '';
  document.getElementById('ai-hint').classList.remove('show');
}

// ===== PHOTO UPLOAD =====
function initPhotoUpload() {
  const input = document.getElementById('photo-input');
  const dropArea = document.getElementById('photo-drop-area');

  input.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    input.value = '';
  });

  dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('drag-over'); });
  dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag-over'));
  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });
}

function handleFiles(files) {
  const MAX_SIZE = 3 * 1024 * 1024; // 3MB
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_SIZE) {
      showToast(`${file.name} 超過 3MB，已跳過`, 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      // Compress image
      compressImage(e.target.result, 1200, 0.82, (compressed) => {
        currentImages.push({ dataUrl: compressed, name: file.name, isNew: true });
        renderPhotoPreview();
      });
    };
    reader.readAsDataURL(file);
  });
}

function compressImage(src, maxW, quality, cb) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    let w = img.width, h = img.height;
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    cb(canvas.toDataURL('image/jpeg', quality));
  };
  img.src = src;
}

function renderPhotoPreview() {
  const grid = document.getElementById('photo-preview-grid');
  if (currentImages.length === 0) { grid.innerHTML = ''; return; }

  grid.innerHTML = currentImages.map((img, i) => `
    <div class="photo-preview-item ${i === currentCoverIndex ? 'cover-selected' : ''}" draggable="true" data-index="${i}" onclick="setCover(${i})" title="點擊設為封面，或拖動調整順序">
      <img src="${img.dataUrl}" alt="photo ${i+1}" />
      ${i === currentCoverIndex ? '<div class="cover-badge">封面</div>' : ''}
      <button class="remove-photo" onclick="event.stopPropagation(); removePhoto(${i})" title="刪除">✕</button>
    </div>`).join('');

  // 初始化拖放功能
  initPhotoReordering();
}

function setCover(idx) {
  currentCoverIndex = idx;
  renderPhotoPreview();
}

function removePhoto(idx) {
  currentImages.splice(idx, 1);
  if (currentCoverIndex >= currentImages.length) currentCoverIndex = Math.max(0, currentImages.length - 1);
  renderPhotoPreview();
}

function initPhotoReordering() {
  const items = document.querySelectorAll('.photo-preview-item');
  let draggedItem = null;
  let draggedOverItem = null;

  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => {
        item.style.opacity = '0.4';
      }, 0);
    });

    item.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (item !== draggedItem && draggedItem) {
        draggedOverItem = item;
        item.style.background = 'rgba(163, 171, 155, 0.5)';
        item.style.boxShadow = '0 0 8px rgba(163, 171, 155, 0.8)';
        item.style.transform = 'scale(1.08)';
      }
    });

    item.addEventListener('dragleave', (e) => {
      if (item === draggedOverItem) {
        item.style.background = '';
        item.style.boxShadow = '';
        item.style.transform = '';
        draggedOverItem = null;
      }
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      if (item !== draggedItem && draggedItem) {
        const fromIdx = parseInt(draggedItem.dataset.index);
        const toIdx = parseInt(item.dataset.index);

        // 交換照片位置
        const temp = currentImages[fromIdx];
        currentImages[fromIdx] = currentImages[toIdx];
        currentImages[toIdx] = temp;

        // 如果交換的是封面，也要更新封面索引
        if (currentCoverIndex === fromIdx) {
          currentCoverIndex = toIdx;
        } else if (currentCoverIndex === toIdx) {
          currentCoverIndex = fromIdx;
        }

        renderPhotoPreview();
      }
    });

    item.addEventListener('dragend', (e) => {
      item.style.opacity = '1';
      if (draggedOverItem) {
        draggedOverItem.style.background = '';
        draggedOverItem.style.boxShadow = '';
        draggedOverItem.style.transform = '';
      }
      draggedItem = null;
      draggedOverItem = null;
    });
  });
}

function movePhoto(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= currentImages.length) return;
  [currentImages[idx], currentImages[newIdx]] = [currentImages[newIdx], currentImages[idx]];
  if (currentCoverIndex === idx) currentCoverIndex = newIdx;
  else if (currentCoverIndex === newIdx) currentCoverIndex = idx;
  renderPhotoPreview();
}

// ===== VIDEO UPLOAD =====
let currentVideo = null;

function initVideoUpload() {
  const input = document.getElementById('video-input');
  const dropArea = document.getElementById('video-drop-area');

  input.addEventListener('change', (e) => {
    handleVideoFile(e.target.files[0]);
    input.value = '';
  });

  dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('drag-over'); });
  dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag-over'));
  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleVideoFile(e.dataTransfer.files[0]);
    }
  });
}

function handleVideoFile(file) {
  if (!file) return;
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB

  if (!file.type.startsWith('video/')) {
    showToast('請上傳影片檔案（MP4、WebM 等）', 'error');
    return;
  }

  if (file.size > MAX_SIZE) {
    showToast(`${file.name} 超過 50MB，已跳過`, 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    currentVideo = { dataUrl: e.target.result, name: file.name, isNew: true };
    renderVideoPreview();
  };
  reader.readAsDataURL(file);
}

function renderVideoPreview() {
  const preview = document.getElementById('video-preview');
  if (!currentVideo) {
    preview.innerHTML = '';
    return;
  }

  preview.innerHTML = `
    <div style="position:relative;display:inline-block;">
      <video width="120" height="80" controls style="border-radius:4px;border:1px solid var(--color-border);">
        <source src="${currentVideo.dataUrl}" />
        你的瀏覽器不支援影片播放
      </video>
      <button class="remove-photo" onclick="removeVideo()" title="刪除">✕</button>
    </div>
  `;
}

function removeVideo() {
  currentVideo = null;
  renderVideoPreview();
}

// ===== 格式化 AI 整理摘要 =====
function formatAISummary(result, raw) {
  const lines = [];

  // 物件標題
  let title = result.layoutCategory || result.layout || result.type || '物件';
  if (result.title) {
    title = result.title;
  } else {
    title = (result.layoutCategory || result.layout || result.type || '') +
            (result.isActive === false ? '（待審）' : '');
  }
  lines.push(`📣${title.trim()}`);

  // 基本資訊區塊
  const info = [];
  if (/開發|發展商/.test(raw)) {
    const devMatch = raw.match(/(?:開發|發展商)[：:\s]+([^\n]+)/);
    if (devMatch) info.push(`開發：${devMatch[1].trim()}`);
  }
  if (result.address) info.push(`地址：${result.address}`);
  if (result.floor || result.totalFloors) {
    const floorStr = result.totalFloors
      ? `${result.floor}/${result.totalFloors}`
      : result.floor;
    info.push(`樓層：${floorStr}`);
  }
  if (result.size) info.push(`坪數：${result.size}`);
  if (/社區名稱|大樓名稱|社區[：:]\s*([^\n]+)/.test(raw)) {
    const commMatch = raw.match(/(?:社區名稱|大樓名稱|社區)[：:\s]+([^\n]+)/);
    if (commMatch) info.push(`社區：${commMatch[1].trim()}`);
  }
  if (result.rent) info.push(`租金：$${result.rent.toLocaleString()}`);
  if (info.length > 0) lines.push(info.join('\n'));

  // 附近商圈和地標
  if (result.nearbyLandmarks) {
    lines.push('');
    lines.push('附近商圈和地標：');
    lines.push(result.nearbyLandmarks);
  }

  // 特色標籤
  if (result.tags && result.tags.length > 0) {
    lines.push('');
    lines.push('特色標籤：');
    lines.push(result.tags.join('、'));
  }

  // 物件重點
  if (result.highlights) {
    lines.push('');
    lines.push('物件重點：');
    lines.push(result.highlights);
  }

  // 優點
  if (result.pros) {
    lines.push('');
    lines.push('✅ 優點：');
    lines.push(result.pros);
  }

  // 可能需要注意的地方
  if (result.cons) {
    lines.push('');
    lines.push('⚠️ 可能需要注意的地方：');
    lines.push(result.cons);
  }

  return lines.join('\n');
}

// ===== AI PARSER =====
async function runAI() {
  const raw = document.getElementById('ai-raw-text').value.trim();
  if (!raw) { showToast('請先貼上原始物件資料', 'error'); return; }

  const result = parsePropertyText(raw);

  if (result.title)   document.getElementById('f-title').value = result.title;
  if (result.address) document.getElementById('f-address').value = result.address;
  if (result.district) document.getElementById('f-district').value = result.district;
  if (result.rent) document.getElementById('f-rent').value = result.rent;
  if (result.layout) document.getElementById('f-layout').value = result.layout;
  if (result.layoutCategory) document.getElementById('f-layout-cat').value = result.layoutCategory;
  if (result.size)   document.getElementById('f-size').value = result.size;
  if (result.floor !== undefined) document.getElementById('f-floor').value = result.floor;
  if (result.totalFloors)        document.getElementById('f-total-floors').value = result.totalFloors;
  // AI 整理時設置類型（多選 checkboxes）
  if (result.type) {
    const types = result.type.split('、').filter(Boolean);
    document.querySelectorAll('input[name="f-type-checkbox"]').forEach(cb => {
      cb.checked = types.includes(cb.value);
    });
    document.getElementById('f-type').value = result.type;
  }
  // nearby 先清空，等 geocoding 填（避免 fallback 亂猜）
  document.getElementById('f-nearby').value = '';
  if (result.highlights) document.getElementById('f-highlights').value = result.highlights;
  if (result.pros) document.getElementById('f-pros').value = result.pros;
  if (result.cons) document.getElementById('f-cons').value = result.cons;

  // tags
  if (result.tags && result.tags.length > 0) {
    document.querySelectorAll('#tags-selector .tag-btn').forEach(btn => {
      if (result.tags.includes(btn.dataset.tag)) btn.classList.add('selected');
    });
  }

  document.getElementById('ai-hint').classList.add('show');

  // 查詢附近地標（地址 + 行政區 + 文字）
  const address = result.address || document.getElementById('f-address').value.trim();
  showToast('AI 整理完成，正在查詢附近地標…', 'success');
  try {
    const nearby = await fetchNearbyLandmarks(address, result.district || '', raw);
    document.getElementById('f-nearby').value = nearby;
    result.nearbyLandmarks = nearby;
  } catch (e) {}

  showToast('AI 整理完成，請再次確認：格局、車位、子母車、寵物、租補、管理費與注意事項是否正確。', 'success');
}

// ===== 台中行政區生活圈關鍵字表（租客搜尋用）=====
const DISTRICT_LANDMARKS = {
  '西屯區': ['逢甲商圈','逢甲大學','逢甲夜市','七期重劃區','臺中國家歌劇院','水湳中央公園','漢口路商圈','新光三越','大遠百','好市多西屯店','麥當勞西屯'],
  '北屯區': ['捷運北屯總站','中清路商圈','北平路商圈','太原車站','昌平路商圈','文心崇德商圈','大坑生活圈','台中慈濟','麥當勞北屯'],
  '北區':   ['捷運文心中清站','捷運文心崇德站','台中公園','一中街商圈','中友百貨','台中一中','台中科技大學','道禾六藝文化館','麥當勞北區'],
  '南區':   ['中興大學','忠孝夜市','台中火車站','中山附醫','麥當勞南區'],
  '西區':   ['勤美商圈','審計新村','美術館','公益路商圈','台中教育大學','麥當勞西區'],
  '南屯區': ['彩虹眷村','公益路商圈','捷運文心森林公園站','黎明新村','文心南路商圈','麥當勞南屯'],
  '東區':   ['LaLaport台中','旱溪夜市','宮原眼科','繼光街商圈','麥當勞東區'],
  '中區':   ['台中火車站','繼光街商圈','宮原眼科','台中公園','麥當勞中區'],
  '霧峰區': ['朝陽科技大學','亞洲大學','霧峰市區','霧峰光復新村','麥當勞霧峰'],
  '大里區': ['大里市區','大里夜市','塗城路商圈','麥當勞大里'],
  '太平區': ['太平市區','長億商圈','麥當勞太平'],
  '沙鹿區': ['靜宜大學','弘光科技大學','沙鹿火車站','麥當勞沙鹿'],
  '清水區': ['清水市區','清水火車站','高美濕地','麥當勞清水'],
  '大雅區': ['中科','大雅市區','學府路商圈','麥當勞大雅'],
  '潭子區': ['頭家厝車站','潭子火車站','潭子市區','麥當勞潭子'],
  '豐原區': ['廟東夜市','豐原火車站','豐原市區','麥當勞豐原'],
  '烏日區': ['台中高鐵站','烏日高鐵特區','烏日市區','麥當勞烏日'],
  '龍井區': ['東海大學','東海商圈','龍井市區','麥當勞龍井'],
  '梧棲區': ['梧棲漁港','台中港','梧棲市區','麥當勞梧棲'],
  '大甲區': ['大甲市區','大甲火車站','鎮瀾宮商圈','麥當勞大甲'],
  '大肚區': ['望高寮夜景公園','大肚市區','麥當勞大肚'],
  '后里區': ['后里馬場','后里綠色走廊','后里市區','麗寶樂園','麥當勞后里'],
};

// 台中知名地標座標表（半徑 500m）
const TC_LANDMARKS = [
  // 大學
  { name:'東海大學',           lat:24.1780, lng:120.6037, r:500 },
  { name:'逢甲大學',           lat:24.1794, lng:120.6500, r:500 },
  { name:'中興大學',           lat:24.1241, lng:120.6751, r:500 },
  { name:'台中科技大學',       lat:24.1500, lng:120.6830, r:500 },
  { name:'台中教育大學',       lat:24.1433, lng:120.6717, r:500 },
  { name:'朝陽科技大學',       lat:24.0686, lng:120.7144, r:500 },
  { name:'靜宜大學',           lat:24.2269, lng:120.5800, r:500 },
  { name:'亞洲大學',           lat:24.0460, lng:120.6870, r:500 },
  { name:'中山醫學大學',       lat:24.1217, lng:120.6514, r:500 },
  { name:'弘光科技大學',       lat:24.2180, lng:120.5822, r:500 },
  { name:'僑光科技大學',       lat:24.1892, lng:120.6441, r:500 },
  { name:'台灣體育大學',       lat:24.1487, lng:120.6877, r:500 },
  { name:'中臺科技大學',       lat:24.1736, lng:120.7394, r:500 },
  // 醫院
  { name:'台中榮總',           lat:24.1686, lng:120.6479, r:500 },
  { name:'中山附醫',           lat:24.1217, lng:120.6514, r:500 },
  { name:'台中慈濟',           lat:24.1770, lng:120.7060, r:500 },
  // 高中
  { name:'台中一中',           lat:24.1534, lng:120.6715, r:500 },
  { name:'台中二中',           lat:24.1268, lng:120.6730, r:500 },
  { name:'文華高中',           lat:24.1720, lng:120.6410, r:500 },
  { name:'台中女中',           lat:24.1480, lng:120.6660, r:500 },
  // 火車站（TRA）
  { name:'台中火車站',         lat:24.1367, lng:120.6847, r:500 },
  { name:'大慶車站',           lat:24.1188, lng:120.6478, r:500 },
  { name:'太原車站',           lat:24.1667, lng:120.7000, r:500 },
  { name:'頭家厝車站',         lat:24.1622, lng:120.7031, r:500 },
  { name:'台中高鐵站',         lat:24.0057, lng:120.5952, r:500 },
  { name:'豐原火車站',         lat:24.2534, lng:120.7183, r:500 },
  // 台中捷運綠線
  { name:'捷運北屯總站',       lat:24.1853, lng:120.7094, r:500 },
  { name:'捷運松竹站',         lat:24.1803, lng:120.7011, r:500 },
  { name:'捷運四維國小站',     lat:24.1711, lng:120.6933, r:500 },
  { name:'捷運文心崇德站',     lat:24.1722, lng:120.6850, r:500 },
  { name:'捷運文心中清站',     lat:24.1733, lng:120.6706, r:500 },
  { name:'捷運市政府站',       lat:24.1622, lng:120.6494, r:500 },
  { name:'捷運文心森林公園站', lat:24.1450, lng:120.6467, r:500 },
  // 夜市 & 商圈
  { name:'逢甲夜市',           lat:24.1794, lng:120.6440, r:500 },
  { name:'一中街商圈',         lat:24.1520, lng:120.6718, r:500 },
  { name:'勤美商圈',           lat:24.1542, lng:120.6590, r:500 },
  { name:'繼光街商圈',         lat:24.1388, lng:120.6817, r:500 },
  { name:'公益路商圈',         lat:24.1430, lng:120.6585, r:500 },
  { name:'旱溪夜市',           lat:24.1336, lng:120.7025, r:500 },
  { name:'崇德路商圈',         lat:24.1870, lng:120.7117, r:500 },
  { name:'昌平路商圈',         lat:24.1800, lng:120.7300, r:500 },
  { name:'中清路商圈',         lat:24.1880, lng:120.6990, r:500 },
  { name:'北平路商圈',         lat:24.1650, lng:120.6930, r:500 },
  { name:'漢口路商圈',         lat:24.1750, lng:120.6680, r:500 },
  { name:'軍功路商圈',         lat:24.1690, lng:120.7000, r:500 },
  { name:'豐原廟東夜市',       lat:24.2540, lng:120.7182, r:500 },
  { name:'水湳經貿園區',       lat:24.1740, lng:120.6640, r:500 },
  // 百貨 & 賣場
  { name:'好市多(西屯)',       lat:24.1803, lng:120.6290, r:500 },
  { name:'大遠百',             lat:24.1684, lng:120.6378, r:500 },
  { name:'老虎城購物中心',     lat:24.1694, lng:120.6365, r:500 },
  { name:'中友百貨',           lat:24.1535, lng:120.6713, r:500 },
  { name:'新光三越(台中)',     lat:24.1561, lng:120.6569, r:500 },
  { name:'大里大買家',         lat:24.0985, lng:120.6900, r:500 },
  { name:'LaLaport台中',       lat:24.1340, lng:120.7030, r:500 },
  // 景點 & 文化
  { name:'臺中國家歌劇院',     lat:24.1631, lng:120.6406, r:500 },
  { name:'宮原眼科',           lat:24.1372, lng:120.6812, r:500 },
  { name:'台中公園',           lat:24.1440, lng:120.6840, r:500 },
  { name:'審計新村',           lat:24.1528, lng:120.6567, r:500 },
  { name:'彩虹眷村',           lat:24.1336, lng:120.6098, r:500 },
  { name:'道禾六藝文化館',     lat:24.1488, lng:120.6730, r:500 },
  { name:'美術館',             lat:24.1530, lng:120.6590, r:500 },
  { name:'忠孝夜市',           lat:24.1283, lng:120.6744, r:500 },
  { name:'高美濕地',           lat:24.3111, lng:120.5498, r:500 },
  { name:'望高寮夜景公園',     lat:24.1234, lng:120.5606, r:500 },
  { name:'麗寶樂園',           lat:24.3640, lng:120.6810, r:500 },
  { name:'后里馬場',           lat:24.3620, lng:120.7180, r:500 },
  // 重劃區 & 園區
  { name:'七期重劃區',         lat:24.1560, lng:120.6360, r:500 },
  { name:'水湳中央公園',       lat:24.1750, lng:120.6510, r:500 },
  { name:'中科',               lat:24.2209, lng:120.5964, r:500 },
  { name:'烏日高鐵特區',       lat:24.0100, lng:120.5970, r:500 },
  // 各區
  { name:'霧峰光復新村',       lat:24.0570, lng:120.7240, r:500 },
  { name:'霧峰市區',           lat:24.0710, lng:120.7155, r:500 },
  { name:'大里市區',           lat:24.0949, lng:120.6850, r:500 },
  { name:'大里夜市',           lat:24.1020, lng:120.6780, r:500 },
  { name:'太平市區',           lat:24.1288, lng:120.7190, r:500 },
  { name:'黎明新村',           lat:24.1290, lng:120.6440, r:500 },
  { name:'文心南路商圈',       lat:24.1300, lng:120.6560, r:500 },
  { name:'后里馬場',           lat:24.3020, lng:120.7350, r:500 },
  { name:'麗寶樂園',           lat:24.2950, lng:120.7400, r:500 },
  { name:'后里市區',           lat:24.3010, lng:120.7280, r:500 },
  // 麥當勞 - 各區
  { name:'麥當勞西屯',         lat:24.1750, lng:120.6400, r:500 },
  { name:'麥當勞北屯',         lat:24.1850, lng:120.7050, r:500 },
  { name:'麥當勞北區',         lat:24.1500, lng:120.6750, r:500 },
  { name:'麥當勞南區',         lat:24.1200, lng:120.6850, r:500 },
  { name:'麥當勞西區',         lat:24.1550, lng:120.6600, r:500 },
  { name:'麥當勞南屯',         lat:24.1350, lng:120.6550, r:500 },
  { name:'麥當勞東區',         lat:24.1350, lng:120.7050, r:500 },
  { name:'麥當勞中區',         lat:24.1380, lng:120.6840, r:500 },
  { name:'麥當勞霧峰',         lat:24.0650, lng:120.7200, r:500 },
  { name:'麥當勞大里',         lat:24.0950, lng:120.6880, r:500 },
  { name:'麥當勞太平',         lat:24.1280, lng:120.7150, r:500 },
  { name:'麥當勞沙鹿',         lat:24.2280, lng:120.5850, r:500 },
  { name:'麥當勞清水',         lat:24.2600, lng:120.5680, r:500 },
  { name:'麥當勞大雅',         lat:24.2300, lng:120.6050, r:500 },
  { name:'麥當勞潭子',         lat:24.1720, lng:120.7050, r:500 },
  { name:'麥當勞豐原',         lat:24.2550, lng:120.7200, r:500 },
  { name:'麥當勞烏日',         lat:24.0050, lng:120.6050, r:500 },
  { name:'麥當勞龍井',         lat:24.1800, lng:120.6350, r:500 },
  { name:'麥當勞梧棲',         lat:24.2450, lng:120.5500, r:500 },
  { name:'麥當勞大甲',         lat:24.3550, lng:120.6780, r:500 },
  { name:'麥當勞大肚',         lat:24.1100, lng:120.5850, r:500 },
  { name:'麥當勞后里',         lat:24.3050, lng:120.7320, r:500 },
];

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ===== Google Maps Geocoding API Key 管理 =====
function saveGoogleKey() {
  const key = document.getElementById('settings-google-key').value.trim();
  if (!key) { showToast('請輸入 API Key', 'error'); return; }
  localStorage.setItem('mimi_google_geocode_key', key);
  document.getElementById('settings-google-key').value = '';
  updateKeyStatus();
  showToast('API Key 已儲存', 'success');
}
function clearGoogleKey() {
  localStorage.removeItem('mimi_google_geocode_key');
  document.getElementById('settings-google-key').value = '';
  updateKeyStatus();
  showToast('API Key 已清除，將改用 OpenStreetMap', 'success');
}
function updateKeyStatus() {
  const el = document.getElementById('settings-key-status');
  if (!el) return;
  const key = localStorage.getItem('mimi_google_geocode_key');
  el.textContent = key
    ? `✅ 已設定 Google Maps API Key（${key.slice(0,8)}…），地標查詢使用 Google`
    : '⚠️ 尚未設定，目前使用 OpenStreetMap（準確率較低）';
  el.style.color = key ? '#2d7a2d' : '#b06000';
}
document.addEventListener('DOMContentLoaded', updateKeyStatus);

// ===== Google Geocoding =====
async function googleGeocode(address) {
  const key = localStorage.getItem('mimi_google_geocode_key');
  if (!key) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}&language=zh-TW&region=tw`
    );
    const data = await res.json();
    if (data.status === 'OK' && data.results[0]) {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lon: loc.lng };
    }
  } catch(e) {}
  return null;
}

// ===== Nominatim fallback =====
async function nominatimSearch(q) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=tw`,
      { headers: { 'Accept-Language': 'zh-TW', 'User-Agent': 'MimiHomeRental/1.0' } }
    );
    const data = await res.json();
    return (data && data[0]) ? data[0] : null;
  } catch(e) { return null; }
}

async function fetchNearbyLandmarks(address, district, rawText) {
  const result = [];
  const seen = new Set();
  function add(name) {
    if (!seen.has(name)) { seen.add(name); result.push(name); }
  }

  // Step 1：地址 geocoding → 座標比對
  if (address) {
    let cleaned = address
      .replace(/[A-Za-z0-9]+\s*房\s*/g, '')
      .replace(/[A-Za-z]\s*棟\s*/g, '')
      .replace(/\d+\s*[樓층F]\s*/gi, '')
      .replace(/號之\s*\d+/g, '號')
      .replace(/\s*之\s*\d+/g, '')
      .replace(/\s+/g, ' ').trim();

    const fullQuery = cleaned + ' 台中市 台灣';
    let lat = null, lng = null;

    const gResult = await googleGeocode(fullQuery);
    if (gResult) { lat = gResult.lat; lng = gResult.lon; }

    if (!lat) {
      let found = await nominatimSearch(fullQuery);
      if (!found) found = await nominatimSearch(cleaned.replace(/\d+號.*$/, '').trim() + ' 台中市 台灣');
      if (!found) {
        const roadOnly = cleaned.replace(/\d+巷.*$/, '').replace(/\d+弄.*$/, '').replace(/\d+號.*$/, '').trim();
        if (roadOnly !== cleaned) found = await nominatimSearch(roadOnly + ' 台中市 台灣');
      }
      if (!found) {
        const m = cleaned.match(/^(.+?[區鄉鎮市])(.+?[路街道巷])/);
        if (m) found = await nominatimSearch(m[1] + m[2] + ' 台中市 台灣');
      }
      if (found) { lat = parseFloat(found.lat); lng = parseFloat(found.lon); }
    }

    if (lat) {
      const schoolKeywords = ['大學', '科大', '學院', '高中', '中學'];
      const isSchool = name => schoolKeywords.some(k => name.includes(k));
      const withDist = TC_LANDMARKS.map(lm => ({ ...lm, dist: haversineM(lat, lng, lm.lat, lm.lng) }));
      const added = new Set();
      for (const radius of [50, 100, 200, 300, 400, 500]) {
        if (result.length >= 3) break;
        withDist
          .filter(lm => lm.dist <= radius && !added.has(lm.name))
          .sort((a, b) => {
            const aSchool = isSchool(a.name) ? 0 : 1;
            const bSchool = isSchool(b.name) ? 0 : 1;
            if (aSchool !== bSchool) return aSchool - bSchool;
            return a.dist - b.dist;
          })
          .forEach(lm => {
            if (result.length < 3 && !added.has(lm.name)) {
              add(lm.name);
              added.add(lm.name);
            }
          });
      }
    }
  }

  // Step 2：路名、關鍵字偵測（地址 + 全文）
  const searchText = (address || '') + ' ' + (rawText || '') + ' ' + district;
  detectKeywordLandmarks(searchText).forEach(add);

  // Step 3：行政區補滿至 3 個
  const districtList = DISTRICT_LANDMARKS[district] || [];
  for (const name of districtList) {
    if (result.length >= 3) break;
    add(name);
  }

  return result.slice(0, 3).join('、');
}

// ===== 格局分類判斷（根據完整格局推導分類用於前台篩選）=====
function deriveLayoutCategory(fullLayout, propType) {
  if (!fullLayout) return '';

  // 如果已經是「套房」，直接返回
  if (/^套房$/.test(fullLayout)) return '套房';

  // 解析房數（如「1房」、「1+1房」、「2房」等）
  const roomMatch = fullLayout.match(/^(\d+(?:\+\d+)?)\s?房/);
  if (!roomMatch) return '';

  const roomPart = roomMatch[1]; // 如「1」、「1+1」、「2」等

  // 判斷是否為套房：1房 + 只有衛（沒有廳）= 套房
  const hasHall = /廳/.test(fullLayout);
  const isSuite = roomPart === '1' && !hasHall;

  if (isSuite) return '套房';
  else return roomPart + '房';
}

function parsePropertyText(text) {
  const result = {};

  // 正規化：🉑（「可」的方框字 emoji）→ 「可」字，讓 可租補 / 可開伙 等偵測吃得到
  text = (text || '').replace(/🉑️|🉑/g, '可');

  // ===== HELPER: extract field from "label：value" lines =====
  function field(patterns) {
    for (const p of patterns) {
      const re = new RegExp('(?:^|\\n)' + p + '[\\s:：]+([^\\n]+)', 'i');
      const m = text.match(re);
      if (m) return m[1].trim();
    }
    return '';
  }

  const rawRent    = field(['租金','月租']);
  const rawMgmt    = field(['管理費']);
  const rawDistrict= field(['地址','位置']);
  // 儲存原始地址供地址欄位使用
  if (rawDistrict) result.address = rawDistrict;
  const rawSize    = field(['坪數','面積']);
  const rawType    = field(['類型','物件類型','性質']);
  const rawFloor   = field(['樓層']);
  const rawParking = field(['車位','停車']);
  const rawCommunity = field(['社區名稱','大樓名稱','社區']);
  const rawWater   = field(['水電','用電']);
  const rawEquip   = field(['設備','傢俱']);
  const rawSubmother = field(['子母車']);
  const rawInternet  = field(['網路第四台','網路']);
  const rawNotes   = field(['備註']);

  // ===== DISTRICT (from address field or anywhere in text) =====
  const districts = ['中區','東區','南區','西區','北區','北屯區','西屯區','南屯區','太平區','大里區','霧峰區','烏日區','豐原區','潭子區','大雅區','沙鹿區','清水區','梧棲區','龍井區','大肚區','大甲區','后里區'];
  for (const d of districts) {
    if (text.includes(d)) { result.district = d; break; }
  }

  // ===== RENT = base + management fee + parking fee =====
  let baseRent = 0, mgmtFee = 0, parkingFeeRent = 0;
  // 先處理租金：如果有括號，只取括號外的數字
  let rentWithoutBracket = rawRent.replace(/\([^)]*\)/g, '').trim();
  const rentNum = rentWithoutBracket.match(/(\d[\d,]+)/);
  if (rentNum) baseRent = parseInt(rentNum[1].replace(/,/g,''));
  if (!baseRent) {
    const m = text.match(/(?:月租|租金)[：:\s]?\$?(\d[\d,]+)(?![^(]*\))/);
    if (m) baseRent = parseInt(m[1].replace(/,/g,''));
  }
  const mgmtNum = rawMgmt.match(/(\d[\d,]+)/);
  if (mgmtNum) mgmtFee = parseInt(mgmtNum[1].replace(/,/g,''));
  // 車位費：只提取有金額標記的數字（$、元、NT）或括號中的數字
  const parkingRentStr = (rawParking || '').split(/[；;]/)[0];
  let parkingFeeRentM = parkingRentStr.match(/[\$￥]([\d,]+)|(\d[\d,]+)(?=元|NT)/);
  if (parkingFeeRentM) {
    parkingFeeRent = parseInt((parkingFeeRentM[1] || parkingFeeRentM[2]).replace(/,/g,''));
  }
  if (baseRent > 0) {
    result.rent = baseRent + mgmtFee + parkingFeeRent;
    result._baseRent = baseRent;
    result._mgmtFee = mgmtFee;
    result._parkingFeeRent = parkingFeeRent;
  }

  // ===== SIZE =====
  const sizeRaw = rawSize || '';
  const sizeM = sizeRaw.match(/(\d+(?:\.\d+)?)/) || text.match(/(\d+(?:\.\d+)?)\s?坪/);
  if (sizeM) result.size = parseFloat(sizeM[1]);

  // ===== TYPE (商業類型優先抓取；住宅類型則依規則判斷斜線後內容) =====
  let propType = '';

  // 先檢查商業類型
  if (/辦公/.test(rawType))               propType = '辦公室';
  else if (/廠房/.test(rawType))          propType = '廠房';
  else if (/倉庫/.test(rawType))          propType = '倉庫';
  else if (/店面/.test(rawType))          propType = '店面';
  else {
    // 住宅類型：優先取斜線後面的內容（如「西屯區套房/電梯大樓」→ 取「電梯大樓」）
    let typeForCheck = rawType;
    const slashMatch = rawType.match(/[\/\\](.+)$/);
    if (slashMatch) {
      typeForCheck = slashMatch[1].trim();
    }
    const typeStr = typeForCheck + ' ' + text;

    // 完整保留「電梯透天」、「電梯大樓」等組合
    // 「電梯透天」和「透天電梯」視為同一類型
    if (/電梯透天|透天電梯/.test(typeStr)) propType = '電梯透天';
    else if (/電梯大樓|大樓/.test(typeStr)) propType = '電梯大樓';
    else if (/透天/.test(typeStr))        propType = '透天';
    else if (/公寓/.test(typeStr))        propType = '公寓';
    // 套房不放類型，放 layoutCategory
  }
  if (propType) result.type = propType;

  // Is this a commercial property?
  const isCommercial = ['辦公室','廠房','倉庫','店面'].includes(propType);

  // ===== LAYOUT — only for residential =====
  if (!isCommercial) {
    // 優先：從「格局：」欄位完整抓取
    const rawLayout = field(['格局','房型','室型']);
    if (rawLayout) {
      const zhNum = {'一':1,'二':2,'兩':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
      const toArabic = s => s.replace(/[一二兩三四五六七八九](?=房|廳|衛|廁|陽台|浴)/g, m => zhNum[m] || m);
      result.layout = toArabic(rawLayout).replace(/[，,。].*$/, '').replace(/\s*(座向|朝向|方位|面向).*$/i, '').trim();
    } else if (/套房/.test(text) && !/[2-9]\s?房/.test(text) && !/廳|衛|陽台/.test(text)) {
      result.layout = '套房';
    } else {
      // 嘗試完整格局字串，例如 1+1房1廳1衛1陽台 / 3房2廳2衛 / 2+1房1廳
      const fullLayout = text.match(/(\d+(?:\+\d+)?)\s?房\s*(\d+廳)?\s*(\d+衛)?\s*(\d+陽台)?/);
      if (fullLayout) {
        let layout = fullLayout[1] + '房';
        if (fullLayout[2]) layout += fullLayout[2];
        if (fullLayout[3]) layout += fullLayout[3];
        if (fullLayout[4]) layout += fullLayout[4];
        // 只有「X房」時不加廳衛（太少資訊），否則才保留完整
        result.layout = layout;
      }
    }
  }
  // Commercial: leave layout blank — admin can fill manually if needed

  // ===== LAYOUT CATEGORY（用於前台篩選）=====
  // 套房判斷：類型含套房、layout 是套房、或 rawType 含套房
  const isSuiteType = /套房/.test(rawType);
  result.layoutCategory = deriveLayoutCategory(result.layout || '', isSuiteType ? '套房' : propType);

  // ===== FLOOR =====
  let currentFloor = 0, totalFloors = 0;
  let floorLabel = '';
  if (rawFloor) {
    const fm = rawFloor.match(/(\d+)\s?[\/\\]\s?(\d+)/);
    if (fm) {
      currentFloor = parseInt(fm[1]);
      totalFloors  = parseInt(fm[2]);
      floorLabel   = String(currentFloor);
    } else if (/整棟/.test(rawFloor)) {
      const fn = rawFloor.match(/(\d+)/);
      if (fn) { currentFloor = parseInt(fn[1]); totalFloors = currentFloor; }
      floorLabel = rawFloor.replace(/[：:\s]/g, '').trim();
    } else {
      const f1 = rawFloor.match(/(\d+)/);
      if (f1) { currentFloor = parseInt(f1[1]); floorLabel = String(currentFloor); }
    }
  }
  result.floor       = floorLabel;
  result.totalFloors = totalFloors;

  // ===== 子母車（垃圾集中設施，與車位完全無關）=====
  const submotherSelfManage = /自理/.test(rawSubmother);
  const hasSubmother = !submotherSelfManage
    && /子母車|垃圾集中|免追垃圾車|不用追垃圾車/.test(rawSubmother + ' ' + text)
    && !/子母車[：:\s]*無|沒有子母車/.test(text);

  // ===== PARKING（嚴格：只有明確車位關鍵字才算，子母車絕對不算）=====
  const parkingStr = rawParking || '';
  const parkingExplicitNo = /^(無|沒有|不含|無車位|無停車)/.test(parkingStr.trim());
  const fakeParking = /騎樓|路邊|隨到隨停|自行|公共停車|附近停車|自找/.test(parkingStr);
  // 只有這些關鍵字才算有車位
  // 社區可另租車位 → 不算附車位，只在缺點提醒
  const isParkingCommunityRentable = /社區可另租|可另租車位|社區另租/.test(parkingStr);
  const parkingKeywords = !isParkingCommunityRentable && /平車|機械車位|坡道平面|坡道機械|B[123]車位|汽車位|機車位|門前停車|附車位|含車位|車位另租|車位費|雙平車|地下停車位/.test(parkingStr);
  const hasParking = parkingKeywords && !parkingExplicitNo && !fakeParking;
  // 若車位欄為空，掃全文（仍排除子母車相關字）
  const hasParking2 = !rawParking && !parkingExplicitNo &&
    /平面車位|機械車位|地下停車位|坡道車位|汽車位|機車位|門前停車|附車位|含車位|車位另租/.test(text);
  const parkingActive = hasParking || hasParking2;
  const isDoubleParking = parkingActive && /雙/.test(parkingStr + text);
  const isParkingExtra = parkingActive && /另計|另租|另外/.test(parkingStr);
  const parkingLabel = isDoubleParking ? '雙平面車位'
    : /平車|坡道平面/.test(parkingStr) ? '平面車位'
    : /機械/.test(parkingStr) ? '機械車位'
    : /地下/.test(parkingStr) ? '地下停車位'
    : /機車位/.test(parkingStr) ? '機車位'
    : /門前/.test(parkingStr) ? '門前停車'
    : '車位';

  // nearby 由 fetchNearbyLandmarks 非同步填入，此處不預先設定


  // ===== 租客偏好（寫進優點，不加標籤）=====
  let tenantPref = '';
  const strictFemale = /限女生|僅限女性|只限女生|限女性/.test(text);
  const prefFemale   = /儘量女生|適合女生|女生優先|女性優先|歡迎女生|偏好女生/.test(text);
  const strictMale   = /限男生|僅限男性|只限男生/.test(text);
  const prefMale     = /儘量男生|適合男生|男生優先|男性優先|歡迎男生|偏好男生/.test(text);
  if (strictFemale) tenantPref = '🌷限女生入住';
  else if (prefFemale) tenantPref = '女生優先🌷';
  else if (strictMale) tenantPref = '🧢限男生入住';
  else if (prefMale) tenantPref = '男生優先🧢';
  if (/儘量學生|適合學生|學生優先|歡迎學生|限學生/.test(text))
    tenantPref = tenantPref ? tenantPref + '、學生優先' : '學生優先';

  // ===== 寵物矛盾偵測 =====
  const rawPet = field(['寵物','動物']);
  const petAllowText = /可寵物|寵物友善|歡迎寵物|可帶寵物|可貓可狗|可養貓|可養狗|可貓|可狗/.test(text);
  const petBanText   = /禁寵|不可寵|謝絕寵物|禁止寵物|寵物[：:]\s*❌|不養寵物|🈲寵|禁貓狗|不可貓不可狗/.test(text);
  const petConflict  = petAllowText && petBanText;

  // ===== TAGS =====
  const tags = [];

  // 可租補 / 可雙租補（精確規則：只要出現以下文字就要勾選）
  const hasDouble = /雙租補|可雙補|雙補/.test(text) && !/不可租補/.test(text);
  const hasSingle = /可租補|租補|可補助|補助|可租屋補助|可申請補助/.test(text) && !/不可租補|不可申請租補|無法租補|租補不可/.test(text);
  if (hasDouble || hasSingle) tags.push('可租補');
  if (hasDouble) tags.push('可雙租補');

  // 寵物（有矛盾就不自動勾）
  if (!petConflict) {
    const petFriendly = /可寵物|寵物友善|歡迎寵物|可帶寵物|可貓可狗/.test(text);
    if ((petFriendly || /可養狗|可狗|歡迎狗|寵物可狗/.test(text)) && !/不可狗|禁狗/.test(text)) tags.push('可狗');
    if ((petFriendly || /可養貓|可貓|歡迎貓|寵物可貓/.test(text)) && !/不可貓|禁貓/.test(text)) tags.push('可貓');
  }

  // 台水 / 台電（排除「水X元/電X元」自訂計費）
  const waterElecRaw = rawWater + ' ' + text;
  const isFlatRate = /水\s*\d+[元\/]|電\s*\d+[元度\/]/.test(waterElecRaw);
  const hasTaiWater = !isFlatRate && /台水電|台水台電|台電台水|台灣自來水|台水/.test(waterElecRaw);
  const hasTaiElec  = !isFlatRate && /台水電|台水台電|台電台水|台電分算|台灣電力|台電|水電照帳單/.test(waterElecRaw);
  if (hasTaiWater) tags.push('台水');
  if (hasTaiElec)  tags.push('台電');

  // 可開伙（排除不可開伙）
  if (/可開伙|可煮|可電磁爐|廚房可用|開放開伙|開伙/.test(text) && !/不可開伙|禁止開伙|不開伙|不可煮/.test(text))
    tags.push('可開伙');

  // 獨洗曬（精確規則：只要出現以下文字就要勾選；但「共洗」或「投幣洗衣」不算）
  const hasSharedWash = /共洗|公共洗衣|投幣式/.test(text);
  if (!hasSharedWash && /獨洗曬|獨洗|陽台獨洗曬|凸窗曬|獨洗凸窗曬|大凸窗獨曬|洗衣機獨立|獨立洗衣機|獨立曬衣|獨洗獨曬/.test(text))
    tags.push('獨洗曬');

  // 車位（子母車不算）
  if (parkingActive) tags.push('車位');

  // 陽台
  if (/陽台/.test(text)) tags.push('陽台');

  // 衛浴乾濕分離
  if (/乾濕分離/.test(text)) tags.push('衛浴乾濕分離');

  // 變頻冷氣（只有「變頻冷氣」才算，單純「冷氣」不算）
  if (/變頻冷氣/.test(text)) tags.push('變頻冷氣');

  // 管理室
  if (/管理室|有管理員|警衛室|24小時管理/.test(text)) tags.push('管理室');

  // 子母車（垃圾集中，與車位無關）
  if (hasSubmother) tags.push('子母車');

  // 飲水機
  if (/飲水機|公共飲水機|附飲水機/.test(text) && !/無飲水機|不含飲水機|沒有飲水機/.test(text)) tags.push('飲水機');

  // 網路（✅網路 視為有；❌網路 視為無；「網路第四台：有」或「網路第四台：網路」代表有網路）
  const internetVal = rawInternet.trim();
  const internetFieldYes = internetVal &&
    /^有$|✅|有網路|有.*網路|網路|第四台|光纖|wi-?fi/i.test(internetVal) &&
    !/^無$|無網路|沒有|❌|不含/.test(internetVal);
  const hasNetworkPos = internetFieldYes || /✅網路|含網路|有網路|網路有|配有網路|光纖|wi-fi|wifi|網路含|網路費/i.test(text);
  const hasNetworkNeg = /❌網路|無網路|不含網路|網路[：:\s]*無|網路[：:\s]*❌/.test(text);
  if (hasNetworkPos && !hasNetworkNeg) tags.push('網路');


  result.tags = tags;

  // ===== HIGHLIGHTS（新規則：按順序排列）=====
  // 1. 水電計費
  // 2. 設備狀況
  // 3. 網路／第四台
  // 4. 寵物條件
  // 5. 租補條件
  // 6. 洗曬方式
  // 7. 其他加分條件
  const hl = [];

  // 1. 水電計費（保留原始短句）
  if (rawWater) {
    hl.push(rawWater.replace(/[\/\\]/g, '／').replace(/\s+/g, '').trim());
  }

  // 2. 設備狀況（只寫「設備全配」或「設備全配（無X）」，不寫管理費）
  const hasFullEquip = /設備全配|全配|設備齊全|家電齊全|傢俱家電齊|全套家電/.test(text);
  if (hasFullEquip) {
    const noTV = /無電視|沒電視|不含電視|無TV/.test(text);
    hl.push(noTV ? '設備全配（無電視）' : '設備全配');
  }

  // 3. 網路／第四台（只寫有的，不寫無的）
  const hasCableTV  = /第四台/.test(text) && !/無第四台|不含第四台/.test(text);
  const hasSmartTV  = /聯網電視|連網電視|智慧電視|Smart TV/i.test(text);
  if (internetFieldYes || (hasNetworkPos && !hasNetworkNeg)) {
    if (hasSmartTV)      hl.push('網路＋聯網電視');
    else if (hasCableTV) hl.push('網路＋第四台');
    else                 hl.push('網路');
  }

  // 4. 寵物條件（可貓可狗 / 可狗 / 可貓）
  if (tags.includes('可狗') && tags.includes('可貓')) hl.push('可貓可狗');
  else if (tags.includes('可狗'))  hl.push('可狗');
  else if (tags.includes('可貓'))  hl.push('可貓');

  // 5. 租補條件
  if (tags.includes('可雙租補'))    hl.push('可租補 可雙租補');
  else if (tags.includes('可租補')) hl.push('可租補');

  // 6. 洗曬方式（根據實際文本判斷）
  if (tags.includes('獨洗曬')) {
    if (/凸窗曬|凸窗.*曬|可凸窗曬/.test(text)) {
      hl.push('獨洗凸窗曬');
    } else if (/陽台.*曬|曬.*陽台|陽台曬|陽台獨洗曬|陽台獨洗|陽台曬衣/.test(text)) {
      hl.push('陽台獨洗曬');
    } else {
      hl.push('獨立洗曬');
    }
  }

  // 7. 其他加分條件（開伙、可報稅、可營登等）
  if (tags.includes('可開伙')) {
    if (/電磁爐|可電磁爐/.test(text)) hl.push('可電磁爐');
    else hl.push('可開伙');
  }
  if (/可報稅|可申報/.test(text)) hl.push('可報稅');
  if (/可營登/.test(text))        hl.push('可營登');

  result.highlights = hl.filter(Boolean).join('、');

  // ===== PROS (完整亮點說明，前面加「・」) =====
  const pros = [];

  // 租客偏好最優先
  if (tenantPref) pros.push(tenantPref);

  // 樓層（只有原始資料明確說高採光/景觀，或 8F 以上才寫）
  if (currentFloor >= 8 || /高採光|景觀佳|視野佳|高樓層.*採光|採光.*高樓/.test(text))
    pros.push(`高樓層（${currentFloor}F）`);
  if (result.size && result.size >= 30) pros.push(`坪數 ${result.size} 坪`);
  if (/樓中樓/.test(text)) pros.push('樓中樓格局');
  if (/獨立出入|獨立門口|獨立入口|專用入口/.test(text)) pros.push('獨立出入口');
  if (/邊間/.test(text)) pros.push('邊間格局');

  // 採光
  if (/採光佳|採光好|採光充足|全明/.test(text)) pros.push('採光佳');
  if (/凸窗曬|凸窗.*曬|可凸窗曬/.test(text)) pros.push('凸窗可曬衣');
  else if (!tags.includes('獨洗曬') && !tags.includes('陽台') && /大凸窗|凸窗/.test(text)) pros.push('大凸窗');

  // 洗曬
  if (tags.includes('獨洗曬'))        pros.push('陽台獨洗曬');
  else if (tags.includes('陽台') && /陽台.*曬|曬.*陽台/.test(text)) pros.push('有陽台可曬衣');
  else if (tags.includes('陽台'))     pros.push('有陽台');

  // 洗衣設備
  if (/洗脫烘|烘乾洗衣機|洗脫烘洗衣機/.test(text)) pros.push('洗脫烘洗衣機');

  // 衛浴
  if (tags.includes('衛浴乾濕分離')) pros.push('衛浴乾濕分離');
  if (/衛浴開窗|浴室開窗|廁所開窗|衛浴.*有窗|浴室.*有窗/.test(text)) pros.push('衛浴開窗');
  if (/浴缸/.test(text) && !/無浴缸|沒有浴缸|不含浴缸/.test(text)) pros.push('附浴缸');

  // 料理
  if (tags.includes('可開伙')) {
    if (/電磁爐|可電磁爐/.test(text)) pros.push('可電磁爐');
    else pros.push('可開伙');
  } else if (/流理台|流理臺|流理檯|廚台|水槽廚台/.test(text)) pros.push('附流理台');

  // 設備
  if (/雙門.*冰箱|冰箱.*雙門|大冰箱/.test(text)) pros.push('雙門大冰箱');
  if (tags.includes('變頻冷氣'))      pros.push('變頻冷氣');
  if (hasSmartTV)                     pros.push('附聯網電視');
  if (/RO逆滲透|逆滲透飲水機|RO飲水機/.test(text)) pros.push('RO逆滲透飲水機');
  if (/專人代收|有人代收|管理員代收|代收包裹/.test(text)) pros.push('有專人代收包裹');

  // 床 / 收納
  const hasLatex   = /乳膠.*床墊|床墊.*乳膠/.test(text);
  const hasLiftBed = /可掀式|掀床|掀式床板/.test(text);
  if (hasLatex && hasLiftBed) pros.push('乳膠床墊＋可掀式床板');
  else if (hasLatex)          pros.push('乳膠床墊');
  else if (hasLiftBed)        pros.push('可掀式床板');
  if (/大衣櫃|衣櫃寬|大型衣櫃/.test(text)) pros.push('附大衣櫃');

  // 停車
  if (/遮雨棚|有棚|棚式|雨棚/.test(parkingStr + ' ' + text)) pros.push('停車位附遮雨棚');
  if (parkingActive && isDoubleParking)  pros.push('雙停車位');
  else if (parkingActive && !isParkingExtra) pros.push('附停車位');

  // 社區設施
  if (/健身房/.test(text))                   pros.push('社區附健身房');
  if (/烹飪室|烹飪教室|公共廚房/.test(text)) pros.push('附社區烹飪室');
  if (tags.includes('管理室'))               pros.push('設有管理室');

  // 水電透明
  if (tags.includes('台水') && tags.includes('台電')) pros.push('台水台電');
  else if (tags.includes('台電'))            pros.push('台電分算');

  // 子母車
  if (hasSubmother) pros.push('有子母車');

  // 水電計費
  if (rawWater) {
    const waterText = rawWater.replace(/[\/\\]/g, '／').replace(/\s+/g, '').trim();
    pros.push(waterText);
  }

  // 寵物
  if (tags.includes('可狗') && tags.includes('可貓')) pros.push('可貓可狗');
  else if (tags.includes('可狗'))  pros.push('可狗');
  else if (tags.includes('可貓'))  pros.push('可貓');

  // 租補
  if (tags.includes('可雙租補'))   pros.push('可租補＆可雙租補');
  else if (tags.includes('可租補')) pros.push('可租補');

  // 網路
  if (internetFieldYes || (hasNetworkPos && !hasNetworkNeg)) {
    if (hasSmartTV)      pros.push('有網路＋聯網電視');
    else if (hasCableTV) pros.push('有網路＋第四台');
    else                 pros.push('有網路');
  }

  // 獨洗曬
  if (tags.includes('獨洗曬')) {
    if (/凸窗曬|凸窗.*曬|可凸窗曬/.test(text))
      pros.push('獨洗＋凸窗曬');
    else
      pros.push('獨立洗衣曬衣');
  }

  if (pros.length > 0) result.pros = pros.map(p => `• ${p}`).join('\n');

  // ===== CONS (⚠️ 可能需要注意的地方) =====
  const cons = [];

  // 爬樓梯
  const hasElevator = /電梯大樓|透天電梯|有電梯|附電梯/.test(text) || propType === '電梯大樓' || propType === '透天電梯';
  if (!isCommercial && currentFloor >= 3 && !hasElevator) {
    if (/整棟/.test(rawFloor)) cons.push(`整棟 ${currentFloor} 樓，需自行爬樓梯`);
    else cons.push(`無電梯（${currentFloor} 樓），需爬樓梯`);
  }

  // 禁菸
  if (/完全禁菸|全面禁菸|完全禁煙|全面禁煙/.test(text)) cons.push('完全禁菸（含電子菸）');
  else if (/禁菸|禁煙|不可抽菸|不可抽煙|禁止吸菸|禁止吸煙|不可吸菸|不可吸煙/.test(text)) cons.push('禁菸');

  // 禁八大
  if (/禁八大|八大行業/.test(text)) cons.push('禁止八大行業');

  // 性別限制
  if (tenantPref && /限/.test(tenantPref)) cons.push(tenantPref);

  // 洗衣 / 曬衣共用
  if (!tags.includes('獨洗曬')) {
    const hasSharedWash = /共洗|公共洗衣|共用洗衣/.test(text);
    const hasDryBalcony = /陽台曬|凸窗曬|曬.*陽台/.test(text);
    const hasSharedDry  = /共曬|公共曬|頂樓曬|共洗曬|公共洗曬|共用洗曬/.test(text);
    const floorDryM = text.match(/(\d+)\s?樓曬/);
    if (hasSharedWash && hasDryBalcony)     cons.push('洗衣機為共用，可在自家陽台曬衣');
    else if (hasSharedWash && floorDryM)    cons.push(`洗衣機共用，曬衣空間在 ${floorDryM[1]} 樓`);
    else if (hasSharedWash && /頂樓曬/.test(text)) cons.push('洗衣機共用，曬衣空間在頂樓');
    else if (hasSharedDry || hasSharedWash) cons.push('洗衣機與曬衣空間為共用');
  }
  // 洗衣機在X樓
  const washFloorM = text.match(/洗衣機.*?在\s*(\d+)\s*[FfＦ樓]/);
  if (washFloorM && !tags.includes('獨洗曬')) cons.push(`洗衣機在 ${washFloorM[1]} 樓共用`);

  // 投幣洗衣機 → 注意
  const coinWashM = text.match(/投幣.*?(\d+)元|洗衣.*?(\d+)元.*?投幣|投幣式.*?(\d+)/);
  if (coinWashM) {
    const fee = coinWashM[1] || coinWashM[2] || coinWashM[3];
    cons.push(`投幣式洗衣機，$${fee}/次`);
  } else if (/投幣.*洗衣|洗衣.*投幣/.test(text)) {
    cons.push('投幣式洗衣機');
  }

  // 子母車位置 / 自理（子母車自理一定要放在注意事項）
  const submotherFloorM = text.match(/子母車.*?在\s*(\d+)\s*[FfＦ樓]|(\d+)\s*[FfＦ樓].*?子母車/);
  if (submotherFloorM) {
    const fl = submotherFloorM[1] || submotherFloorM[2];
    cons.push(`子母車在 ${fl} 樓`);
  }
  if (submotherSelfManage) cons.push('子母車自理，垃圾需自行處理');

  // 開伙限制
  if (/不可開伙|禁止開伙|不開伙|不可煮/.test(text)) cons.push('不可開伙');
  else if (/不可明火|不能明火/.test(text))           cons.push('禁明火，可使用電磁爐');

  // 禁寵（嚴格：只要有可貓/可狗就不輸出）
  const strictPetBan = /禁寵|不可寵|謝絕寵物|禁止寵物|寵物[：:]\s*❌|不養寵物|🈲寵|禁貓狗|不可貓不可狗/.test(text);
  if (strictPetBan && !petAllowText) cons.push('禁寵');

  // 寵物附加條件（有養寵物才寫）
  const hasPetTag = tags.includes('可狗') || tags.includes('可貓');
  if (hasPetTag) {
    const petSrc = rawPet + ' ' + (rawNotes || '');
    if (/安靜|不能吵|不可吵|不吠叫|吵的不行|不擾鄰/.test(petSrc))  cons.push('寵物需安靜不擾鄰');
    if (/寵物條款|寵物契約|簽條款|簽寵條|寵條/.test(petSrc))         cons.push('需簽寵物條款');
    if (/中型犬以下|小型犬|限小型|中小型|不可大型/.test(petSrc))       cons.push('狗限中型犬以下');
    const petCleanM = petSrc.match(/寵[物清]*費?\s*[:\s：]?\s*(\d[\d,]+)|寵清費\s*(\d[\d,]+)/);
    if (petCleanM) {
      const fee = parseInt((petCleanM[1] || petCleanM[2]).replace(/,/g,'')).toLocaleString();
      cons.push(`寵物清潔費 $${fee}`);
    }
  }
  if (petConflict) cons.push('寵物條件需再確認（資料中有矛盾）');

  // 廁所在公共區域
  if (/廁所.*外面|茶水間.*外面/.test(rawNotes || '')) cons.push('廁所及茶水間位於公共區域，非室內獨立衛浴');

  // 網路第四台（無的要放在注意事項，有的已在highlights/pros中）
  const internetYes = /^有$|✅|有網路|有.*網路/.test(rawInternet.trim());
  const noNetwork = !internetYes && /❌網路|無網路|不含網路|網路[：:\s]*無|網路[：:\s]*❌/.test(rawInternet);
  const noCable   = !internetYes && /❌第四台|無第四台|不含第四台|第四台[：:\s]*無|第四台[：:\s]*❌/.test(rawInternet);
  if (noNetwork && noCable) cons.push('無網路、無第四台，需自行申辦');
  else if (noNetwork)       cons.push('無網路，需自行申辦');
  else if (noCable)         cons.push('無第四台');

  // 無電視（如果設備全配但無電視，已在highlights說明；這裡檢查空屋或明確說無電視的情況）
  if (!hasFullEquip && /無電視|沒電視|不含電視|無TV/.test(text)) cons.push('無電視');

  // 車位另租 / 無車位
  if (isParkingExtra && parkingActive) {
    const fee = detectParkingFee(rawParking || rawNotes || '');
    cons.push(fee ? `車位需另租，費用 $${fee}/月` : '車位需另租，費用需詢問');
  }
  if (isParkingCommunityRentable) cons.push('社區可另租車位，非附贈，需自行洽詢');
  if (parkingExplicitNo)          cons.push('無車位');

  // 雙租補加租金
  if (/雙租補.*\+\s*(\d+)|雙租補加/.test(text)) {
    const bonusM = text.match(/雙租補.*\+\s*(\d+)/);
    const bonus = bonusM ? bonusM[1] : '';
    cons.push(`雙租補租金須 +$${bonus || '另議'}`);
  }
  // 不可租補
  if (/不可租補|不可申請租補|無法租補|租補不可/.test(text)) cons.push('不可申請租屋補助');

  // 不可設戶籍
  if (/不可戶籍|不可設戶籍|不辦戶籍|禁止設戶籍|不能設戶籍/.test(text)) cons.push('不可設戶籍');

  // 不可神明廳
  if (/不可神明|不可供奉|禁止神明|禁止供奉|不供奉/.test(text)) cons.push('不可神明廳');

  // 空屋無設備
  const noEquip = /全部沒有|無任何設備|設備全無|連燈都沒|連燈具都沒|無燈具/.test(text);
  if (noEquip) cons.push('空屋，無燈具，需自備家具電器');

  // 屋內有貨物
  if (/屋內還有貨|近期搬離/.test(rawNotes || '')) cons.push('室內目前仍有貨物，近期清空後將更新照片');

  // 設備損壞賠償
  if (/設備損壞|傢俱損壞|家具損壞|照價賠償/.test(text)) cons.push('家具設備損壞需照價賠償');

  // 公證租約
  if (/公證|公證租約/.test(text) && !/不公證/.test(text)) {
    const gongzhengStudentOk = /公證.*學生不用|學生不用.*公證/.test(text);
    cons.push(gongzhengStudentOk ? '須公證租約（學生免）' : '須公證租約');
  }

  // 證件要求
  if (/良民證/.test(text)) {
    const ok = /良民證.*學生不用|學生不用.*良民證/.test(text);
    cons.push(ok ? '需提供良民證（學生免）' : '需提供良民證');
  }
  if (/學生證/.test(text) && /需.*學生證|提供.*學生證/.test(text)) cons.push('需提供學生證');
  if (/需有固定工作|需固定工作|提供工作證明|工作證明/.test(text)) cons.push('需提供工作證明');

  // 挑客
  if (/挑客|挑租客|篩選租客|需審核/.test(text)) cons.push('房東會挑客，需先提供基本資料審核');

  // 限人數
  if (/限一人|只限一人|一人入住/.test(text)) cons.push('限一人入住');

  // 瓦斯桶
  if (/瓦斯桶|桶裝瓦斯/.test(text)) cons.push('使用瓦斯桶，需自行留意叫瓦斯');

  // 可營登/店面需確認
  if (/可營登/.test(text) && /需確認|再確認|洽詢/.test(text)) cons.push('可營登與店面用途需再確認');

  // 退租帶看
  const moveOutM = (rawNotes || text).match(/([一二三四五六七八九十\d]+月(?:初|中|底|末)?)\s*退租/);
  if (moveOutM) cons.push(`目前有租客，${moveOutM[1]}退租後方可帶看`);

  if (cons.length > 0) result.cons = cons.map(c => `• ${c}`).join('\n');

  // ===== TITLE =====
  const emoji = { '辦公室':'🏢', '廠房':'🏭', '倉庫':'🏭', '店面':'🏬', '電梯大樓':'🏢', '透天':'🏡', '公寓':'🏠', '套房':'🏠', '住家':'🏠' }[propType] || '🏠';

  if (isCommercial) {
    const titleParts = [];
    // area shorthand from address
    let areaName = result.district || '';
    if (/高鐵/.test(text))   areaName = '高鐵特區';
    if (/逢甲/.test(text))   areaName = '逢甲商圈';
    if (/文心路/.test(text)) areaName = '文心商圈';
    if (areaName) titleParts.push(areaName);
    if (result.size) titleParts.push(`${result.size}坪${propType}`);
    if (parkingActive) titleParts.push(isDoubleParking ? '雙平車' : parkingLabel);
    if (currentFloor >= 8)  titleParts.push('高樓層');
    if (rawCommunity)       titleParts.push(rawCommunity);
    result.title = `${emoji} ${titleParts.join('/')}`;
  } else {
    const titleParts = [];
    // 1. 區域
    if (result.district) titleParts.push(result.district);
    // 2. 格局（完整保留，1房→套房）
    if (result.layout) {
      const isSingleRoom = /^(1房|一房|套房)/.test(result.layout.trim());
      titleParts.push(isSingleRoom ? '套房' : result.layout);
    }
    // 3. 類型（套房格局不重複輸出）
    const layoutIsSuite = result.layout && /套房/.test(result.layout);
    if (propType && !layoutIsSuite) titleParts.push(propType);
    // 4. 主要亮點（最多2個）
    const highlights2 = [];
    if (tags.includes('可雙租補'))        highlights2.push('可租補 可雙租補');
    else if (tags.includes('可租補'))     highlights2.push('可租補');
    if (tags.includes('可狗') && tags.includes('可貓')) highlights2.push('可貓可狗');
    else if (tags.includes('可狗'))       highlights2.push('可狗');
    else if (tags.includes('可貓'))       highlights2.push('可貓');
    if (parkingActive && !isParkingExtra) highlights2.push('附車位');
    if (tags.includes('獨洗曬'))          highlights2.push('陽台獨洗曬');
    if (/可營登/.test(text))              highlights2.push('可營登');
    titleParts.push(...highlights2.slice(0, 2));
    if (titleParts.length > 0) result.title = `${emoji} ${titleParts.join('｜')}`;
  }

  return result;
}

function detectKeywordLandmarks(text) {
  const hits = [];
  const add = (name) => { if (!hits.includes(name)) hits.push(name); };
  // 學區
  if (/東海大學|東海商圈|台灣大道[四五]段/.test(text)) { add('東海大學'); add('東海商圈'); }
  if (/逢甲|福星路|西屯路/.test(text))           { add('逢甲商圈'); add('逢甲大學'); }
  if (/逢甲夜市/.test(text))                      add('逢甲夜市');
  if (/朝陽/.test(text))                          add('朝陽科技大學');
  if (/靜宜/.test(text))                          add('靜宜大學');
  if (/弘光/.test(text))                          add('弘光科技大學');
  if (/中興大學/.test(text))                      add('中興大學');
  if (/亞洲大學/.test(text))                      add('亞洲大學');
  if (/台中科技大學|中科大/.test(text))           add('台中科技大學');
  if (/台中教育大學|台教大/.test(text))           add('台中教育大學');
  if (/僑光/.test(text))                          add('僑光科技大學');
  if (/台灣體育|台體大/.test(text))               add('台灣體育大學');
  if (/中臺科大|中臺科技/.test(text))             add('中臺科技大學');
  // 醫院
  if (/中山醫|中山附醫/.test(text))               add('中山附醫');
  if (/台中榮總/.test(text))                      add('台中榮總');
  if (/台中慈濟/.test(text))                      add('台中慈濟');
  // 商圈 & 夜市
  if (/一中街|一中商圈/.test(text))               add('一中街商圈');
  if (/旱溪/.test(text))                          add('旱溪夜市');
  if (/勤美|英才路/.test(text))                   { add('勤美商圈'); add('審計新村'); }
  if (/審計新村/.test(text))                      add('審計新村');
  if (/公益路/.test(text))                        add('公益路商圈');
  if (/文心南路/.test(text))                      add('文心南路商圈');
  if (/水湳/.test(text))                          add('水湳經貿園區');
  if (/中清路/.test(text))                        add('中清路商圈');
  if (/崇德路/.test(text))                        add('崇德路商圈');
  if (/北平路/.test(text))                        add('北平路商圈');
  if (/漢口路/.test(text))                        add('漢口路商圈');
  if (/昌平路/.test(text))                        add('昌平路商圈');
  if (/軍功路/.test(text))                        add('軍功路商圈');
  if (/繼光街|繼光商圈/.test(text))               add('繼光街商圈');
  if (/廟東|豐原廟東/.test(text))                 add('豐原廟東夜市');
  if (/大坑/.test(text))                          add('大坑生活圈');
  // 景點 & 文化
  if (/歌劇院|國家歌劇院/.test(text))             add('臺中國家歌劇院');
  if (/宮原/.test(text))                          add('宮原眼科');
  if (/台中公園/.test(text))                      add('台中公園');
  if (/彩虹眷村/.test(text))                      add('彩虹眷村');
  if (/道禾/.test(text))                          add('道禾六藝文化館');
  if (/美術館/.test(text))                        add('美術館');
  if (/忠孝夜市/.test(text))                      add('忠孝夜市');
  if (/高美濕地|高美/.test(text))                 add('高美濕地');
  if (/望高寮/.test(text))                        add('望高寮夜景公園');
  if (/麗寶/.test(text))                          add('麗寶樂園');
  if (/后里馬場/.test(text))                      add('后里馬場');
  if (/LaLaport|lalaport|樂拉/.test(text))        add('LaLaport台中');
  // 重劃區 & 園區
  if (/七期/.test(text))                          add('七期重劃區');
  if (/水湳中央公園/.test(text))                  add('水湳中央公園');
  if (/中科|科學園區/.test(text))                 add('中科');
  if (/黎明新村/.test(text))                      add('黎明新村');
  // 車站（TRA）
  if (/高鐵|台灣高鐵/.test(text))                 add('台中高鐵站');
  if (/烏日高鐵|高鐵特區/.test(text))             add('烏日高鐵特區');
  if (/大慶車站|大慶站/.test(text))               add('大慶車站');
  if (/太原車站|太原站/.test(text))               add('太原車站');
  if (/頭家厝/.test(text))                        add('頭家厝車站');
  if (/豐原火車|豐原站/.test(text))               add('豐原火車站');
  // 捷運
  if (/捷運北屯|北屯總站/.test(text))             add('捷運北屯總站');
  if (/捷運松竹|松竹捷運|松竹站/.test(text))      add('捷運松竹站');
  if (/捷運四維|四維國小站/.test(text))           add('捷運四維國小站');
  if (/捷運文心崇德|文心崇德站/.test(text))       add('捷運文心崇德站');
  if (/捷運文心中清|文心中清站|青島/.test(text))   add('捷運文心中清站');
  if (/捷運市政府|市政府站/.test(text))           add('捷運市政府站');
  if (/捷運文心森林|文心森林公園站/.test(text))   add('捷運文心森林公園站');
  // 其他
  if (/霧峰|光復新村/.test(text))                 add('霧峰市區');
  if (/梧棲|台中港(?!路)/.test(text))             add('台中港生活圈');
  return hits;
}

function detectParkingFee(notes) {
  if (!notes) return '另計';
  const m = notes.match(/\$\s?(\d+)|(\d+)\s?元/);
  return m ? (m[1] || m[2]) : '另計';
}

// ===== APPOINTMENTS =====
async function renderAppts() {
  const statusFilter = document.getElementById('appt-filter-status').value;
  const search = (document.getElementById('appt-search').value || '').toLowerCase();
  const phoneSearch = (document.getElementById('appt-search-phone').value || '').trim();
  const list = document.getElementById('appts-list');
  list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--color-text-muted);">載入中...</div>`;

  let query = db.from('appointments').select('*').order('submitted_at', { ascending: false });
  if (statusFilter) query = query.eq('status', statusFilter);

  const { data, error } = await query;
  if (error) { list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--color-warning);">載入失敗</div>`; return; }

  let filtered = (data || []).map(apptFromDb);
  window._apptCache = filtered;

  // 過濾掉已鎖定的預約（只在日曆顯示）
  filtered = filtered.filter(a => a.status !== '已鎖定');

  if (search) {
    filtered = filtered.filter(a =>
      (a.name || '').toLowerCase().includes(search) ||
      (a.propertyTitle || '').toLowerCase().includes(search)
    );
  }

  if (phoneSearch) {
    filtered = filtered.filter(a =>
      (a.phone || '').includes(phoneSearch)
    );
  }

  if (filtered.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--color-text-muted);">目前沒有預約資料</div>`;
    return;
  }

  list.innerHTML = filtered.map(a => {
    const dt = new Date(a.submittedAt).toLocaleString('zh-TW', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    const statusClass = { '未處理': 'status-pending', '已聯繫': 'status-contacted', '已預約': 'status-booked', '已取消': 'status-cancelled' }[a.status] || 'status-pending';
    const matchedProp = (allProps || []).find(p => p.title === a.propertyTitle);
    const propAddress = matchedProp && matchedProp.address ? matchedProp.address : '';
    return `
      <div class="appt-card">
        <div class="appt-card-top">
          <div class="appt-property">
            <div>${escHtml(a.propertyTitle || '（未指定物件）')}</div>
            ${propAddress ? `<div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">📍 ${escHtml(propAddress)}</div>` : ''}
          </div>
          <span class="status-badge ${statusClass}" style="flex-shrink:0;">${escHtml(a.status)}</span>
        </div>
        <div class="appt-meta">
          <span>👤 ${escHtml(a.name)}　📱 ${escHtml(a.phone)}</span>
          <span>📅 ${escHtml(a.date)} ${escHtml(a.time)}</span>
          <span>送出：${dt}</span>
        </div>
        <div class="appt-details">
          ${apptDetail('入住人數', a.occupants)}
          ${apptDetail('成員關係', a.relationship)}
          ${apptDetail('職業', a.occupation)}
          ${apptDetail('年齡', a.age)}
          ${apptDetail('預計入住', a.moveInDate)}
          ${apptDetail('是否養寵物', a.hasPet === '是' ? `是（${a.petDetail || '未說明'}）` : '否')}
          ${apptDetail('抽菸習慣', a.smokes)}
          ${apptDetail('清楚服務費', a.knowsFee)}
          ${apptDetail('需租屋補助', a.needsSubsidy)}
          ${apptDetail('需遷入戶籍', a.needsRegistration)}
          ${apptDetail('可提供工作證明', a.canProvideProof)}
          ${a.notes ? apptDetail('備註', a.notes) : ''}
        </div>
        <div class="appt-card-actions">
          <select class="status-select" onchange="updateApptStatus('${a.id}', this.value)">
            <option ${a.status==='未處理'?'selected':''}>未處理</option>
            <option ${a.status==='已聯繫'?'selected':''}>已聯繫</option>
            <option ${a.status==='已預約'?'selected':''}>已預約</option>
            <option ${a.status==='已取消'?'selected':''}>已取消</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="editApptDateTime('${a.id}')">✏️ 改日期</button>
          <button class="btn btn-ghost btn-sm" onclick="copyAppt('${a.id}')">📋</button>
          <button class="btn btn-danger btn-sm" onclick="deleteAppt('${a.id}')">刪除</button>
        </div>
      </div>`;
  }).join('');

  // 渲染日曆
  await renderApptCalendar();
}

let currentApptCalendarMonth = new Date();

async function renderApptCalendar() {
  const { data, error } = await db.from('appointments').select('*');
  if (error) { console.error(error); return; }

  const appts = (data || []).map(apptFromDb);
  const year = currentApptCalendarMonth.getFullYear();
  const month = currentApptCalendarMonth.getMonth();

  // 月份頭部
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  document.getElementById('appt-calendar-month').textContent = `${year} 年 ${monthNames[month]}`;

  // 計算日曆
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 按日期分組預約（按時間排序）- 行事曆上只顯示非已取消的預約
  const apptsByDate = {};
  const lockedTimesByDate = {}; // 追蹤每日已鎖定時間（只取第一個）
  appts.forEach(a => {
    if (a.status === '已取消') return; // 行事曆上不顯示已取消
    if (!apptsByDate[a.date]) apptsByDate[a.date] = [];

    // 已鎖定時間只取第一個開始時間
    if (a.status === '已鎖定') {
      if (!lockedTimesByDate[a.date]) {
        lockedTimesByDate[a.date] = true;
        apptsByDate[a.date].push(a.time);
      }
    } else {
      apptsByDate[a.date].push(a.time);
    }
  });

  // 對每個日期的時間進行排序
  Object.keys(apptsByDate).forEach(date => {
    apptsByDate[date].sort();
  });

  // ===== 桌機版月曆 (7欄) =====
  let desktopHtml = '';
  const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];

  weekdayLabels.forEach(w => {
    desktopHtml += `<div class="appt-weekday-header">${w}</div>`;
  });

  // 上月空白日期
  for (let i = 0; i < firstDay; i++) {
    desktopHtml += `<div class="appt-empty-cell">-</div>`;
  }

  // 本月日期
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayAppts = apptsByDate[dateStr] || [];
    const hasAppt = dayAppts.length > 0;

    // 時間排序和垂直優先排列
    let timesHtml = '';
    if (hasAppt) {
      const sortedTimes = [...dayAppts].sort((a, b) => a.localeCompare(b));

      // 垂直優先排列：按最多3行計算列數
      const maxRows = 3;
      const columns = [];
      for (let i = 0; i < sortedTimes.length; i += maxRows) {
        columns.push(sortedTimes.slice(i, i + maxRows));
      }

      timesHtml = `
        <div class="appt-times-list">
          ${columns.map(column => `
            <div class="appt-times-column">
              ${column.map(t => `<div class="appt-time-item">🕐 ${t}</div>`).join('')}
            </div>
          `).join('')}
        </div>
      `;
    }

    desktopHtml += `<div class="appt-day-cell ${hasAppt ? 'has-appt' : ''}" ${hasAppt ? `onclick="showApptsByDate('${dateStr}')"` : ''}>
      <div class="appt-day-number">${day}</div>
      <div class="appt-day-content">
        ${hasAppt ? timesHtml : `<div class="appt-no-appt">無預約</div>`}
      </div>
    </div>`;
  }

  // 下月空白日期
  const totalCells = firstDay + daysInMonth;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 0; i < remainingCells; i++) {
    desktopHtml += `<div class="appt-empty-cell">-</div>`;
  }

  document.getElementById('appt-calendar-desktop').innerHTML = desktopHtml;

  // ===== 手機版月曆（簡化版） =====
  let mobileHtml = '';

  weekdayLabels.forEach(w => {
    mobileHtml += `<div class="appt-weekday-header">${w}</div>`;
  });

  // 上月空白日期
  for (let i = 0; i < firstDay; i++) {
    mobileHtml += `<div class="appt-empty-cell">-</div>`;
  }

  // 本月日期
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayAppts = apptsByDate[dateStr] || [];
    const hasAppt = dayAppts.length > 0;

    mobileHtml += `<div class="appt-day-cell ${hasAppt ? 'has-appt' : ''}" ${hasAppt ? `onclick="showApptsByDate('${dateStr}')"` : ''}>
      <div class="appt-day-number">${day}</div>
      ${hasAppt ? `<div class="appt-day-appt-count">${dayAppts.length}</div>` : ''}
    </div>`;
  }

  // 下月空白日期
  const totalCellsMobile = firstDay + daysInMonth;
  const remainingCellsMobile = totalCellsMobile % 7 === 0 ? 0 : 7 - (totalCellsMobile % 7);
  for (let i = 0; i < remainingCellsMobile; i++) {
    mobileHtml += `<div class="appt-empty-cell">-</div>`;
  }

  document.getElementById('appt-calendar-mobile').innerHTML = mobileHtml;
}

function showApptsByDate(dateStr) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  const appts = (window._apptCache || []).filter(a => a.date === dateStr);
  const dateObj = new Date(dateStr + 'T00:00:00');
  const dateDisplay = dateObj.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // 時間排序函數
  const timeToMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // 分離活躍、已鎖定和已取消預約
  const lockedAppts = appts.filter(a => a.status === '已鎖定');
  const activeAppts = appts.filter(a => a.status !== '已取消' && a.status !== '已鎖定');
  const cancelledAppts = appts.filter(a => a.status === '已取消');

  activeAppts.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  lockedAppts.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  cancelledAppts.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  // 分離已鎖定：有物件的和沒物件的
  const lockedWithProp = lockedAppts.filter(a => a.propertyTitle);
  const lockedNoProp = lockedAppts.filter(a => !a.propertyTitle);

  const lockedExpandId = 'locked-' + dateStr;
  const cancelledExpandId = 'cancelled-' + dateStr;

  // 構建活躍預約 HTML
  const activeApptHtml = activeAppts.map(a => {
    const prop = (allProps || []).find(p => p.title === a.propertyTitle);
    const displayAddress = (prop && prop.address) ? prop.address : (a.propertyTitle || '未指定');
    return `
      <div style="background: #f5f5f5; border-radius: 6px; padding: 12px; margin-bottom: 8px; font-size: 13px; border-left: 4px solid transparent;">
        <div style="font-weight: 600; margin-bottom: 4px;">🕐 ${a.time}</div>
        <div>👤 ${a.name} (${a.phone})</div>
        <div style="color: var(--color-text-muted); margin-top: 4px;">📍 ${displayAddress}</div>
        <div style="color: var(--color-text-muted); font-size: 12px; margin-top: 4px;">狀態: <span style="background: #e8f5e9; padding: 2px 6px; border-radius: 3px;">${a.status}</span></div>
        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button class="btn btn-sm btn-primary" onclick="editApptProperty('${a.id}', '${a.propertyTitle || ''}')">🏠 修改物件</button>
          <button class="btn btn-sm btn-ghost" onclick="editApptDateTime('${a.id}')">📅 改日期</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAppt('${a.id}')">🗑️ 刪除</button>
        </div>
      </div>
    `;
  }).join('');

  // 構建有物件的已鎖定時間 HTML（不折疊）
  const lockedWithPropHtml = lockedWithProp.map(a => {
    const prop = (allProps || []).find(p => p.title === a.propertyTitle);
    const displayAddress = (prop && prop.address) ? prop.address : (a.propertyTitle || '未指定');
    return `
      <div style="background: #fff3cd; border-radius: 6px; padding: 12px; margin-bottom: 8px; font-size: 13px; border-left: 4px solid #ffc107;">
        <div style="font-weight: 600; margin-bottom: 4px;">🔒 ${a.time} - 未開放</div>
        <div style="color: var(--color-primary-dark); font-weight: 600; margin-bottom: 4px;">🏢 ${displayAddress}</div>
        <div style="color: var(--color-text-muted); margin-top: 4px;">📝 ${a.notes || '無原因'}</div>
        <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" onclick="editBlockedTime('${a.date}', '${(a.notes || '').replace(/'/g, "\\'")}')">✏️ 編輯</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAppt('${a.id}')">🗑️ 刪除</button>
        </div>
      </div>
    `;
  }).join('');

  // 構建沒物件的已鎖定時間 HTML（折疊）
  const lockedNoPropHtml = lockedNoProp.map(a => {
    return `
      <div style="background: #fff3cd; border-radius: 6px; padding: 12px; margin-top: 8px; font-size: 13px; border-left: 4px solid #ffc107; opacity: 0.7;">
        <div style="font-weight: 600; margin-bottom: 4px;">🔒 ${a.time} - 未開放</div>
        <div style="color: var(--color-text-muted); margin-top: 4px;">📝 ${a.notes || '無原因'}</div>
        <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" onclick="editBlockedTime('${a.date}', '${(a.notes || '').replace(/'/g, "\\'")}')">✏️ 編輯</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAppt('${a.id}')">🗑️ 刪除</button>
        </div>
      </div>
    `;
  }).join('');

  // 構建已取消預約 HTML
  const cancelledApptHtml = cancelledAppts.map(a => {
    const prop = (allProps || []).find(p => p.title === a.propertyTitle);
    const displayAddress = (prop && prop.address) ? prop.address : (a.propertyTitle || '未指定');
    return `
      <div style="background: #fafafa; border-radius: 6px; padding: 12px; margin-top: 8px; font-size: 13px; border-left: 4px solid #ccc; opacity: 0.7;">
        <div style="font-weight: 600; margin-bottom: 4px;">🕐 ${a.time}</div>
        <div>👤 ${a.name} (${a.phone})</div>
        <div style="color: var(--color-text-muted); margin-top: 4px;">📍 ${displayAddress}</div>
        <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" onclick="updateApptStatus('${a.id}', '未處理')">✏️ 恢復</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAppt('${a.id}')">🗑️ 刪除</button>
        </div>
      </div>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="modal-box" style="max-width: 500px;">
      <div class="modal-header">
        <div class="modal-title">📅 ${dateDisplay} 的預約</div>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">
        ${activeApptHtml}
        ${lockedWithProp.length > 0 ? `
          <div style="margin-top: 16px; border-top: 2px solid #ddd; padding-top: 12px;">
            <div style="font-weight: 600; color: #333; font-size: 13px; padding: 8px 0; margin-bottom: 8px;">🔒 未開放時間</div>
            ${lockedWithPropHtml}
          </div>
        ` : ''}
        ${lockedNoProp.length > 0 ? `
          <div style="margin-top: 16px; border-top: 2px solid #ddd; padding-top: 12px;">
            <button onclick="toggleSection('${lockedExpandId}')" style="background: none; border: none; color: #999; font-weight: 600; cursor: pointer; font-size: 13px; padding: 8px 0; width: 100%; text-align: left;">
              <span id="${lockedExpandId}-btn">▶</span> 未開放時間（無物件） (${lockedNoProp.length})
            </button>
            <div id="${lockedExpandId}" style="display: none;">
              ${lockedNoPropHtml}
            </div>
          </div>
        ` : ''}
        ${cancelledAppts.length > 0 ? `
          <div style="margin-top: 16px; border-top: 2px solid #ddd; padding-top: 12px;">
            <button onclick="toggleSection('${cancelledExpandId}')" style="background: none; border: none; color: #999; font-weight: 600; cursor: pointer; font-size: 13px; padding: 8px 0; width: 100%; text-align: left;">
              <span id="${cancelledExpandId}-btn">▶</span> 已取消預約 (${cancelledAppts.length})
            </button>
            <div id="${cancelledExpandId}" style="display: none;">
              ${cancelledApptHtml}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function toggleSection(sectionId) {
  const elem = document.getElementById(sectionId);
  const btn = document.getElementById(sectionId + '-btn');
  if (elem.style.display === 'none') {
    elem.style.display = 'block';
    btn.textContent = '▼';
  } else {
    elem.style.display = 'none';
    btn.textContent = '▶';
  }
}

function prevApptMonth() {
  currentApptCalendarMonth.setMonth(currentApptCalendarMonth.getMonth() - 1);
  renderApptCalendar();
}

function nextApptMonth() {
  currentApptCalendarMonth.setMonth(currentApptCalendarMonth.getMonth() + 1);
  renderApptCalendar();
}

function apptDetail(label, value) {
  if (!value) return '';
  return `<div class="appt-detail-item">
    <div class="appt-detail-label">${escHtml(label)}</div>
    <div class="appt-detail-value">${escHtml(value)}</div>
  </div>`;
}

function copyAppt(id) {
  const a = (window._apptCache || []).find(x => x.id === id);
  if (!a) { showToast('找不到資料', 'error'); return; }
  // 用物件標題去找地址
  const prop = (allProps || []).find(p => p.title === a.propertyTitle);
  const propDisplay = prop && prop.address ? prop.address : (a.propertyTitle || '未指定');
  const lines = [
    `【預約資料】`,
    `物件：${propDisplay}`,
    `姓名：${a.name}`,
    `電話：${a.phone}`,
    `看屋時間：${a.date} ${a.time}`,
    a.occupants       ? `入住人數：${a.occupants}` : '',
    a.relationship    ? `成員關係：${a.relationship}` : '',
    a.occupation      ? `職業：${a.occupation}` : '',
    a.age             ? `年齡：${a.age}` : '',
    a.moveInDate      ? `預計入住：${a.moveInDate}` : '',
    `是否養寵物：${a.hasPet === '是' ? `是（${a.petDetail || '未說明'}）` : '否'}`,
    `抽菸習慣：${a.smokes || '未填'}`,
    `清楚服務費：${a.knowsFee || '未填'}`,
    `需租屋補助：${a.needsSubsidy || '未填'}`,
    `需遷入戶籍：${a.needsRegistration || '未填'}`,
    `可提供工作證明：${a.canProvideProof || '未填'}`,
    a.notes ? `備註：${a.notes}` : '',
  ].filter(Boolean).join('\n');

  navigator.clipboard.writeText(lines)
    .then(() => showToast('已複製到剪貼簿', 'success'))
    .catch(() => showToast('複製失敗，請手動選取', 'error'));
}

async function updateApptStatus(id, status) {
  const { error } = await db.from('appointments').update({ status }).eq('id', id);
  if (error) { showToast('更新失敗', 'error'); return; }
  await renderAppts();
  showToast(`狀態已更新為「${status}」`, 'success');
}

function deleteAppt(id) {
  openConfirm('確定要刪除這筆預約資料？', async () => {
    const { error } = await db.from('appointments').delete().eq('id', id);
    if (error) { showToast('刪除失敗', 'error'); return; }
    await renderAppts();
    showToast('預約資料已刪除', 'success');
  });
}

async function editApptTitle(id) {
  const span = document.getElementById(`appt-title-${id}`);
  const current = span ? span.textContent : '';
  const newTitle = prompt('請輸入新的物件地址或名稱：', current);
  if (newTitle === null || newTitle.trim() === current) return;
  const { error } = await db.from('appointments').update({ propertyTitle: newTitle.trim() }).eq('id', id);
  if (error) { showToast('更新失敗', 'error'); return; }
  if (span) span.textContent = newTitle.trim();
  showToast('物件名稱已更新', 'success');
}

function editApptDateTime(id) {
  const appt = (window._apptCache || []).find(x => x.id === id);
  if (!appt) { showToast('找不到資料', 'error'); return; }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width: 400px;">
      <div class="modal-header">
        <div class="modal-title">編輯預約日期時間</div>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body" style="padding: 24px;">
        <div class="form-group">
          <label class="form-label">預約日期</label>
          <input type="date" id="edit-appt-date" class="form-input" value="${appt.date}" />
        </div>
        <div class="form-group">
          <label class="form-label">預約時間</label>
          <select id="edit-appt-time" class="form-select">
            <option value="">選擇時間</option>
            <option value="09:00">09:00</option>
            <option value="09:30">09:30</option>
            <option value="10:00">10:00</option>
            <option value="10:30">10:30</option>
            <option value="11:00">11:00</option>
            <option value="11:30">11:30</option>
            <option value="14:00">14:00</option>
            <option value="14:30">14:30</option>
            <option value="15:00">15:00</option>
            <option value="15:30">15:30</option>
            <option value="16:00">16:00</option>
            <option value="16:30">16:30</option>
            <option value="17:00">17:00</option>
            <option value="17:30">17:30</option>
            <option value="18:00">18:00</option>
            <option value="18:30">18:30</option>
            <option value="19:00">19:00</option>
            <option value="19:30">19:30</option>
            <option value="20:00">20:00</option>
            <option value="20:30">20:30</option>
            <option value="21:00">21:00</option>
          </select>
        </div>
        <div style="color: var(--color-text-muted); font-size: 12px; margin-top: 12px;">
          原來：${appt.date} ${appt.time}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" onclick="saveApptDateTime('${id}')">確定修改</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // 設定時間選項的初始值
  const timeSelect = modal.querySelector('#edit-appt-time');
  timeSelect.value = appt.time;
}

async function saveApptDateTime(id) {
  const newDate = document.getElementById('edit-appt-date').value;
  const newTime = document.getElementById('edit-appt-time').value;

  if (!newDate || !newTime) {
    showToast('請選擇日期和時間', 'error');
    return;
  }

  const { error } = await db.from('appointments').update({
    date: newDate,
    time: newTime
  }).eq('id', id);

  if (error) { showToast('更新失敗', 'error'); return; }

  document.querySelector('.modal-overlay').remove();
  await renderAppts();
  showToast('預約日期時間已更新', 'success');
}

async function exportAppointmentsData() {
  try {
    const { data: allAppts, error } = await db.from('appointments').select('*').order('date', { ascending: true }).order('time', { ascending: true });
    if (error) throw error;

    const appts = (allAppts || []).map(a => ({
      日期: a.date,
      時間: a.time,
      姓名: a.name,
      電話: a.phone,
      物件: a.property_title || '未指定',
      狀態: a.status
    }));

    // 轉成 CSV 格式
    const headers = Object.keys(appts[0] || {});
    const csvContent = [
      headers.join(','),
      ...appts.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');

    // 下載為 CSV 檔案
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `預約資料_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();

    showToast(`✅ 已導出 ${appts.length} 筆預約資料`, 'success');

    // 同時在 console 顯示
    console.log('導出的預約資料:', appts);
  } catch(e) {
    console.error('導出失敗', e);
    showToast('❌ 導出失敗', 'error');
  }
}

async function checkGhostAppointments() {
  // 查詢所有預約
  const { data: allAppts, error } = await db.from('appointments').select('*').order('date', { ascending: true }).order('time', { ascending: true });
  if (error) { showToast('查詢失敗', 'error'); return; }

  // 按日期+時間分組，找出重複的
  const groups = {};
  const ghosts = [];

  (allAppts || []).forEach(a => {
    const key = `${a.date}_${a.time}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });

  // 找出有重複預約的時間
  Object.entries(groups).forEach(([key, appts]) => {
    if (appts.length > 1) {
      ghosts.push({ key, count: appts.length, appts });
    }
  });

  // 顯示結果
  let html = '';
  if (ghosts.length === 0) {
    html = `<div style="padding: 40px; text-align: center; color: var(--color-text-muted);">
      ✅ 沒有發現幽靈預約！所有預約都是唯一的。
      <div style="margin-top: 16px; font-size: 13px;">
        總預約數：${allAppts.length}
      </div>
    </div>`;
  } else {
    html = `<div style="padding: 20px;">
      <div style="color: var(--color-warning); margin-bottom: 16px; font-weight: 600;">
        ⚠️ 發現 ${ghosts.length} 個有問題的時間段（共 ${ghosts.reduce((s,g)=>s+g.count-1, 0)} 筆重複預約）
      </div>
      ${ghosts.map(g => {
        const [date, time] = g.key.split('_');
        const extraAppts = g.appts.slice(1);
        const resolveHandler = `resolveGhost('${date}', '${time}', [${extraAppts.map(a => `'${a.id}'`).join(',')}])`;
        return `<div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-weight: 600;">📅 ${date} ${time} (${g.count} 筆預約)</div>
            <button style="padding: 4px 10px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px; font-weight: 600;" onclick="${resolveHandler}">✓ 解決</button>
          </div>
          ${g.appts.map((a, i) => `<div style="font-size: 12px; margin-bottom: 4px; padding-left: 8px; ${i === 0 ? 'opacity: 0.7; text-decoration: line-through;' : ''}">
            ${i+1}. ${a.name} (${a.phone}) - ${a.property_title || '未指定'}
            <button style="margin-left: 8px; padding: 2px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;" onclick="deleteAppt('${a.id}')">刪除</button>
          </div>`).join('')}
        </div>`;
      }).join('')}
    </div>`;
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
      <div class="modal-header">
        <div class="modal-title">幽靈預約檢查報告</div>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">${html}</div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">關閉</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function resolveGhost(date, time, apptIdsToDelete) {
  if (!apptIdsToDelete || apptIdsToDelete.length === 0) {
    showToast('已解決', 'success');
    return;
  }

  const ids = apptIdsToDelete.filter(id => typeof id === 'string' && id.trim());
  let deleted = 0;

  for (const id of ids) {
    const { error } = await db.from('appointments').delete().eq('id', id);
    if (!error) deleted++;
  }

  showToast(`已刪除 ${deleted} 筆多餘預約`, 'success');
  await renderAppts();
  document.querySelector('.modal-overlay')?.remove();
}

// ===== CHANGE PASSWORD (Supabase Auth) =====
function initPwForm() {
  document.getElementById('pw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwError = document.getElementById('pw-error');
    const pwSuccess = document.getElementById('pw-success');
    pwError.classList.add('hidden');
    pwSuccess.classList.add('hidden');

    const newPw = document.getElementById('pw-new').value;
    const confirm = document.getElementById('pw-confirm').value;

    if (newPw !== confirm) {
      pwError.textContent = '新密碼與確認密碼不一致，請重新輸入。';
      pwError.classList.remove('hidden');
      return;
    }
    if (newPw.length < 6) {
      pwError.textContent = '新密碼至少需要 6 個字元。';
      pwError.classList.remove('hidden');
      return;
    }

    const { error } = await db.auth.updateUser({ password: newPw });
    if (error) {
      pwError.textContent = '修改失敗：' + error.message;
      pwError.classList.remove('hidden');
      return;
    }
    document.getElementById('pw-form').reset();
    pwSuccess.textContent = '密碼修改成功！';
    pwSuccess.classList.remove('hidden');
    showToast('密碼修改成功', 'success');
  });
}

// ===== CONFIRM MODAL =====
function openConfirm(msg, cb) {
  document.getElementById('confirm-msg').textContent = msg;
  confirmCallback = cb;
  document.getElementById('confirm-modal').classList.remove('hidden');
  document.getElementById('confirm-ok-btn').onclick = () => {
    const cb = confirmCallback;
    closeConfirm();
    if (cb) cb();
  };
}

function closeConfirm() {
  document.getElementById('confirm-modal').classList.add('hidden');
  confirmCallback = null;
}

const confirmModal = document.getElementById('confirm-modal');
if (confirmModal) {
  confirmModal.addEventListener('click', function(e) {
    if (e.target === this) closeConfirm();
  });
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

// ===== 回饋中心 =====
async function addAnnouncement(e) {
  e.preventDefault();
  const date = document.getElementById('ann-date').value.trim();
  const title = document.getElementById('ann-title').value.trim();
  const body = document.getElementById('ann-body').value.trim();
  if (!date || !title || !body) return;
  try {
    const { error } = await db.from('feedback_announcements').insert({ date, title, body });
    if (error) throw error;
    document.getElementById('announce-form').reset();
    await renderAdminAnnouncements();
    showToast('公告已新增');
  } catch (err) {
    console.error('新增公告失敗', err);
    showToast('新增失敗，請稍後再試', 'error');
  }
}
async function deleteAnnouncement(id) {
  try {
    const { error } = await db.from('feedback_announcements').delete().eq('id', id);
    if (error) throw error;
    await renderAdminAnnouncements();
  } catch (err) {
    console.error('刪除公告失敗', err);
    showToast('刪除失敗', 'error');
  }
}
async function renderAdminAnnouncements() {
  const el = document.getElementById('admin-announce-list');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--color-text-muted);font-size:13px;">載入中…</div>';
  const { data, error } = await db.from('feedback_announcements')
    .select('*').order('created_at', { ascending: false });
  if (error) { el.innerHTML = '<div style="color:#c0392b;font-size:13px;">載入失敗</div>'; return; }
  const items = data || [];
  if (!items.length) { el.innerHTML = '<div style="color:var(--color-text-muted);font-size:13px;">尚無公告</div>'; return; }
  el.innerHTML = items.map(a => `
    <div style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:8px;padding:12px 14px;display:flex;gap:10px;align-items:flex-start;">
      <div style="flex:1;">
        <div style="font-size:11px;color:var(--color-text-muted);">${escHtml(a.date)}</div>
        <div style="font-size:14px;font-weight:600;margin:2px 0 4px;">${escHtml(a.title)}</div>
        <div style="font-size:13px;color:var(--color-text-secondary);white-space:pre-wrap;">${escHtml(a.body)}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="deleteAnnouncement(${a.id})" style="flex-shrink:0;color:#c0392b;">刪除</button>
    </div>
  `).join('');
}
async function setReportStatus(id, status) {
  try {
    const { error } = await db.from('feedback_reports').update({ status }).eq('id', id);
    if (error) throw error;
    await renderAdminReports();
  } catch (err) { console.error('更新狀態失敗', err); showToast('更新失敗', 'error'); }
}
async function deleteReport(id) {
  try {
    const { error } = await db.from('feedback_reports').delete().eq('id', id);
    if (error) throw error;
    await renderAdminReports();
  } catch (err) { console.error('刪除失敗', err); showToast('刪除失敗', 'error'); }
}
async function renderAdminReports() {
  const el = document.getElementById('admin-report-list');
  const ct = document.getElementById('report-count');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--color-text-muted);font-size:13px;">載入中…</div>';
  const { data, error } = await db.from('feedback_reports')
    .select('*').order('created_at', { ascending: false });
  if (error) { el.innerHTML = '<div style="color:#c0392b;font-size:13px;">載入失敗</div>'; return; }
  const items = data || [];
  if (ct) ct.textContent = `（${items.length} 筆）`;
  if (!items.length) { el.innerHTML = '<div style="color:var(--color-text-muted);font-size:13px;">尚無回報</div>'; return; }
  el.innerHTML = items.map(r => {
    const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('zh-TW') : '';
    return `
    <div style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:8px;padding:12px 14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;">
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <span style="font-size:12px;background:${r.status==='已處理'?'#d4edda':'#fff3cd'};color:${r.status==='已處理'?'#155724':'#856404'};padding:2px 8px;border-radius:12px;">${escHtml(r.status)}</span>
          <span style="font-size:12px;font-weight:600;">${escHtml(r.type)}</span>
          <span style="font-size:11px;color:var(--color-text-muted);">${escHtml(dateStr)}</span>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="setReportStatus(${r.id}, '${r.status==='已處理'?'未處理':'已處理'}')">${r.status==='已處理'?'標為未處理':'標為已處理'}</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteReport(${r.id})" style="color:#c0392b;">刪除</button>
        </div>
      </div>
      <div style="font-size:13px;margin-bottom:4px;">${escHtml(r.description)}</div>
      ${r.prop ? `<div style="font-size:12px;color:var(--color-text-muted);">相關物件：${escHtml(r.prop)}</div>` : ''}
      ${r.contact ? `<div style="font-size:12px;color:var(--color-text-muted);">聯絡：${escHtml(r.contact)}</div>` : ''}
    </div>`;
  }).join('');
}
async function setWishStatus(id, status) {
  try {
    const { error } = await db.from('feedback_wishes').update({ status }).eq('id', id);
    if (error) throw error;
    await renderAdminWishes();
  } catch (err) { console.error('更新狀態失敗', err); showToast('更新失敗', 'error'); }
}
async function deleteWish(id) {
  try {
    const { error } = await db.from('feedback_wishes').delete().eq('id', id);
    if (error) throw error;
    await renderAdminWishes();
  } catch (err) { console.error('刪除失敗', err); showToast('刪除失敗', 'error'); }
}
async function renderAdminWishes() {
  const el = document.getElementById('admin-wish-list');
  const ct = document.getElementById('wish-count');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--color-text-muted);font-size:13px;">載入中…</div>';
  const { data, error } = await db.from('feedback_wishes')
    .select('*').order('created_at', { ascending: false });
  if (error) { el.innerHTML = '<div style="color:#c0392b;font-size:13px;">載入失敗</div>'; return; }
  const items = data || [];
  if (ct) ct.textContent = `（${items.length} 筆）`;
  if (!items.length) { el.innerHTML = '<div style="color:var(--color-text-muted);font-size:13px;">尚無許願</div>'; return; }
  el.innerHTML = items.map(w => {
    const dateStr = w.created_at ? new Date(w.created_at).toLocaleDateString('zh-TW') : '';
    return `
    <div style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:8px;padding:12px 14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;">
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <span style="font-size:12px;background:${w.status==='已採納'?'#d4edda':'#fff3cd'};color:${w.status==='已採納'?'#155724':'#856404'};padding:2px 8px;border-radius:12px;">${escHtml(w.status)}</span>
          <span style="font-size:12px;font-weight:600;">${escHtml(w.type)}</span>
          <span style="font-size:11px;color:var(--color-text-muted);">${escHtml(dateStr)}</span>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="setWishStatus(${w.id}, '${w.status==='已採納'?'未處理':'已採納'}')">${w.status==='已採納'?'取消採納':'標為已採納'}</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteWish(${w.id})" style="color:#c0392b;">刪除</button>
        </div>
      </div>
      <div style="font-size:13px;margin-bottom:4px;">${escHtml(w.content)}</div>
      ${w.contact ? `<div style="font-size:12px;color:var(--color-text-muted);">聯絡：${escHtml(w.contact)}</div>` : ''}
    </div>`;
  }).join('');
}
function loadFeedbackSection() {
  renderAdminAnnouncements();
  renderAdminReports();
  renderAdminWishes();
}


// ===== LAYOUT CATEGORY DROPDOWN =====
function toggleLayoutCatDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('layout-cat-dropdown');
  const arrow = document.getElementById('layout-cat-arrow');
  const isOpen = dropdown.style.display !== 'none';
  dropdown.style.display = isOpen ? 'none' : 'block';
  arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
  if (!isOpen) {
    document.addEventListener('click', closeLayoutCatDropdown);
  }
}

function closeLayoutCatDropdown() {
  const dropdown = document.getElementById('layout-cat-dropdown');
  const arrow = document.getElementById('layout-cat-arrow');
  dropdown.style.display = 'none';
  arrow.style.transform = 'rotate(0deg)';
  document.removeEventListener('click', closeLayoutCatDropdown);
}

function onLayoutCatChange() {
  const selected = document.querySelector('input[name="f-layout-cat-radio"]:checked');
  if (selected) {
    document.getElementById('f-layout-cat').value = selected.value;
    updateLayoutCatTrigger();
    closeLayoutCatDropdown();
  }
}

function updateLayoutCatTrigger() {
  const selected = document.querySelector('input[name="f-layout-cat-radio"]:checked');
  const trigger = document.getElementById('layout-cat-trigger');
  const triggerText = document.getElementById('layout-cat-trigger-text');
  if (selected && selected.value) {
    triggerText.textContent = selected.value;
    trigger.classList.add('active');
  } else {
    triggerText.textContent = '請選擇';
    trigger.classList.remove('active');
  }
}

function clearLayoutCat() {
  document.querySelectorAll('input[name="f-layout-cat-radio"]').forEach(rb => {
    rb.checked = false;
  });
  document.getElementById('f-layout-cat').value = '';
  updateLayoutCatTrigger();
  closeLayoutCatDropdown();
}

// ===== TYPE DROPDOWN =====
function toggleTypeDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('type-dropdown');
  const arrow = document.getElementById('type-arrow');
  const isOpen = dropdown.style.display !== 'none';
  dropdown.style.display = isOpen ? 'none' : 'block';
  arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
  if (!isOpen) {
    document.addEventListener('click', closeTypeDropdown);
  }
}

function closeTypeDropdown() {
  const dropdown = document.getElementById('type-dropdown');
  const arrow = document.getElementById('type-arrow');
  dropdown.style.display = 'none';
  arrow.style.transform = 'rotate(0deg)';
  document.removeEventListener('click', closeTypeDropdown);
}

function onTypeChange() {
  const selected = document.querySelector('input[name="f-type-radio"]:checked');
  if (selected) {
    document.getElementById('f-type').value = selected.value;
    updateTypeTrigger();
    closeTypeDropdown();
  }
}

function updateTypeTrigger() {
  const selected = document.querySelector('input[name="f-type-radio"]:checked');
  const trigger = document.getElementById('type-trigger');
  const triggerText = document.getElementById('type-trigger-text');
  if (selected && selected.value) {
    triggerText.textContent = selected.value;
    trigger.classList.add('active');
  } else {
    triggerText.textContent = '請選擇';
    trigger.classList.remove('active');
  }
}

function clearTypeFilter() {
  document.querySelectorAll('input[name="f-type-radio"]').forEach(rb => {
    rb.checked = false;
  });
  document.getElementById('f-type').value = '';
  updateTypeTrigger();
  closeTypeDropdown();
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

// 新增不可預約時間
function openAddBlockedTimeModal() {
  document.getElementById('add-blocked-time-modal').classList.remove('hidden');
  // 設置最小日期為今天
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('blocked-date').min = today;
}

function closeAddBlockedTimeModal() {
  document.getElementById('add-blocked-time-modal').classList.add('hidden');
  document.getElementById('blocked-date').value = '';
  document.getElementById('blocked-time-start').value = '';
  document.getElementById('blocked-time-end').value = '';
  document.getElementById('blocked-reason').value = '';
  document.getElementById('blocked-property').value = '';
  document.getElementById('blocked-property-search').value = '';
  document.getElementById('blocked-property-results').style.display = 'none';
  document.getElementById('blocked-property-selected').style.display = 'none';

  // 重置modal標題和按鈕到新增模式
  const modal = document.getElementById('add-blocked-time-modal');
  const title = modal.querySelector('.modal-title');
  const btn = modal.querySelector('.modal-footer .btn-primary');
  title.textContent = '🔒 新增不可預約時間';
  btn.textContent = '新增';
  btn.onclick = null;
}

// 時間區間轉換為所有時間點（30分鐘間隔）
function getTimesBetween(startTime, endTime) {
  const times = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00'];
  const startIdx = times.indexOf(startTime);
  const endIdx = times.indexOf(endTime);

  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
    return [];
  }

  return times.slice(startIdx, endIdx + 1);
}

async function saveBlockedTime() {
  const date = document.getElementById('blocked-date').value;
  const timeStart = document.getElementById('blocked-time-start').value;
  const timeEnd = document.getElementById('blocked-time-end').value;
  const reason = document.getElementById('blocked-reason').value;
  const property = document.getElementById('blocked-property').value;

  if (!date || !timeStart || !timeEnd) {
    alert('請輸入日期、開始時間和結束時間');
    return;
  }

  // 取得時間區間內所有時間點
  const times = getTimesBetween(timeStart, timeEnd);
  if (times.length === 0) {
    alert('❌ 開始時間必須早於或等於結束時間');
    return;
  }

  try {
    // 為每個時間點新增一筆記錄
    // 在notes中存儲時間區間，方便後續編輯識別
    const groupId = 'blocked_' + Date.now();
    const timeRangeNote = `${timeStart}-${timeEnd}`;

    const blockedAppts = times.map((time, idx) => ({
      id: groupId + '_' + idx,
      date: date,
      time: time,
      name: '【已鎖定】' + (reason || '不可預約'),
      phone: '',
      property_title: property || '',
      status: '已鎖定',
      occupants: '',
      relationship: '',
      occupation: '',
      age: '',
      move_in_date: '',
      has_pet: '',
      pet_detail: '',
      smokes: '',
      knows_fee: '',
      needs_subsidy: '',
      needs_registration: '',
      can_provide_proof: '',
      notes: timeRangeNote + (reason ? ' | ' + reason : '')
    }));

    const { error } = await db.from('appointments').insert(blockedAppts);
    if (error) throw error;

    alert(`✅ 已新增 ${times.length} 個不可預約時間段`);
    closeAddBlockedTimeModal();

    // 重新渲染日曆和預約列表
    renderApptCalendar();
    renderAppts();
  } catch(e) {
    console.error('新增失敗:', e);
    alert('❌ 新增失敗：' + (e.message || e.code || JSON.stringify(e)));
  }
}

// 編輯已鎖定時間
function editBlockedTime(date, notes) {
  // 解析notes中的時間區間和原因
  const parts = notes.split(' | ');
  const timeRange = parts[0] || '';
  const reason = parts[1] || '';
  const [timeStart, timeEnd] = timeRange.split('-');

  // 關閉預約詳情modal，避免被蓋住
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));

  // 打開編輯modal
  document.getElementById('add-blocked-time-modal').classList.remove('hidden');
  document.getElementById('blocked-date').value = date;
  document.getElementById('blocked-time-start').value = timeStart || '';
  document.getElementById('blocked-time-end').value = timeEnd || '';
  document.getElementById('blocked-reason').value = reason || '';

  // 改變modal標題和按鈕
  const modal = document.getElementById('add-blocked-time-modal');
  const title = modal.querySelector('.modal-title');
  const btn = modal.querySelector('.modal-footer .btn-primary');
  
  title.textContent = '✏️ 修改不可預約時間';
  btn.textContent = '更新';
  btn.onclick = () => updateBlockedTime(date, notes);
}

// 更新已鎖定時間
async function updateBlockedTime(oldDate, oldNotes) {
  const newDate = document.getElementById('blocked-date').value;
  const newTimeStart = document.getElementById('blocked-time-start').value;
  const newTimeEnd = document.getElementById('blocked-time-end').value;
  const newReason = document.getElementById('blocked-reason').value;
  const newProperty = document.getElementById('blocked-property').value;

  if (!newDate || !newTimeStart || !newTimeEnd) {
    alert('請輸入日期、開始時間和結束時間');
    return;
  }

  try {
    // 刪除舊記錄
    const { error: deleteError } = await db.from('appointments')
      .delete()
      .eq('status', '已鎖定')
      .eq('date', oldDate)
      .like('notes', oldNotes.replace(' | ', '%'));

    if (deleteError) throw deleteError;

    // 新增新記錄
    const newTimes = getTimesBetween(newTimeStart, newTimeEnd);
    const timeRangeNote = `${newTimeStart}-${newTimeEnd}`;
    const groupId = 'blocked_' + Date.now();

    const blockedAppts = newTimes.map((time, idx) => ({
      id: groupId + '_' + idx,
      date: newDate,
      time: time,
      name: '【已鎖定】' + (newReason || '不可預約'),
      phone: '',
      property_title: newProperty || '',
      status: '已鎖定',
      occupants: '',
      relationship: '',
      occupation: '',
      age: '',
      move_in_date: '',
      has_pet: '',
      pet_detail: '',
      smokes: '',
      knows_fee: '',
      needs_subsidy: '',
      needs_registration: '',
      can_provide_proof: '',
      notes: timeRangeNote + (newReason ? ' | ' + newReason : '')
    }));

    const { error: insertError } = await db.from('appointments').insert(blockedAppts);
    if (insertError) throw insertError;

    alert(`✅ 已更新不可預約時間`);
    closeAddBlockedTimeModal();
    renderApptCalendar();
    renderAppts();
  } catch(e) {
    console.error('更新失敗:', e);
    alert('❌ 更新失敗：' + (e.message || e.code || JSON.stringify(e)));
  }
}

// 刪除已鎖定時間
async function deleteBlockedTime(groupId, date) {
  if (!confirm('確定要刪除這個已鎖定時間嗎？')) return;

  try {
    const { error } = await db.from('appointments')
      .delete()
      .eq('status', '已鎖定')
      .eq('date', date)
      .like('id', groupId + '%');

    if (error) throw error;

    alert('✅ 已刪除');
    document.querySelector('.modal-overlay').remove();
    renderApptCalendar();
    renderAppts();
  } catch(e) {
    console.error('刪除失敗:', e);
    alert('❌ 刪除失敗：' + (e.message || e.code || JSON.stringify(e)));
  }
}

// 編輯預約物件
function editApptProperty(apptId, currentPropertyTitle) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  // 建立物件列表
  const propOptions = (allProps || []).map(p => `
    <option value="${p.title}" ${p.title === currentPropertyTitle ? 'selected' : ''}>
      ${p.address || '無地址'}
    </option>
  `).join('');

  modal.innerHTML = `
    <div class="modal-box" style="max-width:450px;">
      <div class="modal-header">
        <div class="modal-title">🏠 修改預約物件</div>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">選擇物件 <span class="required">*</span></label>
          <select class="form-select" id="appt-prop-select">
            <option value="">-- 未指定 --</option>
            ${propOptions}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" onclick="saveApptProperty('${apptId}')">保存</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// 保存預約物件
async function saveApptProperty(apptId) {
  const newProperty = document.getElementById('appt-prop-select').value;

  try {
    const { error } = await db.from('appointments')
      .update({ property_title: newProperty })
      .eq('id', apptId);

    if (error) throw error;

    // 關閉所有 modal（修改物件modal和預約詳情modal）
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());

    // 重新渲染日曆和預約列表
    renderApptCalendar();
    renderAppts();
  } catch(e) {
    console.error('修改失敗:', e);
    alert('❌ 修改失敗：' + (e.message || e.code || JSON.stringify(e)));
  }
}

// 從按鈕讀取data屬性後呼叫editBlockedTime
function editBlockedTimeFromBtn(btn) {
  const date = btn.dataset.date;
  const notes = btn.dataset.notes;
  editBlockedTime(date, notes);
}

// 從按鈕讀取data屬性後呼叫deleteBlockedTime
function deleteBlockedTimeFromBtn(btn) {
  const groupId = btn.dataset.groupid;
  const date = btn.dataset.date;
  deleteBlockedTime(groupId, date);
}

// 搜尋物件
function searchBlockedProperty() {
  const searchText = document.getElementById('blocked-property-search').value.toLowerCase();
  const resultsDiv = document.getElementById('blocked-property-results');

  if (!searchText) {
    resultsDiv.style.display = 'none';
    return;
  }

  const filtered = (allProps || []).filter(p => 
    (p.address || '').toLowerCase().includes(searchText) || 
    (p.title || '').toLowerCase().includes(searchText)
  );

  if (filtered.length === 0) {
    resultsDiv.innerHTML = '<div style="padding: 8px; color: var(--color-text-muted); text-align: center;">找不到物件</div>';
    resultsDiv.style.display = 'block';
    return;
  }

  resultsDiv.innerHTML = filtered.map(p => `
    <div style="padding: 8px; border-bottom: 1px solid #f0f0f0; cursor: pointer; font-size: 12px;" onclick="selectBlockedProperty('${p.title}', '${p.address || p.title}')">
      <div style="font-weight: 500;">${p.address || '無地址'}</div>
      <div style="color: var(--color-text-muted); font-size: 11px;">${p.title}</div>
    </div>
  `).join('');
  resultsDiv.style.display = 'block';
}

// 選擇物件
function selectBlockedProperty(title, address) {
  document.getElementById('blocked-property').value = title;
  document.getElementById('blocked-property-search').value = '';
  document.getElementById('blocked-property-results').style.display = 'none';
  
  const selected = document.getElementById('blocked-property-selected');
  document.getElementById('blocked-property-name').textContent = address;
  selected.style.display = 'block';
}

// 清除物件選擇
function clearBlockedProperty() {
  document.getElementById('blocked-property').value = '';
  document.getElementById('blocked-property-selected').style.display = 'none';
}

// 根據groupId編輯已鎖定時間
function editBlockedTimeByGroupId(groupId, date) {
  // 從_apptCache中查找該groupId的預約
  const appt = (window._apptCache || []).find(a => a.id && a.id.startsWith(groupId));
  if (!appt) {
    alert('找不到預約記錄');
    return;
  }
  editBlockedTime(appt.date, appt.notes);
}

// 從按鈕data屬性編輯已鎖定時間
function editBlockedTimeFromData(btn) {
  const date = btn.dataset.date;
  const notes = decodeURIComponent(btn.dataset.notes);
  editBlockedTime(date, notes);
}

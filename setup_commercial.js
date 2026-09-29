// 在瀏覽器控制台中運行此代碼以初始化商業物件表
// 1. 開啟應用程式的管理後台 (mimi-hub.html)
// 2. 打開瀏覽器的開發者工具 (F12 或 Cmd+Option+I)
// 3. 進入 Console 標籤
// 4. 複製下面的所有代碼並貼上到控制台中，然後按 Enter

async function setupCommercialDatabase() {
  console.log('開始建立商業物件表...');

  try {
    // 1. 創建表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.commercial_properties (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        district TEXT NOT NULL,
        rent INTEGER,
        area NUMERIC(10,2),
        floor TEXT,
        age INTEGER,
        usage_type TEXT,
        features TEXT,
        notes TEXT,
        latitude NUMERIC(10,6),
        longitude NUMERIC(10,6),
        status BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_commercial_district ON public.commercial_properties(district);
      CREATE INDEX IF NOT EXISTS idx_commercial_status ON public.commercial_properties(status);

      GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_properties TO authenticated;
      GRANT USAGE ON SEQUENCE public.commercial_properties_id_seq TO authenticated;
    `;

    // 使用 supabase RPC 來執行 SQL
    const { data, error } = await db.rpc('query', { query: createTableSQL });

    if (error) {
      console.error('使用 RPC 失敗，嘗試直接插入測試數據...');
      // 如果 RPC 不可用，嘗試直接插入一條測試數據
      const testInsert = await db.from('commercial_properties').insert({
        name: '測試物件',
        address: '台中市',
        district: '中區',
        rent: 50000,
        status: true
      });

      if (testInsert.error) {
        console.error('表創建失敗:', testInsert.error.message);
        console.log('請手動在 Supabase 控制台中執行以下 SQL：');
        console.log(createTableSQL);
        return false;
      } else {
        console.log('✅ 表已成功創建！');
        // 刪除測試數據
        await db.from('commercial_properties').delete().eq('name', '測試物件');
        return true;
      }
    } else {
      console.log('✅ 表已成功創建！');
      return true;
    }
  } catch (err) {
    console.error('初始化失敗:', err);
    return false;
  }
}

// 執行初始化
setupCommercialDatabase().then(success => {
  if (success) {
    console.log('✅ 商業物件系統已準備好！請重新加載頁面。');
    // 刷新頁面
    setTimeout(() => window.location.reload(), 1000);
  } else {
    console.log('❌ 初始化失敗，請參考上面的 SQL 並在 Supabase 控制台中手動執行。');
  }
});

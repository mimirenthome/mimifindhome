-- 創建商業物件表（簡化版）
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

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_commercial_district ON public.commercial_properties(district);
CREATE INDEX IF NOT EXISTS idx_commercial_status ON public.commercial_properties(status);

-- 授予權限
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_properties TO authenticated;
GRANT USAGE ON SEQUENCE public.commercial_properties_id_seq TO authenticated;

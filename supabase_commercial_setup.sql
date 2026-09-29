-- 創建商業物件表
CREATE TABLE public.commercial_properties (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  address VARCHAR NOT NULL,
  district VARCHAR NOT NULL,
  rent INTEGER,
  area NUMERIC(10,2),
  floor VARCHAR,
  age INTEGER,
  usage_type VARCHAR,
  features VARCHAR,
  notes TEXT,
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  status BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 建立索引以提高查詢效能
CREATE INDEX idx_commercial_district ON public.commercial_properties(district);
CREATE INDEX idx_commercial_status ON public.commercial_properties(status);
CREATE INDEX idx_commercial_usage_type ON public.commercial_properties(usage_type);
CREATE INDEX idx_commercial_rent ON public.commercial_properties(rent);

-- 設定 RLS 政策
ALTER TABLE public.commercial_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允許認證用戶查看商業物件" ON public.commercial_properties
  FOR SELECT USING (auth.role() = 'authenticated_user' OR auth.role() = 'service_role');

CREATE POLICY "允許認證用戶管理商業物件" ON public.commercial_properties
  FOR INSERT, UPDATE, DELETE USING (auth.role() = 'service_role' OR
    (auth.role() = 'authenticated_user' AND auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'mimi.rent.00@gmail.com'
    )));

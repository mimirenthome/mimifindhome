#!/usr/bin/env python3
"""
簡單的腳本來創建商業物件表
直接在您的電腦上運行此腳本
"""

import requests
import json
import sys

# Supabase 配置
SUPABASE_URL = "https://avrpxknjthaglcswtagw.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cnB4a25qdGhhZ2xjc3d0YWd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg2NDgzNywiZXhwIjoyMDk4NDQwODM3fQ.x4lYUOiQzk4FWUU_I4AdTPy4G-SwJU4ZOv6K41JaoB8"

# SQL 腳本
SQL_SCRIPT = """
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
"""

def execute_sql():
    """執行 SQL 腳本"""
    print("🔄 正在創建商業物件表...")

    headers = {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Prefer": "return=representation"
    }

    # 方案 1: 嘗試使用 Supabase SQL 端點（如果可用）
    try:
        # 這是嘗試使用非官方的 SQL 執行端點
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/execute_sql",
            headers=headers,
            json={"sql": SQL_SCRIPT},
            timeout=10
        )

        if response.status_code in [200, 201]:
            print("✅ 表已成功創建！")
            return True
        elif "Could not find the function" in response.text:
            print("⚠️  RPC 方法不可用，嘗試其他方法...")
        else:
            print(f"❌ 錯誤: {response.text}")

    except Exception as e:
        print(f"⚠️  連接錯誤: {e}")

    # 方案 2: 嘗試插入測試數據來驗證表是否存在
    print("\n🔍 檢查表是否已存在...")
    try:
        test_data = {
            "name": "test",
            "address": "test",
            "district": "test",
            "rent": 0,
            "status": True
        }

        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/commercial_properties",
            headers={**headers, "Prefer": "return=minimal"},
            json=test_data,
            timeout=10
        )

        if response.status_code == 201:
            print("✅ 表已存在！現在刪除測試數據...")
            # 刪除測試數據
            requests.delete(
                f"{SUPABASE_URL}/rest/v1/commercial_properties?name=eq.test",
                headers=headers
            )
            print("✅ 商業物件表已準備好！")
            return True
        elif "Could not find the table" in response.text:
            print("❌ 表不存在，需要手動在 Supabase 中創建")
            print("\n📝 請在 Supabase SQL 編輯器中執行以下 SQL：\n")
            print(SQL_SCRIPT)
            return False
        else:
            print(f"❌ 錯誤: {response.text}")
            return False

    except Exception as e:
        print(f"❌ 錯誤: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("商業物件表初始化工具")
    print("=" * 50 + "\n")

    success = execute_sql()

    if not success:
        print("\n" + "=" * 50)
        print("手動操作說明:")
        print("=" * 50)
        print("1. 打開 Supabase 控制台")
        print("2. 進入您的項目: https://supabase.com/dashboard")
        print("3. 選擇 SQL Editor")
        print("4. 點擊 'New Query'")
        print("5. 複製上面的 SQL 代碼並貼入")
        print("6. 點擊 'Run' 執行")
        sys.exit(1)
    else:
        print("\n✨ 設置完成！您可以現在開始使用商業物件系統")
        sys.exit(0)

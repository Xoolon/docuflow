"""
One-time migration: add missing columns to the jobs table.
Safe to run multiple times — uses ADD COLUMN IF NOT EXISTS.

Run:  python migrate_jobs.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.database import engine

MIGRATIONS = [
    # New columns added in v2 token system
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS input_file_key   VARCHAR",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_task          VARCHAR",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS input_tokens     INTEGER",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS output_tokens    INTEGER",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_tokens     INTEGER",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tokens_charged   INTEGER",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS api_cost_usd     FLOAT",
    # payments table v2 columns
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS pack_id          VARCHAR",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS tokens_granted   BIGINT  DEFAULT 0",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_usd       FLOAT",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_ngn       FLOAT",
    # Remove old columns that no longer exist in the model
    # (commented out — safe to leave, SQLAlchemy will just ignore them)
    # "ALTER TABLE payments DROP COLUMN IF EXISTS plan_duration_days",
    # "ALTER TABLE jobs     DROP COLUMN IF EXISTS celery_task_id",
]

print("Running jobs/payments table migrations...")
with engine.begin() as conn:
    for sql in MIGRATIONS:
        try:
            conn.execute(text(sql))
            col = sql.split("COLUMN IF NOT EXISTS")[-1].strip().split()[0]
            print(f"  OK  {col}")
        except Exception as e:
            print(f"  SKIP  {sql[:60]}... ({e})")

print("\nDone. Restart uvicorn now.")
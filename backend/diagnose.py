"""
Run this to diagnose all issues before starting the server:
  python diagnose.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

print("=" * 60)
print("DocuFlow Diagnostic")
print("=" * 60)

# 1. DB connection
print("\n[1] Database connection...")
try:
    from app.database import engine
    with engine.connect() as conn:
        print("  OK  Connected to database")
except Exception as e:
    print(f"  FAIL  Cannot connect: {e}")
    sys.exit(1)

# 2. Tables exist
print("\n[2] Checking tables...")
from sqlalchemy import inspect, text
inspector = inspect(engine)
tables = inspector.get_table_names()
required = ["users", "jobs", "payments", "token_transactions"]
for t in required:
    if t in tables:
        print(f"  OK  {t}")
    else:
        print(f"  MISSING  {t}  ← run: python create_tables.py")

# 3. Columns on users table
print("\n[3] Checking users table columns...")
if "users" in tables:
    cols = {c["name"] for c in inspector.get_columns("users")}
    needed = ["tokens_balance", "tokens_purchased", "tokens_consumed", "is_admin"]
    for col in needed:
        if col in cols:
            print(f"  OK  users.{col}")
        else:
            print(f"  MISSING  users.{col}  ← run: python create_tables.py  (then recreate test users)")

# 4. Python packages
print("\n[4] Checking Python packages...")
pkgs = {
    "fpdf":       "fpdf2 (PDF fallback for Windows)",
    "svglib":     "svglib (SVG→PNG on Windows)",
    "reportlab":  "reportlab",
    "PIL":        "Pillow (image conversions)",
    "pdf2docx":   "pdf2docx (PDF→DOCX)",
    "pdfplumber": "pdfplumber (PDF→TXT)",
    "docx":       "python-docx (DOCX handling)",
    "markdown":   "markdown (MD→HTML)",
    "pandas":     "pandas (CSV/XLSX)",
    "openpyxl":   "openpyxl (XLSX)",
    "bs4":        "beautifulsoup4",
    "jose":       "python-jose (JWT)",
    "httpx":      "httpx (Google OAuth)",
    "paystack":   None,  # optional
}
missing = []
for mod, label in pkgs.items():
    if label is None:
        continue
    try:
        __import__(mod)
        print(f"  OK  {label}")
    except ImportError:
        print(f"  MISSING  {label}  ← pip install {mod if mod != 'PIL' else 'Pillow'}")
        missing.append(label)

# 5. Env vars
print("\n[5] Checking .env settings...")
from app.config import settings
checks = {
    "SECRET_KEY":           bool(settings.secret_key and settings.secret_key != "change-this"),
    "GOOGLE_CLIENT_ID":     bool(settings.google_client_id),
    "GOOGLE_CLIENT_SECRET": bool(settings.google_client_secret),
    "PAYSTACK_SECRET_KEY":  bool(getattr(settings, "paystack_secret_key", None)),
    "ANTHROPIC_API_KEY":    bool(getattr(settings, "anthropic_api_key", None)),
}
for k, ok in checks.items():
    print(f"  {'OK' if ok else 'MISSING'}  {k}")

print("\n" + "=" * 60)
if missing:
    print(f"Install missing packages:")
    install = " ".join(
        m.split("(")[0].strip().lower().replace("beautifulsoup4","bs4")
          .replace("pillow","Pillow").replace("fpdf2","fpdf2")
        for m in missing
    )
    print(f"  pip install fpdf2 svglib reportlab beautifulsoup4")
else:
    print("All packages present.")
print("=" * 60)
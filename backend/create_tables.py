"""
Run this once after switching to PostgreSQL to create all tables:
  python create_tables.py

This is safer than alembic for a fresh DB — just drops nothing and creates everything.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import Base, engine
from app.models.models import User, TokenTransaction, Job, Payment  # noqa: F401

print("Creating all tables...")
Base.metadata.create_all(bind=engine)
print("Done. Tables created:")
for table in Base.metadata.tables:
    print(f"  ✓ {table}")
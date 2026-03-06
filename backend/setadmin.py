#!/usr/bin/env python3
"""
One-shot script to grant admin access to a user by email.
Run from Render Shell:  python set_admin.py your@email.com

Also works locally:     DATABASE_URL=... python set_admin.py your@email.com
"""
import sys
import os

# Must be run from the backend/ directory so app imports work
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.models import User


def set_admin(email: str, admin: bool = True):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"ERROR: No user found with email '{email}'")
            print("\nAll registered emails:")
            for u in db.query(User).order_by(User.created_at).all():
                print(f"  {'[ADMIN] ' if u.is_admin else '        '}{u.email}  (id: {u.id})")
            sys.exit(1)

        user.is_admin = admin
        db.commit()
        db.refresh(user)

        status = "✓ ADMIN" if user.is_admin else "✓ admin removed"
        print(f"{status} — {user.email} (name: {user.name or 'no name'}, id: {user.id})")
        print("\nAll users after change:")
        for u in db.query(User).order_by(User.created_at).all():
            print(f"  {'[ADMIN] ' if u.is_admin else '        '}{u.email}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python set_admin.py <email> [--remove]")
        print("Example: python set_admin.py alexanderglennorman@gmail.com")
        sys.exit(1)

    email  = sys.argv[1]
    remove = "--remove" in sys.argv
    set_admin(email, admin=not remove)
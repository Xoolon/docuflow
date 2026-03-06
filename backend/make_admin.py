from app.database import SessionLocal
from app.models.models import User

db = SessionLocal()
email = 'alexanderglennorman@gmail.com'  # replace with the correct email
u = db.query(User).filter(User.email == email).first()

if u:
    u.is_admin = True
    db.commit()
    print('Done — you are now admin')
else:
    print('Log in via Google first, then run this again')

db.close()
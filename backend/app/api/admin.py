"""
Admin dashboard API — only accessible to users with is_admin=True
Endpoints power the real-time admin dashboard.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    User, Job, TokenTransaction, Payment,
    TokenTxType, JobType, JobStatus,
    ANTHROPIC_INPUT_PER_TOKEN, ANTHROPIC_OUTPUT_PER_TOKEN,
    CREDIT_PACKS
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.get("/overview")
async def overview(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Main dashboard numbers."""
    total_users  = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    paying_users = db.query(func.count(User.id)).filter(User.tokens_purchased > 0).scalar()

    # Revenue
    total_revenue_ngn = db.query(func.sum(Payment.amount_ngn)).filter(
        Payment.status == "success").scalar() or 0
    total_revenue_usd = db.query(func.sum(Payment.amount_usd)).filter(
        Payment.status == "success").scalar() or 0

    # API costs — from actual token ledger
    tx_costs = db.query(
        func.sum(TokenTransaction.api_cost_usd)
    ).filter(
        TokenTransaction.api_cost_usd.isnot(None)
    ).scalar() or 0.0

    # Tokens
    total_tokens_sold     = db.query(func.sum(Payment.tokens_granted)).filter(
        Payment.status == "success").scalar() or 0
    total_tokens_consumed = db.query(func.sum(func.abs(TokenTransaction.tokens_delta))).filter(
        TokenTransaction.tokens_delta < 0).scalar() or 0

    # Jobs
    total_jobs = db.query(func.count(Job.id)).scalar()
    ai_jobs    = db.query(func.count(Job.id)).filter(Job.job_type == JobType.ai_generation).scalar()
    conv_jobs  = db.query(func.count(Job.id)).filter(Job.job_type == JobType.conversion).scalar()

    # Free-tier cost (tokens consumed by users who never paid)
    free_user_ids = [u.id for u in db.query(User.id).filter(
        User.tokens_purchased == 0).all()]
    free_tier_api_cost = 0.0
    if free_user_ids:
        free_tier_api_cost = db.query(
            func.sum(TokenTransaction.api_cost_usd)
        ).filter(
            TokenTransaction.user_id.in_(free_user_ids),
            TokenTransaction.api_cost_usd.isnot(None)
        ).scalar() or 0.0

    fixed_monthly = 14.83
    net_profit = total_revenue_usd - tx_costs - fixed_monthly

    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "paying": paying_users,
            "free_tier": total_users - paying_users,
            "conversion_rate_pct": round(paying_users / max(total_users, 1) * 100, 1),
        },
        "revenue": {
            "total_usd": round(total_revenue_usd, 2),
            "total_ngn": round(total_revenue_ngn, 2),
            "api_cost_usd": round(tx_costs, 4),
            "fixed_cost_usd": fixed_monthly,
            "net_profit_usd": round(net_profit, 2),
            "margin_pct": round(net_profit / max(total_revenue_usd, 0.01) * 100, 1),
            "free_tier_api_cost_usd": round(free_tier_api_cost, 4),
        },
        "tokens": {
            "sold": total_tokens_sold,
            "consumed": total_tokens_consumed,
            "outstanding": total_tokens_sold - total_tokens_consumed,
        },
        "jobs": {
            "total": total_jobs,
            "ai_generations": ai_jobs,
            "conversions": conv_jobs,
        },
    }

@router.get("/revenue/daily")
async def revenue_daily(
    days: int = 30,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Daily revenue for chart — last N days."""
    since = datetime.utcnow() - timedelta(days=days)
    rows = db.query(
        func.date(Payment.created_at).label("day"),
        func.sum(Payment.amount_usd).label("revenue_usd"),
        func.count(Payment.id).label("transactions"),
    ).filter(
        Payment.status == "success",
        Payment.created_at >= since,
    ).group_by(func.date(Payment.created_at)).order_by("day").all()

    # Fill in zeroes for days with no revenue
    result = []
    for i in range(days):
        day = (datetime.utcnow() - timedelta(days=days - i - 1)).strftime("%Y-%m-%d")
        match = next((r for r in rows if str(r.day) == day), None)
        result.append({
            "day": day,
            "revenue_usd": round(float(match.revenue_usd), 2) if match else 0,
            "transactions": match.transactions if match else 0,
        })
    return result

@router.get("/api-costs/daily")
async def api_costs_daily(
    days: int = 30,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Daily Anthropic API cost for chart."""
    since = datetime.utcnow() - timedelta(days=days)
    rows = db.query(
        func.date(TokenTransaction.created_at).label("day"),
        func.sum(TokenTransaction.api_cost_usd).label("cost"),
        func.sum(func.abs(TokenTransaction.tokens_delta)).label("tokens"),
    ).filter(
        TokenTransaction.api_cost_usd.isnot(None),
        TokenTransaction.created_at >= since,
    ).group_by(func.date(TokenTransaction.created_at)).order_by("day").all()

    result = []
    for i in range(days):
        day = (datetime.utcnow() - timedelta(days=days - i - 1)).strftime("%Y-%m-%d")
        match = next((r for r in rows if str(r.day) == day), None)
        result.append({
            "day": day,
            "cost_usd": round(float(match.cost), 5) if match else 0,
            "tokens": int(match.tokens) if match else 0,
        })
    return result

@router.get("/users")
async def list_users(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    users = db.query(User).order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    total = db.query(func.count(User.id)).scalar()
    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "tokens_balance": u.tokens_balance,
                "tokens_consumed": u.tokens_consumed,
                "tokens_purchased": u.tokens_purchased,
                "is_paying": u.tokens_purchased > 0,
                "joined": u.created_at.isoformat(),
            }
            for u in users
        ],
    }

@router.get("/packs/stats")
async def pack_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """How many of each pack has been sold."""
    rows = db.query(
        Payment.pack_id,
        func.count(Payment.id).label("count"),
        func.sum(Payment.amount_usd).label("revenue"),
        func.sum(Payment.tokens_granted).label("tokens"),
    ).filter(Payment.status == "success").group_by(Payment.pack_id).all()

    result = []
    for pack_id, info in CREDIT_PACKS.items():
        row = next((r for r in rows if r.pack_id == pack_id), None)
        result.append({
            "pack_id": pack_id,
            "label": info["label"],
            "price_usd": info["price_usd"],
            "tokens": info["tokens"],
            "sold": row.count if row else 0,
            "revenue_usd": round(float(row.revenue), 2) if row else 0,
        })
    return result

@router.post("/users/{user_id}/grant-tokens")
async def grant_tokens(
    user_id: str,
    amount: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from app.models.models import TokenTxType
    from app.utils.tokens import credit_tokens
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    credit_tokens(db, user, amount, TokenTxType.admin_grant,
                  f"Admin grant by {admin.email}")
    return {"ok": True, "new_balance": user.tokens_balance}
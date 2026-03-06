"""
Celery Tasks for async file conversion processing
"""
import os
import tempfile
import uuid
from pathlib import Path
from datetime import datetime
from celery import Celery
from loguru import logger

from app.config import settings

celery_app = Celery(
    "docuflow",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "tasks.convert_file_task": {"queue": "conversions"},
    }
)


@celery_app.task(bind=True, max_retries=2, name="tasks.convert_file_task")
def convert_file_task(self, job_id: str, input_file_key: str,
                      from_fmt: str, to_fmt: str,
                      user_id: str, is_free_tier: bool):
    """
    Async file conversion task.
    Downloads file, converts, optionally watermarks, uploads result.
    """
    from app.database import SessionLocal
    from app.models.models import Job, JobStatus
    from app.services import conversion, storage, watermark

    db = SessionLocal()

    try:
        # Update job status
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        job.status = JobStatus.processing
        db.commit()

        # Create temp working directory
        with tempfile.TemporaryDirectory() as tmpdir:
            # Download input file
            input_path = os.path.join(tmpdir, f"input.{from_fmt}")
            storage.download_file(input_file_key, input_path)

            # Convert
            output_path = os.path.join(tmpdir, f"output.{to_fmt}")
            conversion.convert_file(input_path, from_fmt, to_fmt, output_path)

            # Apply watermark for free tier
            final_path = output_path
            if is_free_tier:
                watermarked_path = os.path.join(tmpdir, f"watermarked.{to_fmt}")
                watermark.apply_watermark(output_path, watermarked_path, to_fmt)
                final_path = watermarked_path

            # Upload result
            content_type = conversion.CONTENT_TYPES.get(to_fmt, "application/octet-stream")
            output_key = f"outputs/{user_id}/{uuid.uuid4()}.{to_fmt}"
            storage.upload_file(final_path, output_key, content_type)

            # Update job
            job.status = JobStatus.completed
            job.output_file_key = output_key
            job.watermarked = is_free_tier
            job.completed_at = datetime.utcnow()
            db.commit()

            logger.info(f"Job {job_id} completed: {from_fmt} -> {to_fmt}")
            return {"job_id": job_id, "output_key": output_key}

    except Exception as exc:
        logger.error(f"Job {job_id} failed: {exc}")
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = JobStatus.failed
            job.error_message = str(exc)
            db.commit()

        try:
            raise self.retry(exc=exc, countdown=5)
        except Exception:
            pass
    finally:
        db.close()
"""
S3-compatible file storage service.
Works with Cloudflare R2, AWS S3, and MinIO.
Falls back gracefully when credentials are not configured (dev mode).
"""
import os
import uuid
from pathlib import Path
from typing import Optional

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from loguru import logger

from app.config import settings


def _s3():
    """Create and return a fresh S3 client."""
    kwargs = {
        "aws_access_key_id": settings.s3_access_key,
        "aws_secret_access_key": settings.s3_secret_key,
        "region_name": settings.s3_region,
        "config": Config(signature_version="s3v4"),
    }
    if settings.s3_endpoint_url:
        kwargs["endpoint_url"] = settings.s3_endpoint_url
    return boto3.client("s3", **kwargs)


def _storage_available() -> bool:
    return bool(settings.s3_access_key and settings.s3_secret_key)


def upload_file(file_path: str, key: Optional[str] = None, content_type: str = "application/octet-stream") -> str:
    """Upload a local file to storage. Returns the object key."""
    if not key:
        ext = Path(file_path).suffix
        key = f"files/{uuid.uuid4()}{ext}"

    if not _storage_available():
        logger.warning("S3 credentials not set — skipping upload (dev mode)")
        return key

    try:
        _s3().upload_file(
            file_path,
            settings.s3_bucket_name,
            key,
            ExtraArgs={"ContentType": content_type},
        )
        return key
    except ClientError as e:
        logger.error(f"S3 upload_file failed: {e}")
        raise


def upload_bytes(data: bytes, key: str, content_type: str = "application/octet-stream") -> str:
    """Upload raw bytes to storage. Returns the object key."""
    if not _storage_available():
        logger.warning("S3 credentials not set — skipping upload (dev mode)")
        return key

    try:
        _s3().put_object(
            Bucket=settings.s3_bucket_name,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        return key
    except ClientError as e:
        logger.error(f"S3 upload_bytes failed: {e}")
        raise


def download_file(key: str, dest_path: str) -> str:
    """Download a file from storage to a local path. Returns dest_path."""
    if not _storage_available():
        raise RuntimeError("S3 credentials not configured")

    try:
        _s3().download_file(settings.s3_bucket_name, key, dest_path)
        return dest_path
    except ClientError as e:
        logger.error(f"S3 download_file failed: {e}")
        raise


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    """Generate a temporary signed download URL."""
    if not _storage_available():
        return f"/dev-placeholder/{key}"

    try:
        return _s3().generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket_name, "Key": key},
            ExpiresIn=expires_in,
        )
    except ClientError as e:
        logger.error(f"S3 presigned URL failed: {e}")
        raise


def delete_file(key: str):
    """Delete a file from storage (best-effort)."""
    if not _storage_available():
        return

    try:
        _s3().delete_object(Bucket=settings.s3_bucket_name, Key=key)
    except ClientError as e:
        logger.warning(f"S3 delete failed: {e}")
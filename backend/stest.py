from app.services.storage import upload_bytes

key = upload_bytes(b"Hello R2", "test/hello.txt", "text/plain")
print(f"Uploaded with key: {key}")
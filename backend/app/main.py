from fastapi import FastAPI
from app.routers import invoice_router

app = FastAPI(title="Zamp Invoice Assistant")

app.include_router(invoice_router.router)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Invoice Assistant backend is running"}
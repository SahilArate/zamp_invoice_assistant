from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import invoice_router

app = FastAPI(title="Zamp Invoice Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(invoice_router.router)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Invoice Assistant backend is running"}
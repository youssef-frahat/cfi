import sys
import os
from pathlib import Path

# Add project root and backend to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))
sys.path.insert(0, str(root_dir / "backend"))

try:
    from backend.app.main import app
except Exception as e:
    import traceback
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    
    app = FastAPI(title="CFI Fallback Error Handler")
    
    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
    def catch_all_error(path_name: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend Startup Exception",
                "details": str(e),
                "traceback": traceback.format_exc()
            }
        )

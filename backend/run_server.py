"""
Server launcher for EGX Voice-to-Order HITL Backend.
Runs on http://127.0.0.1:8000
"""
import uvicorn
import os
import sys

# Ensure backend package is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if __name__ == "__main__":
    print("=" * 60)
    print(" EGX Voice-to-Order HITL Backend Gateway (FastAPI)")
    print(" Compliant with Egyptian Financial Regulatory Authority (FRA)")
    print(" FIX 4.4 Engine & Multimodal Dialect Extraction Ready")
    print(" Listening on: http://127.0.0.1:8000")
    print(" Docs: http://127.0.0.1:8000/docs")
    print("=" * 60)
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=False)

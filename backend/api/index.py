import os
import sys

# Ensure src/ is on the Python path for Vercel / serverless runtime
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app

__all__ = ["app"]

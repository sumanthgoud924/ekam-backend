import os
import shutil
from pathlib import Path

source_dir = Path(r"e:\Mobile App\Ekam Multi Purpose app\ekam-voice-hub")
release_dir = Path(r"e:\Mobile App\Ekam Multi Purpose app\ekam-release")
zip_path = Path(r"e:\Mobile App\Ekam Multi Purpose app\ekam-voice-hub-ready") # shutil appends .zip

if release_dir.exists():
    shutil.rmtree(release_dir, ignore_errors=True)
if Path(str(zip_path) + ".zip").exists():
    os.remove(str(zip_path) + ".zip")

release_dir.mkdir(parents=True)

# Copy frontend/build
frontend_build_src = source_dir / "frontend" / "build"
frontend_build_dest = release_dir / "frontend" / "build"
if frontend_build_src.exists():
    shutil.copytree(frontend_build_src, frontend_build_dest)

# Copy backend
backend_src = source_dir / "backend"
backend_dest = release_dir / "backend"

def ignore_files(dir, files):
    return [f for f in files if f in ("venv", "__pycache__", ".pytest_cache", ".env") or f.endswith(".pyc")]

shutil.copytree(backend_src, backend_dest, ignore=ignore_files)

# Zip
shutil.make_archive(str(zip_path), 'zip', release_dir)

# Cleanup
shutil.rmtree(release_dir, ignore_errors=True)

print(f"Zip file created successfully at: {zip_path}.zip")

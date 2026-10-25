import os
import zipfile

source_dir = r"C:\Users\Atharva\.gemini\antigravity\scratch\sesa-event-tracker"
output_zip = r"C:\Users\Atharva\Downloads\sesa-event-tracker.zip"

exclude_dirs = {"node_modules", ".next", ".git"}

if os.path.exists(output_zip):
    try:
        os.remove(output_zip)
    except Exception as e:
        print(f"Could not delete old zip: {e}")

print(f"Packaging {source_dir} -> {output_zip} ...")
file_count = 0

with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(source_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, source_dir)
            zf.write(full_path, rel_path)
            file_count += 1

size_mb = os.path.getsize(output_zip) / (1024 * 1024)
print(f"Successfully packaged {file_count} files into {output_zip} ({size_mb:.2f} MB)")

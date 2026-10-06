"""Extract supplied teaching figures without altering clinical image content."""
from pathlib import Path
import subprocess
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
output = root / "public/assets/teaching"
for page in (5, 11):
    subprocess.run(["pdftoppm", "-f", str(page), "-l", str(page), "-singlefile", "-scale-to", "1800", "-jpeg", str(root / "public/resources/pelvic-fracture-medical-student-2024.pdf"), str(output / f"slide-{page}")], check=True)
handout = PdfReader(root / "public/resources/pelvic-fracture-teaching-handout-th.pdf")
# Extract the original embedded Figure 12, without cropping or resampling.
image = next(iter(handout.pages[16].images))
(output / "binder-manikin-page17.jpg").write_bytes(image.data)

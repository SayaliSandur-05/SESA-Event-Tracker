import urllib.request
import re

url = "https://sesa-omega.vercel.app/_next/static/css/700d17db3a775d5a.css"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

with urllib.request.urlopen(req) as resp:
    css = resp.read().decode("utf-8", errors="ignore")

# Find color rules
for pattern in [r'\.bg-navy-[0-9]+', r'\.bg-gold[a-z-]*', r'\.bg-ivory', r'\.text-gold[a-z-]*', r'\.text-ivory']:
    matches = re.findall(pattern + r'\{[^}]+\}', css)
    print(pattern, matches[:4])

# Find font-display definition
print("font-display:", re.findall(r'\.font-display\{[^}]+\}', css))

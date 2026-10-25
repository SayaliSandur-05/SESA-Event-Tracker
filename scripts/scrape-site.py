import urllib.request
import re
import json

url = "https://sesa-omega.vercel.app/"
req = urllib.request.Request(
    url,
    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
)

try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode("utf-8", errors="ignore")
        print("Status:", resp.status)
        print("Length:", len(html))
        
        # Save HTML to examine
        with open("sesa_omega.html", "w", encoding="utf-8") as f:
            f.write(html)
            
        imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', html)
        print("Images found:", imgs)
        
        links = re.findall(r'<link[^>]+href=["\']([^"\']+)["\']', html)
        print("CSS / Links:", [l for l in links if "css" in l or "icon" in l or "logo" in l or "font" in l])
        
        scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', html)
        print("Scripts:", scripts[:5])
        
        # Extract title and headings
        title = re.findall(r'<title>(.*?)</title>', html)
        print("Title:", title)
        
        h1s = re.findall(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL)
        print("H1s:", h1s)
        
        h2s = re.findall(r'<h2[^>]*>(.*?)</h2>', html, re.DOTALL)
        print("H2s:", h2s)
        
except Exception as e:
    print("Error:", e)

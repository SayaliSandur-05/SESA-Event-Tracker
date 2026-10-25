with open("sesa_omega.html", "r", encoding="utf-8") as f:
    html = f.read()

import re
sec0 = re.findall(r'<section class="relative min-h-\[760px\].*?</section>', html, re.DOTALL)
if sec0:
    content = sec0[0]
    print("Hero Length:", len(content))
    # Print the right column
    cols = re.findall(r'<div class="relative mx-auto grid max-w-7xl.*?</div>\s*</div>\s*</div>', content, re.DOTALL)
    print(content[:3000])
    print("\n--- NEXT PART ---")
    print(content[3000:6000])

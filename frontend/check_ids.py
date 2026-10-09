import re

with open('frontend/index.html', encoding='utf-8') as f:
    html = f.read()
with open('frontend/script.js', encoding='utf-8') as f:
    js = f.read()

html_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html))
js_ids   = set(re.findall(r'getElementById\(["\']([\w-]+)["\']\)', js))

missing = js_ids - html_ids
print('IDs referenced in JS but missing from HTML:')
for m in sorted(missing):
    print('  MISSING:', m)
if not missing:
    print('  (none)')

print()
print('HTML IDs:', sorted(html_ids))
print('JS IDs:  ', sorted(js_ids))

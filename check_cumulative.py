import json
import re

with open('data.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

# Extract the globalData array
# globalData = [...]
match = re.search(r'const globalData\s*=\s*(\[.*?\]);', js_content, re.DOTALL)
if match:
    data_str = match.group(1)
    # Parse as JSON (might need to handle single quotes or undefined, but let's try)
    try:
        data = json.loads(data_str)
        print("Loaded globalData successfully. Total rows:", len(data))
        
        # Check Sweden, Iceland, and World
        missing = []
        for row in data:
            if row.get('Year') == 2022 and row.get('Code') is not None and len(row.get('Code')) == 3 and not row.get('Code').startswith('OWID'):
                if row.get('co2_cumulative') is None:
                    missing.append(row.get('Entity'))
        print(f"Countries missing co2_cumulative in 2022: {len(missing)}")
        if missing:
            print("Missing countries list:", missing[:10])
    except Exception as e:
        print("Failed to parse JSON directly:", e)
        # Let's find via regex
        for country in ['Sweden', 'Iceland', 'Indonesia', 'World']:
            matches = re.findall(rf'{{\s*"Entity":\s*"{country}".*?"co2_cumulative":\s*(\d+\.?\d*)', js_content)
            print(f"{country} matches count: {len(matches)}")
            if matches:
                print(f"{country} first matches:", matches[:3])
                print(f"{country} last matches:", matches[-3:])
else:
    print("Could not find globalData in data.js")

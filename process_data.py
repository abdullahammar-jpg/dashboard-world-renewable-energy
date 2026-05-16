import pandas as pd
import json
import os
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

def safe_read_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        return pd.read_csv(path)
    print(f"[WARNING] File not found: {path}")
    return pd.DataFrame()

# ── Load datasets ─────────────────────────────────────────────────────────────
co2_total   = safe_read_csv('annual-co2-emissions-per-country.csv')
co2_capita  = safe_read_csv('co-emissions-per-capita.csv')
ren_primary = safe_read_csv('renewable-share-energy.csv')
ren_elec    = safe_read_csv('share-elec-by-source.csv')

if not ren_primary.empty:
    ren_primary = ren_primary.rename(columns={'Renewables': 'renewable_primary'})
    if 'Code' in ren_primary.columns:
        ren_primary = ren_primary.drop(columns=['Code'])

if not ren_elec.empty:
    ren_elec = ren_elec.fillna(0)
    ren_elec['renewable_elec']     = ren_elec['Hydropower'] + ren_elec['Solar'] + ren_elec['Wind'] + ren_elec['Other renewables'] + ren_elec['Bioenergy']
    ren_elec['non_renewable_elec'] = ren_elec['Coal'] + ren_elec['Gas'] + ren_elec['Oil'] + ren_elec['Nuclear']
    ren_elec = ren_elec[['Entity', 'Year', 'renewable_elec', 'non_renewable_elec']]

# ── Load forest data ──────────────────────────────────────────────────────────
forest_path = os.path.join(DATA_DIR, 'forest_loss_cleaned.xlsx')
if os.path.exists(forest_path):
    forest = pd.read_excel(forest_path)
    forest = forest.rename(columns={
        'Negara': 'Entity',
        'Tahun': 'Year',
        'Total_Loss_Ha (ha)': 'forest_loss'
    })
else:
    print("[WARNING] forest_loss_cleaned.xlsx not found")
    forest = pd.DataFrame()

# ── Merge all datasets ────────────────────────────────────────────────────────
dfs = [df for df in [co2_total, co2_capita, ren_primary, ren_elec, forest] if not df.empty]

merged = dfs[0]
for df in dfs[1:]:
    if 'Code' in df.columns and 'Code' in merged.columns:
        df = df.drop(columns=['Code'])
    merged = pd.merge(merged, df, on=['Entity', 'Year'], how='outer')

col_map = {
    'Annual CO₂ emissions':    'co2_total',
    'CO₂ emissions per capita': 'co2_capita'
}
merged = merged.rename(columns=col_map)

# ── Imputation: fill missing renewable_primary with year-wise mean ─────────────
if 'renewable_primary' in merged.columns:
    year_means = merged.groupby('Year')['renewable_primary'].transform('mean')
    merged['renewable_primary'] = merged['renewable_primary'].fillna(year_means)

merged = merged.replace({np.nan: None})

# ── Build clean output ────────────────────────────────────────────────────────
data = merged.to_dict(orient='records')
clean_data = [
    d for d in data
    if not all(d.get(k) is None for k in ['co2_total', 'co2_capita', 'renewable_primary', 'renewable_elec', 'forest_loss'])
]
clean_data.sort(key=lambda x: (x['Entity'], x['Year']))

# ── Write data.js to project root ────────────────────────────────────────────
out_path = os.path.join(BASE_DIR, 'data.js')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write('const globalData = ' + json.dumps(clean_data, ensure_ascii=False) + ';\n')
    f.write('console.log("Data loaded from data.js, total rows: ", globalData.length);')

print(f"Successfully generated data.js ({len(clean_data)} rows)")

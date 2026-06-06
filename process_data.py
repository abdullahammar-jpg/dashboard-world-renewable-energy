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
co2_total      = safe_read_csv('annual-co2-emissions-per-country.csv')
co2_capita     = safe_read_csv('co-emissions-per-capita.csv')
ren_primary    = safe_read_csv('renewable-share-energy.csv')
ren_elec       = safe_read_csv('share-elec-by-source.csv')
cumulative_co2 = safe_read_csv('cumulative-co-emissions.csv')
co2_land_use   = safe_read_csv('co2-fossil-plus-land-use.csv')
co2_by_source  = safe_read_csv('per-capita-co2-by-source.csv')

# ── Process EBT Electricity details ───────────────────────────────────────────
if not ren_elec.empty:
    ren_elec = ren_elec.fillna(0)
    ren_elec['renewable_elec']     = ren_elec['Hydropower'] + ren_elec['Solar'] + ren_elec['Wind'] + ren_elec['Other renewables'] + ren_elec['Bioenergy']
    ren_elec['non_renewable_elec'] = ren_elec['Coal'] + ren_elec['Gas'] + ren_elec['Oil'] + ren_elec['Nuclear']
    
    # Rename other renewables to avoid spaces and preserve columns
    ren_elec = ren_elec.rename(columns={'Other renewables': 'other_renewables'})
    ren_elec = ren_elec[['Entity', 'Year', 'renewable_elec', 'non_renewable_elec', 'Hydropower', 'Solar', 'Wind', 'other_renewables', 'Bioenergy']]

# ── Process Cumulative CO2 ────────────────────────────────────────────────────
if not cumulative_co2.empty:
    # Rename cumulative column dynamically to handle different unicode formats (e.g. CO2 vs CO₂)
    cum_col = [c for c in cumulative_co2.columns if 'Cumulative' in c]
    if cum_col:
        cumulative_co2 = cumulative_co2.rename(columns={cum_col[0]: 'co2_cumulative'})
    if 'Code' in cumulative_co2.columns:
        cumulative_co2 = cumulative_co2.drop(columns=['Code'])

# ── Process CO2 Fossil & Land Use ─────────────────────────────────────────────
if not co2_land_use.empty:
    co2_land_use = co2_land_use.rename(columns={
        'Total (fossil fuels and land-use change)': 'co2_total_with_land_use',
        'Land-use change': 'co2_land_use',
        'Fossil fuels': 'co2_fossil'
    })
    if 'Code' in co2_land_use.columns:
        co2_land_use = co2_land_use.drop(columns=['Code'])

# ── Process Per Capita CO2 by Source ──────────────────────────────────────────
if not co2_by_source.empty:
    co2_by_source = co2_by_source.rename(columns={
        'Coal': 'co2_capita_coal',
        'Oil': 'co2_capita_oil',
        'Gas': 'co2_capita_gas',
        'Flaring': 'co2_capita_flaring',
        'Cement': 'co2_capita_cement',
        'Other industry': 'co2_capita_other_industry'
    })
    if 'Code' in co2_by_source.columns:
        co2_by_source = co2_by_source.drop(columns=['Code'])

# ── Process Renewable Primary ─────────────────────────────────────────────────
if not ren_primary.empty:
    ren_primary = ren_primary.rename(columns={'Renewables': 'renewable_primary'})
    if 'Code' in ren_primary.columns:
        ren_primary = ren_primary.drop(columns=['Code'])

# ── Load forest data ──────────────────────────────────────────────────────────
forest_path = os.path.join(DATA_DIR, 'forest_loss_cleaned.xlsx')
if os.path.exists(forest_path):
    forest = pd.read_excel(forest_path)
    forest = forest.rename(columns={
        'Negara': 'Entity',
        'Tahun': 'Year',
        'Total_Loss_Ha (ha)': 'forest_loss'
    })
    # Remove duplicates in raw Excel by summing forest loss per (Entity, Year)
    forest = forest.groupby(['Entity', 'Year'], as_index=False)['forest_loss'].sum()
else:
    print("[WARNING] forest_loss_cleaned.xlsx not found")
    forest = pd.DataFrame()

# ── Merge all datasets ────────────────────────────────────────────────────────
dfs = [df for df in [co2_total, co2_capita, ren_primary, ren_elec, forest, cumulative_co2, co2_land_use, co2_by_source] if not df.empty]

merged = dfs[0]
for df in dfs[1:]:
    if 'Code' in df.columns and 'Code' in merged.columns:
        df = df.drop(columns=['Code'])
    merged = pd.merge(merged, df, on=['Entity', 'Year'], how='outer')

# Safe rename for total co2 and per capita co2
col_map = {}
for col in merged.columns:
    if 'Annual CO' in col and 'emissions' in col:
        col_map[col] = 'co2_total'
    elif 'CO' in col and 'emissions per capita' in col:
        col_map[col] = 'co2_capita'
merged = merged.rename(columns=col_map)

# ── Filter Year Range (1990-2022) ─────────────────────────────────────────────
# We only display 1990 to 2022 in the dashboard, filtering early saves memory and cleans data.
merged = merged[(merged['Year'] >= 1990) & (merged['Year'] <= 2022)]

# ── Deduplicate: collapse rows with same (Entity, Year) ──────────────────────
print(f"[INFO] Rows before dedup: {len(merged)}")
merged = merged.sort_values(['Entity', 'Year'])
merged = merged.groupby(['Entity', 'Year'], as_index=False).first()
print(f"[INFO] Rows after dedup: {len(merged)}")

# ── Imputation: fill missing renewable_primary with year-wise mean ─────────────
if 'renewable_primary' in merged.columns:
    year_means = merged.groupby('Year')['renewable_primary'].transform('mean')
    merged['renewable_primary'] = merged['renewable_primary'].fillna(year_means)

# ── Imputation: Linear interpolation for all key numeric fields ──────────────
# We interpolate missing values per country (Entity) to eliminate gaps and ensure smooth charts.
numeric_cols = [
    'co2_total', 'co2_capita', 'renewable_primary', 'renewable_elec', 
    'non_renewable_elec', 'Hydropower', 'Solar', 'Wind', 'other_renewables', 
    'Bioenergy', 'forest_loss', 'co2_cumulative', 'co2_total_with_land_use', 
    'co2_land_use', 'co2_fossil', 'co2_capita_coal', 'co2_capita_oil', 
    'co2_capita_gas', 'co2_capita_flaring', 'co2_capita_cement', 
    'co2_capita_other_industry'
]

# Ensure we sort before interpolating time series
merged = merged.sort_values(['Entity', 'Year'])
for col in numeric_cols:
    if col in merged.columns:
        merged[col] = merged.groupby('Entity')[col].transform(
            lambda x: x.interpolate(method='linear', limit_direction='both')
        )

# ── Imputation: fill remaining NaN with year-wise mean and fallback to 0 ──────
# This guarantees that there are no missing values in any country, ensuring all
# countries are colored on the map and have complete data series.
for col in numeric_cols:
    if col in merged.columns:
        year_means = merged.groupby('Year')[col].transform('mean')
        merged[col] = merged[col].fillna(year_means)
        merged[col] = merged[col].fillna(0)

# For any remaining NaNs, fill with 0 or keep as None
merged = merged.replace({np.nan: None})

# ── Build clean output ────────────────────────────────────────────────────────
data = merged.to_dict(orient='records')
required_fields = ['co2_total', 'co2_capita', 'renewable_primary', 'renewable_elec', 'forest_loss', 'co2_cumulative', 'co2_land_use', 'co2_capita_coal']
clean_data = [
    d for d in data
    if not all(d.get(k) is None for k in required_fields)
]
clean_data.sort(key=lambda x: (x['Entity'], x['Year']))

# ── Write data.js to project root ────────────────────────────────────────────
out_path = os.path.join(BASE_DIR, 'data.js')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write('const globalData = ' + json.dumps(clean_data, ensure_ascii=False) + ';\n')
    f.write('console.log("Data loaded from data.js, total rows: ", globalData.length);')

print(f"Successfully generated data.js ({len(clean_data)} rows)")

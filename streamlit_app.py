import streamlit as st
import streamlit.components.v1 as components
import os
import subprocess
import sys
import re

st.set_page_config(
    page_title="Dashboard Analitik Lingkungan",
    layout="wide",
    page_icon="🌍"
)

# Force the embedded iframe to fill the ENTIRE browser viewport
st.markdown("""
<style>
    /* Hide all Streamlit chrome */
    #MainMenu, footer, header { visibility: hidden !important; height: 0 !important; }
    .stDeployButton { display: none !important; }
    .block-container { padding: 0 !important; max-width: 100vw !important; margin: 0 !important; }
    [data-testid="stAppViewContainer"] { padding: 0 !important; overflow: hidden !important; }
    [data-testid="stVerticalBlock"] { gap: 0 !important; padding: 0 !important; }

    /* Make every iframe (our dashboard component) fill the full screen */
    iframe {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        border: none !important;
        z-index: 9999 !important;
    }
</style>
""", unsafe_allow_html=True)

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
DATA_JS    = os.path.join(BASE_DIR, "data.js")

# Auto-generate data.js from raw CSVs if it does not exist
if not os.path.exists(DATA_JS):
    with st.spinner("Memproses data, harap tunggu…"):
        result = subprocess.run(
            [sys.executable, os.path.join(BASE_DIR, "process_data.py")],
            cwd=BASE_DIR, capture_output=True, text=True
        )
        if result.returncode != 0:
            st.error(f"Gagal memproses data:\n{result.stderr}")
            st.stop()

# Read static files
with open(os.path.join(STATIC_DIR, "style.css"), "r", encoding="utf-8") as f:
    css = f.read()
with open(os.path.join(STATIC_DIR, "script.js"), "r", encoding="utf-8") as f:
    js = f.read()
with open(DATA_JS, "r", encoding="utf-8") as f:
    data_js = f.read()

# Extract <body> content from index.html
with open(os.path.join(STATIC_DIR, "index.html"), "r", encoding="utf-8") as f:
    html_full = f.read()

body_match   = re.search(r'<body>(.*?)</body>', html_full, re.DOTALL)
body_content = body_match.group(1).strip() if body_match else ""
body_content = re.sub(r'<script src="data\.js"[^>]*>.*?</script>',   '', body_content, flags=re.DOTALL)
body_content = re.sub(r'<script src="script\.js"[^>]*>.*?</script>', '', body_content, flags=re.DOTALL)

# Build self-contained HTML — uses 100vh naturally since iframe = full viewport
combined_html = f"""<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Analitik Lingkungan</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/15.7.1/nouislider.min.css">
    <style>
        html, body {{ margin: 0; padding: 0; overflow: hidden; height: 100vh; width: 100vw; }}
        {css}
    </style>
</head>
<body>
{body_content}

    <script src="https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/15.7.1/nouislider.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
    <script>{data_js}</script>
    <script>{js}</script>
</body>
</html>"""

# Height just needs to be > 0 — CSS position:fixed controls actual display
components.html(combined_html, height=800, scrolling=False)

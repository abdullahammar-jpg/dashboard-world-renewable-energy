# 🌍 Dashboard Analitik Lingkungan

Dashboard interaktif berbasis web untuk menganalisis data **Emisi CO2**, **Energi Terbarukan (EBT)**, dan **Kehilangan Hutan** secara global maupun per negara.

[![Streamlit App](https://dashboard-world-renewable-energy.streamlit.app/)]

---

## ✨ Fitur

- 🗺️ **Choropleth Map** — Distribusi Emisi CO2 per kapita seluruh dunia
- 💧 **Bubble Chart** — Hubungan antara EBT vs Emisi CO2 per kapita
- 📈 **Line Chart** — Tren EBT dan CO2/kapita per tahun
- 🥧 **Pie Chart** — Komposisi sumber listrik (Terbarukan vs Fosil & Nuklir)
- 🏆 **Bar Chart** — Top 5 negara dengan pencapaian EBT terbaik
- 🎚️ **Filter Rentang Waktu** — Slider tahun interaktif
- 🌐 **Filter Negara** — Highlight per negara dengan efek abu-abu pada negara lain

---

## 🗂️ Struktur Folder

```
Dashboard/
├── streamlit_app.py          # Entry point Streamlit
├── process_data.py           # Script preprocessing data (auto-run saat startup)
├── requirements.txt          # Dependensi Python
├── .gitignore
│
├── .streamlit/
│   └── config.toml           # Konfigurasi tema & server
│
├── static/                   # File frontend
│   ├── index.html
│   ├── style.css
│   └── script.js
│
└── data/                     # Dataset mentah
    ├── annual-co2-emissions-per-country.csv
    ├── co-emissions-per-capita.csv
    ├── renewable-share-energy.csv
    ├── share-elec-by-source.csv
    └── forest_loss_cleaned.xlsx
```

> **Catatan:** File `data.js` tidak di-commit karena di-generate otomatis dari CSV saat aplikasi pertama kali dijalankan.

---

## 🚀 Instalasi & Menjalankan Secara Lokal

### Prasyarat

- Python **3.9+**
- Git

### Langkah-langkah

**1. Clone repository**
```bash
git clone https://github.com/USERNAME/REPO_NAME.git
cd REPO_NAME
```

**2. Buat virtual environment** *(opsional tapi disarankan)*
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

**3. Install dependensi**
```bash
pip install -r requirements.txt
```

**4. Jalankan aplikasi**
```bash
streamlit run streamlit_app.py
```

**5. Buka browser**

Aplikasi akan otomatis terbuka di `http://localhost:8501`.

> Saat pertama kali dijalankan, `process_data.py` akan otomatis memproses semua file CSV dan menghasilkan `data.js`. Proses ini hanya terjadi sekali.

---

## 📊 Sumber Data

| Dataset | Sumber |
|---|---|
| Emisi CO2 Total | Our World in Data |
| Emisi CO2 per Kapita | Our World in Data |
| Energi Terbarukan (Konsumsi Primer) | Our World in Data |
| Komposisi Sumber Listrik | Our World in Data |
| Kehilangan Hutan | Data primer (diolah) |

---

## 🛠️ Teknologi

- **Frontend:** HTML, CSS, JavaScript
- **Visualisasi:** [Apache ECharts](https://echarts.apache.org/)
- **Slider:** [noUiSlider](https://refreshless.com/nouislider/)
- **Backend/Deploy:** [Streamlit](https://streamlit.io/)
- **Preprocessing:** Python (Pandas, NumPy)

---

## 📝 Catatan Pengembangan

Jika data sumber diperbarui, jalankan script preprocessing secara manual:
```bash
python process_data.py
```

---

## 📄 Lisensi

Project ini dibuat untuk keperluan akademik — Mata Kuliah Visualisasi Data, Semester 4.

# BK FOOD AI — Manager Decision Support

## What it does
Takes today's production data (from Excel exports or live from the app),
trains a machine learning model, and generates tomorrow's action plan for the manager.

Predicts:
- How many palettes will arrive tomorrow
- Expected tonnage
- Number of autoclave cycles needed
- Boxes to be packaged
- Risk of 8h wait-time alerts in Chambre 0

Recommends:
- How many lines to activate
- How many autoclaves to prepare
- Whether to reinforce staffing
- Chambre 0 rotation schedule warnings

---

## Setup (once)

    pip install -r requirements.txt

---

## How to use — Full workflow

### Step 1: Export Excel from BK FOOD app
In the app: Admin dashboard → Exporter Excel → saves production-day-YYYY-MM-DD.xlsx
Put all exported files in an `exports/` folder.

### Step 2: Convert Excel to CSV (fast processing)
    python 1_convert_excel_to_csv.py --folder exports/

This creates csv_data/ folder with clean CSVs.
Run this every time you add new Excel exports.

### Step 3: Build training dataset
    python 2_build_dataset.py

Creates dataset.csv — one row per day with all production features.

### Step 4: Train the model
    python 3_train_model.py

Saves trained models to models/ folder.
Re-run whenever you have 2+ weeks of new data.

### Step 5: Get tomorrow's predictions
    python 4_predict_tomorrow.py

Prints the manager action plan and saves rapport_demain.json.

---

## For the Next.js app — Run the API server

    python 5_api_server.py

Then call from Next.js:

    // Get prediction using latest CSV data
    const res = await fetch('http://localhost:5001/predict');

    // Or send live data from the database directly
    const res = await fetch('http://localhost:5001/predict-from-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        palettes_entrees: 45,
        tonnage_total_kg: 3200,
        nb_alertes_8h: 2,
        nb_cycles_autoclave: 5,
        boites_emballees: 4800,
      })
    });

    // Retrain models with latest data
    const res = await fetch('http://localhost:5001/retrain', { method: 'POST' });

---

## File structure

    bkfood_ai/
    ├── 1_convert_excel_to_csv.py   ← Excel → CSV converter
    ├── 2_build_dataset.py          ← Builds training dataset
    ├── 3_train_model.py            ← Trains ML models
    ├── 4_predict_tomorrow.py       ← Generates predictions + recommendations
    ├── 5_api_server.py             ← Flask REST API for Next.js
    ├── requirements.txt            ← Python dependencies
    ├── exports/                    ← Put your Excel files here
    ├── csv_data/                   ← Auto-generated CSVs
    ├── dataset.csv                 ← Auto-generated training dataset
    └── models/                     ← Trained model files (.pkl)

---

## How much data do you need?

| Days of data | Quality          |
|--------------|------------------|
| 10–20 days   | Basic, usable    |
| 20–50 days   | Good             |
| 50–100 days  | Very accurate    |
| 100+ days    | Excellent        |

The more production days in your Excel exports, the smarter the model.

---

## Retrain schedule
Retrain the model every 2 weeks with fresh data for best accuracy.

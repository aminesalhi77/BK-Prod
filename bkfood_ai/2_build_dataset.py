"""
STEP 2 — Build the training dataset from CSV files.
Combines all 4 CSV types into one row per day with features the model needs.

Usage:
    python 2_build_dataset.py
    python 2_build_dataset.py --csv_dir my_csv_folder --output my_dataset.csv
"""

import pandas as pd
import numpy as np
from pathlib import Path
import argparse
import glob


def load_all_sheets(csv_dir: str):
    """Load and concatenate all CSVs per sheet type."""
    csv_dir = Path(csv_dir)

    def load_type(prefix):
        files = list(csv_dir.glob(f"{prefix}_*.csv"))
        if not files:
            return pd.DataFrame()
        dfs = []
        for f in files:
            try:
                dfs.append(pd.read_csv(f, parse_dates=True))
            except Exception as e:
                print(f"  ⚠️  Could not read {f.name}: {e}")
        return pd.concat(dfs, ignore_index=True) if dfs else pd.DataFrame()

    palettes  = load_type("palettes")
    lignes    = load_type("lignes")
    autoclave = load_type("autoclaves")
    emballage = load_type("emballage")

    print(f"Loaded: {len(palettes)} palette rows, {len(lignes)} ligne rows, "
          f"{len(autoclave)} autoclave rows, {len(emballage)} emballage rows")

    return palettes, lignes, autoclave, emballage


def extract_date(df, col):
    """Extract date from a datetime column."""
    if col in df.columns:
        df[col] = pd.to_datetime(df[col], errors="coerce")
        return df[col].dt.date
    return None


def build_daily_features(palettes, lignes, autoclave, emballage):
    """
    Aggregate all data into one row per day.
    Each row = one day of production.
    Features = what happened that day.
    Target = what should happen tomorrow (derived from next day's data).
    """
    rows = []

    # Get all unique dates from palettes
    if palettes.empty:
        print("No palette data found. Cannot build dataset.")
        return pd.DataFrame()

    palettes["entry_date"] = pd.to_datetime(palettes["entry_time"], errors="coerce").dt.date
    all_dates = sorted(palettes["entry_date"].dropna().unique())

    print(f"Building features for {len(all_dates)} days...")

    for date in all_dates:
        row = {"date": date}

        # ── Chambre 0 features ────────────────────────────────────────
        day_pal = palettes[palettes["entry_date"] == date]

        row["palettes_entrees"]        = len(day_pal)
        row["tonnage_total_kg"]        = day_pal["weight_kg"].sum() if "weight_kg" in day_pal else 0
        row["tonnage_moyen_palette"]   = day_pal["weight_kg"].mean() if "weight_kg" in day_pal else 0

        # Wait time features
        if "entry_time" in day_pal.columns and "exit_time" in day_pal.columns:
            day_pal = day_pal.copy()
            day_pal["entry_time"] = pd.to_datetime(day_pal["entry_time"], errors="coerce")
            day_pal["exit_time"]  = pd.to_datetime(day_pal["exit_time"],  errors="coerce")
            day_pal["wait_hours"] = (day_pal["exit_time"] - day_pal["entry_time"]).dt.total_seconds() / 3600
            row["attente_moyenne_h"]  = day_pal["wait_hours"].mean()
            row["attente_max_h"]      = day_pal["wait_hours"].max()
            row["nb_alertes_8h"]      = (day_pal["wait_hours"] > 8).sum()
        else:
            row["attente_moyenne_h"]  = 0
            row["attente_max_h"]      = 0
            row["nb_alertes_8h"]      = 0

        # Longe type distribution
        if "longe_type" in day_pal.columns:
            type_counts = day_pal["longe_type"].value_counts()
            for lt in ["CB Simple parage", "CB Double parage", "CT simple parage",
                       "Longe précuit", "Miette", "Morcelé"]:
                safe_key = "type_" + lt.lower().replace(" ", "_").replace("é", "e").replace("è", "e")
                row[safe_key] = type_counts.get(lt, 0)

        # Palettes in stock at end of day
        if "status" in day_pal.columns:
            row["stock_fin_jour"] = (day_pal["status"] == "IN_CHAMBRE").sum()
        else:
            row["stock_fin_jour"] = 0

        # ── Ligne features ────────────────────────────────────────────
        if not lignes.empty and "entry_time" in lignes.columns:
            lignes["entry_date"] = pd.to_datetime(lignes["entry_time"], errors="coerce").dt.date
            day_lignes = lignes[lignes["entry_date"] == date]
            row["palettes_alimentees_ligne"] = len(day_lignes)

            if "ligne_label" in day_lignes.columns:
                ligne_counts = day_lignes["ligne_label"].value_counts()
                for ligne in ["5/2 [1]", "5/2 [2]", "400", "1/5", "Manuel"]:
                    safe = "ligne_" + ligne.lower().replace("/", "_").replace(" ", "").replace("[", "").replace("]", "")
                    row[safe] = ligne_counts.get(ligne, 0)

            if "article" in day_lignes.columns:
                row["nb_articles_differents"] = day_lignes["article"].nunique()
        else:
            row["palettes_alimentees_ligne"] = 0
            row["nb_articles_differents"]    = 0

        # ── Autoclave features ────────────────────────────────────────
        if not autoclave.empty and "start_time" in autoclave.columns:
            autoclave["start_date"] = pd.to_datetime(autoclave["start_time"], errors="coerce").dt.date
            day_auto = autoclave[autoclave["start_date"] == date]
            row["nb_cycles_autoclave"]   = len(day_auto)
            row["duree_moyenne_cycle"]   = day_auto["duration_minutes"].mean() if "duration_minutes" in day_auto else 0
            row["duree_max_cycle"]       = day_auto["duration_minutes"].max()  if "duration_minutes" in day_auto else 0

            if "autoclave_id" in day_auto.columns:
                row["nb_autoclaves_utilises"] = day_auto["autoclave_id"].nunique()
        else:
            row["nb_cycles_autoclave"]    = 0
            row["duree_moyenne_cycle"]    = 0
            row["duree_max_cycle"]        = 0
            row["nb_autoclaves_utilises"] = 0

        # ── Emballage features ────────────────────────────────────────
        if not emballage.empty and "recorded_at" in emballage.columns:
            emballage["rec_date"] = pd.to_datetime(emballage["recorded_at"], errors="coerce").dt.date
            day_emb = emballage[emballage["rec_date"] == date]
            row["boites_emballees"]    = day_emb["total_boxes"].sum() if "total_boxes" in day_emb else 0
            row["nb_lots_emballage"]   = len(day_emb)
        else:
            row["boites_emballees"]  = 0
            row["nb_lots_emballage"] = 0

        # ── Day of week (Monday=0, Sunday=6) ──────────────────────────
        d = pd.Timestamp(date)
        row["jour_semaine"]    = d.dayofweek
        row["est_lundi"]       = int(d.dayofweek == 0)
        row["est_vendredi"]    = int(d.dayofweek == 4)

        rows.append(row)

    df = pd.DataFrame(rows)
    df = df.fillna(0)

    # ── Build targets: what happened the NEXT day ─────────────────────
    # The model learns: "given today's data, predict tomorrow's targets"
    df = df.sort_values("date").reset_index(drop=True)

    df["target_palettes_demain"]    = df["palettes_entrees"].shift(-1)
    df["target_tonnage_demain"]     = df["tonnage_total_kg"].shift(-1)
    df["target_cycles_demain"]      = df["nb_cycles_autoclave"].shift(-1)
    df["target_boites_demain"]      = df["boites_emballees"].shift(-1)
    df["target_alertes_demain"]     = (df["nb_alertes_8h"].shift(-1) > 0).astype(float)

    # Remove last row (no tomorrow data)
    df = df[:-1]

    print(f"OK Dataset built: {len(df)} rows x {len(df.columns)} columns")
    return df


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv_dir", default="csv_data", help="Folder with CSV files")
    parser.add_argument("--output",  default="dataset.csv", help="Output dataset CSV path")
    args = parser.parse_args()

    palettes, lignes, autoclave, emballage = load_all_sheets(args.csv_dir)
    df = build_daily_features(palettes, lignes, autoclave, emballage)

    if not df.empty:
        df.to_csv(args.output, index=False, encoding="utf-8-sig")
        print(f"\nSaved Dataset saved to: {args.output}")
        print(df.tail(3).to_string())

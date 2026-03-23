#!/usr/bin/env python3
"""
BK FOOD AI - Fake Data Generator
Generates 90 days of realistic fake production data for the BK FOOD tuna canning factory.

Usage:
    cd bkfood_ai
    python generate_fake_data.py

What it does:
- Generates 90 days of fake production data (skipping weekends)
- Creates Excel files with 4 sheets: Palettes, Lignes, Autoclaves, Emballage
- Automatically runs the AI pipeline: Excel → CSV → Dataset → Models
- Prints a summary of generated data and trained models
"""

import os
import sys
import random
import string
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from pathlib import Path

# ── Configuration ─────────────────────────────────────────────────────────────
DAYS_TO_GENERATE = 90
EXPORTS_DIR = Path("exports")
CSV_DIR = Path("csv_data")
MODELS_DIR = Path("models")

# Ensure directories exist
EXPORTS_DIR.mkdir(exist_ok=True)
CSV_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)

# Production rules configuration
PALETTES_PER_DAY = (15, 40)  # Min, Max
CYCLES_PER_DAY = (3, 7)      # Min, Max

# Longe types with probabilities
LONGE_TYPES = [
    ("CB Simple parage", 0.40),
    ("CB Double parage", 0.12),
    ("CT simple parage", 0.12),
    ("Longe précuit", 0.12),
    ("Miette", 0.12),
    ("Morcelé", 0.12)
]

# Ligne labels with probabilities
LIGNE_LABELS = [
    ("5/2 [1]", 0.30),
    ("5/2 [2]", 0.30),
    ("400", 0.15),
    ("1/5", 0.15),
    ("Manuel", 0.10)
]

# Articles with equal probability
ARTICLES = [
    "Thon Entier à l'Huile",
    "Thon Entier au Naturel", 
    "Thon en Morceaux à l'Huile",
    "Thon en Morceaux au Naturel",
    "Thon Emietté à l'Huile",
    "Thon Emietté à la Tomate"
]

# Operators and staff
OPERATORS = ["1001", "1002", "1003"]
CHEFS_TAPIS = ["2001", "2002", "2003", "2004", "2005"]
CHEFFES_LIGNE = ["3001", "3002", "3003"]
CONDUCTEURS = ["4001", "4002", "4003"]
ASSISTANTS = ["4004", "4005"]
CHEFFES_EMBALLAGE = ["5001", "5002"]

# Position ranges
POSITION_ZONES = [chr(ord('A') + i) for i in range(9)]  # A to I
POSITION_NUMBERS = list(range(1, 37))  # 1 to 36

# ── Helper Functions ──────────────────────────────────────────────────────────
def random_string(length=8, chars=string.ascii_uppercase + string.digits):
    """Generate random alphanumeric string."""
    return ''.join(random.choice(chars) for _ in range(length))

def weighted_choice(choices):
    """Choose from weighted list of (item, probability) tuples."""
    r = random.random()
    cumulative = 0.0
    for item, prob in choices:
        cumulative += prob
        if r <= cumulative:
            return item
    return choices[-1][0]  # Fallback

def random_time(start_hour, end_hour, day_date):
    """Generate random time between start_hour and end_hour on given day."""
    hour = random.randint(start_hour, end_hour - 1)
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    return datetime.combine(day_date, datetime.min.time().replace(hour=hour, minute=minute, second=second))

def is_weekend(date_obj):
    """Check if date is Saturday (5) or Sunday (6)."""
    return date_obj.weekday() >= 5

# ── Data Generation Functions ─────────────────────────────────────────────────
def generate_palettes_data(day_date, num_palettes):
    """Generate Palettes sheet data for one day."""
    palettes = []
    
    for i in range(1, num_palettes + 1):
        # Generate random times
        entry_time = random_time(6, 10, day_date)  # 06:00 to 09:59
        wait_hours = random.uniform(2, 10)  # 2 to 10 hours
        exit_time = entry_time + timedelta(hours=wait_hours)
        
        # Generate random longe type based on probabilities
        longe_type = weighted_choice(LONGE_TYPES)
        
        palette = {
            "code": f"PAL-{random_string(8)}",
            "parage_ref": f"PRG-{random.randint(100, 999)}",
            "numero_palette": i,
            "longe_type": longe_type,
            "weight_kg": round(random.uniform(180, 450), 2),
            "position_zone": random.choice(POSITION_ZONES),
            "position_number": random.choice(POSITION_NUMBERS),
            "entry_time": entry_time.strftime("%Y-%m-%d %H:%M:%S"),
            "exit_time": exit_time.strftime("%Y-%m-%d %H:%M:%S"),
            "status": "SENT_TO_LIGNE",
            "operator_matricule": random.choice(OPERATORS),
            "chef_tapis_1": random.choice(CHEFS_TAPIS),
            "chef_tapis_2": random.choice(CHEFS_TAPIS),
            "chef_tapis_3": random.choice(CHEFS_TAPIS),
            "chef_tapis_4": random.choice(CHEFS_TAPIS),
        }
        palettes.append(palette)
    
    return pd.DataFrame(palettes)

def generate_lignes_data(palettes_df):
    """Generate Lignes sheet data based on palettes."""
    lignes = []
    
    for _, palette in palettes_df.iterrows():
        # Choose ligne label based on probabilities
        ligne_label = weighted_choice(LIGNE_LABELS)
        
        # Choose random article
        article = random.choice(ARTICLES)
        
        # Calculate entry time (exit_time + 10-40 minutes)
        exit_time = datetime.strptime(palette["exit_time"], "%Y-%m-%d %H:%M:%S")
        entry_delay = timedelta(minutes=random.randint(10, 40))
        entry_time = exit_time + entry_delay
        
        ligne = {
            "palette_code": palette["code"],
            "ligne_label": ligne_label,
            "article": article,
            "cheffe_ligne_matricule": random.choice(CHEFFES_LIGNE),
            "entry_time": entry_time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        lignes.append(ligne)
    
    return pd.DataFrame(lignes)

def generate_autoclaves_data(day_date, num_cycles, palettes_df, lignes_df):
    """Generate Autoclaves sheet data."""
    autoclaves = []
    chariot_counter = 1
    
    # Group palettes by ligne to simulate feeding autoclaves
    ligne_groups = {}
    for _, ligne in lignes_df.iterrows():
        if ligne["ligne_label"] not in ligne_groups:
            ligne_groups[ligne["ligne_label"]] = []
        ligne_groups[ligne["ligne_label"]].append(ligne["palette_code"])
    
    for i in range(1, num_cycles + 1):
        # Choose autoclave
        autoclave_id = f"Autoclave {random.randint(1, 5)}"
        
        # Choose conducteur and assistant
        conducteur = random.choice(CONDUCTEURS)
        assistant = random.choice(ASSISTANTS)
        
        # Random start time between 09:00 and 14:00
        start_time = random_time(9, 14, day_date)
        
        # Random duration between 55 and 95 minutes
        duration_minutes = random.randint(55, 95)
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        # Generate 3-8 chariot codes
        num_chariots = random.randint(3, 8)
        chariots = []
        for _ in range(num_chariots):
            chariots.append(f"CHR-{random_string(8)}")
        chariot_codes = ", ".join(chariots)
        
        # Generate STR code
        str_code = f"STR-{random_string(8)}"
        
        autoclave = {
            "cycle_id": f"CYC-{random_string(8)}",
            "autoclave_id": autoclave_id,
            "conducteur_matricule": conducteur,
            "assistant_matricule": assistant,
            "start_time": start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "duration_minutes": duration_minutes,
            "end_time": end_time.strftime("%Y-%m-%d %H:%M:%S"),
            "chariot_codes": chariot_codes,
            "str_code": str_code,
        }
        autoclaves.append(autoclave)
    
    return pd.DataFrame(autoclaves)

def generate_emballage_data(autoclaves_df):
    """Generate Emballage sheet data based on autoclaves."""
    emballage = []
    
    for _, autoclave in autoclaves_df.iterrows():
        # Choose random article (could be based on ligne but keeping simple)
        article = random.choice(ARTICLES)
        
        # Random total boxes between 800 and 3500
        total_boxes = random.randint(800, 3500)
        
        # Random recorded time (end_time + 20-60 minutes)
        end_time = datetime.strptime(autoclave["end_time"], "%Y-%m-%d %H:%M:%S")
        record_delay = timedelta(minutes=random.randint(20, 60))
        recorded_at = end_time + record_delay
        
        emb = {
            "str_code": autoclave["str_code"],
            "autoclave_id": autoclave["autoclave_id"],
            "article": article,
            "total_boxes": total_boxes,
            "cheffe_emballage_matricule": random.choice(CHEFFES_EMBALLAGE),
            "recorded_at": recorded_at.strftime("%Y-%m-%d %H:%M:%S"),
        }
        emballage.append(emb)
    
    return pd.DataFrame(emballage)

def generate_day_data(day_date):
    """Generate all data for one production day."""
    # Apply Monday boost and Friday reduction
    weekday = day_date.weekday()
    if weekday == 0:  # Monday
        variation = 1.15  # 15% boost
    elif weekday == 4:  # Friday
        variation = 0.85  # 15% reduction
    else:
        variation = 1.0
    
    # Add random variation of ±15%
    variation *= random.uniform(0.85, 1.15)
    
    # Calculate number of palettes and cycles with variation
    min_p, max_p = PALETTES_PER_DAY
    num_palettes = int(random.randint(min_p, max_p) * variation)
    num_palettes = max(min_p, min(max_p, num_palettes))  # Clamp to bounds
    
    min_c, max_c = CYCLES_PER_DAY
    num_cycles = int(random.randint(min_c, max_c) * variation)
    num_cycles = max(min_c, min(max_c, num_cycles))  # Clamp to bounds
    
    # Generate data
    palettes_df = generate_palettes_data(day_date, num_palettes)
    lignes_df = generate_lignes_data(palettes_df)
    autoclaves_df = generate_autoclaves_data(day_date, num_cycles, palettes_df, lignes_df)
    emballage_df = generate_emballage_data(autoclaves_df)
    
    return {
        "palettes": palettes_df,
        "lignes": lignes_df,
        "autoclaves": autoclaves_df,
        "emballage": emballage_df
    }

def save_to_excel(data, day_date):
    """Save day's data to Excel file."""
    filename = EXPORTS_DIR / f"production-day-{day_date.strftime('%Y-%m-%d')}.xlsx"
    
    with pd.ExcelWriter(filename, engine='openpyxl') as writer:
        data["palettes"].to_excel(writer, sheet_name="Palettes", index=False)
        data["lignes"].to_excel(writer, sheet_name="Lignes", index=False)
        data["autoclaves"].to_excel(writer, sheet_name="Autoclaves", index=False)
        data["emballage"].to_excel(writer, sheet_name="Emballage", index=False)
    
    return filename

# ── Main Execution ────────────────────────────────────────────────────────────
def main():
    print("🤖 BK FOOD AI - Fake Data Generator")
    print("=" * 50)
    print(f"Generating {DAYS_TO_GENERATE} days of fake production data...")
    print()
    
    # Generate data for the last 90 days (excluding weekends)
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=DAYS_TO_GENERATE + 20)  # Add buffer for weekends
    
    generated_days = 0
    skipped_weekends = 0
    all_files = []
    
    current_date = start_date
    while current_date <= end_date and generated_days < DAYS_TO_GENERATE:
        if is_weekend(current_date):
            skipped_weekends += 1
            current_date += timedelta(days=1)
            continue
        
        print(f"📅 Generating data for {current_date.strftime('%A %Y-%m-%d')}...", end=" ")
        
        try:
            day_data = generate_day_data(current_date)
            filename = save_to_excel(day_data, current_date)
            all_files.append(filename)
            generated_days += 1
            print(f"✅ {len(day_data['palettes'])} palettes, {len(day_data['autoclaves'])} cycles")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        current_date += timedelta(days=1)
    
    print()
    print("📊 Summary:")
    print(f"   Generated: {generated_days} days of data (skipped {skipped_weekends} weekends)")
    print(f"   Excel files saved to: {EXPORTS_DIR}/")
    print(f"   CSV files will be saved to: {CSV_DIR}/")
    
    # Run the AI pipeline
    print()
    print("🚀 Running AI pipeline...")
    
    # 1. Convert Excel to CSV
    print("   1. Converting Excel files to CSV...", end=" ")
    try:
        from subprocess import run
        result = run([sys.executable, "1_convert_excel_to_csv.py", "--folder", str(EXPORTS_DIR)], 
                    capture_output=True, text=True, cwd=str(Path(__file__).parent))
        if result.returncode == 0:
            print("✅ Done")
        else:
            print(f"❌ Error: {result.stderr}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # 2. Build dataset
    print("   2. Building dataset...", end=" ")
    try:
        result = run([sys.executable, "2_build_dataset.py"], 
                    capture_output=True, text=True, cwd=str(Path(__file__).parent))
        if result.returncode == 0:
            print("✅ Done")
        else:
            print(f"❌ Error: {result.stderr}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # 3. Train models
    print("   3. Training models...", end=" ")
    try:
        result = run([sys.executable, "3_train_model.py"], 
                    capture_output=True, text=True, cwd=str(Path(__file__).parent))
        if result.returncode == 0:
            print("✅ Done")
        else:
            print(f"❌ Error: {result.stderr}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print()
    print("🎯 Ready to use!")
    print("   Go to Admin > IA Production > Générer le plan")
    print("   Models trained: palettes_demain, tonnage_demain, cycles_demain, boites_demain, risque_alertes")
    print()
    print("✨ All set! The AI can now predict tomorrow's production.")

if __name__ == "__main__":
    main()
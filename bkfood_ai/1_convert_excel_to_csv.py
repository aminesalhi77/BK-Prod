import pandas as pd
import os
import argparse
from pathlib import Path

# ── Column name mapping (French Excel headers → clean Python keys) ──────────
COLUMN_MAPS = {
    "Palettes": {
        "Code Palette":       "palette_code",
        "Réf Parage":         "parage_ref",
        "N° Palette":         "numero_palette",
        "Type Longe":         "longe_type",
        "Poids (kg)":         "weight_kg",
        "Zone":               "position_zone",
        "Position":           "position_number",
        "Heure Entrée":       "entry_time",
        "Heure Sortie":       "exit_time",
        "Statut":             "status",
        "Opérateur":          "operator_matricule",
        "Chef Tapis 1":       "chef_tapis_1",
        "Chef Tapis 2":       "chef_tapis_2",
        "Chef Tapis 3":       "chef_tapis_3",
        "Chef Tapis 4":       "chef_tapis_4",
    },
    "Lignes": {
        "Code Palette":           "palette_code",
        "Ligne":                  "ligne_label",
        "Article":                "article",
        "Matricule Cheffe Ligne": "cheffe_ligne_matricule",
        "Heure Entrée Ligne":     "entry_time",
    },
    "Autoclaves": {
        "ID Cycle":               "cycle_id",
        "Autoclave":              "autoclave_id",
        "Matricule Conducteur":   "conducteur_matricule",
        "Matricule Assistant":    "assistant_matricule",
        "Heure Début":            "start_time",
        "Heure Fin":              "end_time",
        "Durée (min)":            "duration_minutes",
        "Chariots":               "chariot_codes",
        "Code STR":               "str_code",
    },
    "Emballage": {
        "Code STR":                   "str_code",
        "Autoclave":                  "autoclave_id",
        "Article":                    "article",
        "Quantité Boîtes":            "total_boxes",
        "Matricule Cheffe Emballage": "cheffe_emballage_matricule",
        "Heure Enregistrement":       "recorded_at",
    },
}


def convert_file(xlsx_path: str, output_dir: str = "csv_data"):
    """Convert one Excel file (4 sheets) into 4 separate CSV files."""
    xlsx_path = Path(xlsx_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Extract date from filename e.g. production-day-2024-01-15.xlsx
    date_tag = xlsx_path.stem.replace("production-", "").replace("-", "_")

    print(f"\nConverting: {xlsx_path.name}")

    sheets_found = []
    try:
        xl = pd.ExcelFile(xlsx_path)
        sheets_found = xl.sheet_names
    except Exception as e:
        print(f"  ❌ Cannot open file: {e}")
        return

    for sheet_name, col_map in COLUMN_MAPS.items():
        if sheet_name not in sheets_found:
            print(f"  ⚠️  Sheet '{sheet_name}' not found — skipping")
            continue

        df = pd.read_excel(xlsx_path, sheet_name=sheet_name)

        # Rename columns using map (ignore columns not in map)
        rename = {k: v for k, v in col_map.items() if k in df.columns}
        df = df.rename(columns=rename)

        # Keep only mapped columns
        keep_cols = list(col_map.values())
        df = df[[c for c in keep_cols if c in df.columns]]

        # Parse datetime columns
        for col in ["entry_time", "exit_time", "start_time", "end_time", "recorded_at"]:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors="coerce")

        # Add source file metadata
        df["source_file"] = xlsx_path.name

        out_name = f"{sheet_name.lower()}_{date_tag}.csv"
        out_path = output_dir / out_name
        df.to_csv(out_path, index=False, encoding="utf-8-sig")
        print(f"  OK {sheet_name:12s} -> {out_path}  ({len(df)} rows)")


def convert_multiple_files(file_paths: list, output_dir: str = "csv_data"):
    """Convert multiple Excel files to CSV format."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"\nConverting {len(file_paths)} Excel file(s)...")
    
    for file_path in file_paths:
        convert_file(file_path, str(output_dir))
    
    print(f"\n✅ All files converted successfully to {output_dir}")


def convert_folder(folder: str):
    """Convert all .xlsx files in a folder."""
    folder = Path(folder)
    files = list(folder.glob("*.xlsx"))
    if not files:
        print(f"No .xlsx files found in {folder}")
        return
    print(f"Found {len(files)} Excel file(s) to convert")
    for f in files:
        convert_file(str(f))


def convert_directory(directory_path: str, output_dir: str = "csv_data"):
    """Convert all Excel files in a directory."""
    directory = Path(directory_path)
    if not directory.exists():
        print(f"Directory not found: {directory_path}")
        return
    
    files = list(directory.glob("*.xlsx"))
    if not files:
        print(f"No .xlsx files found in directory: {directory_path}")
        return
    
    print(f"Converting {len(files)} Excel file(s) from directory: {directory_path}")
    for file_path in files:
        convert_file(str(file_path), output_dir)
    
    print(f"\n✅ All files from directory converted successfully to {output_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert BK FOOD Excel exports to CSV")
    parser.add_argument("--input",  help="Single .xlsx file to convert")
    parser.add_argument("--folder", help="Folder containing multiple .xlsx files")
    parser.add_argument("--directory", help="Directory containing multiple .xlsx files")
    parser.add_argument("--files", nargs="+", help="Multiple .xlsx files to convert")
    args = parser.parse_args()

    if args.input:
        convert_file(args.input)
    elif args.files:
        convert_multiple_files(args.files)
    elif args.directory:
        convert_directory(args.directory)
    elif args.folder:
        convert_folder(args.folder)
    else:
        # Demo mode — create sample data if no file given
        print("No input provided. Run with:")
        print("  --input file.xlsx           (single file)")
        print("  --files file1.xlsx file2.xlsx  (multiple files)")
        print("  --directory path/to/folder  (directory with files)")
        print("  --folder path/to/folder     (folder with files)")
        print("Example: python 1_convert_excel_to_csv.py --input production-day-2024-01-15.xlsx")

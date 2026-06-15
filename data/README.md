# Data

The dashboard now uses the complete curated dataset in `data/curated/`.

The generated interface payload is:

```text
data/dashboard-data.json
```

Regenerate it with:

```bash
python scripts/build_dashboard_data.py
```

Validate it with:

```bash
python scripts/validate_dashboard_data.py
```

Some legacy CSV files may remain in this folder for backward compatibility with older dashboard versions. New analysis should use `data/curated/*_curated.csv`.

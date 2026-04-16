# ClickHouse SQL Query Tool

Modern web-based SQL query tool for ClickHouse with responsive UI and data export capabilities.

## ✨ Features

- **Web UI**: Modern Bootstrap 5 design with orange theme
- **SQL Editor**: CodeMirror-powered with syntax highlighting
- **Data Export**: Download results as CSV or Excel
- **Responsive**: Works on desktop, tablet, and mobile
- **TOML Config**: Dynamic database configuration
- **Real-time**: Instant query execution with loading indicators

## 🚀 Quick Start

### Setup Configuration

Copy the example config file:

```bash
cp config.toml.example config.toml
```

Edit `config.toml` with your database credentials:

```toml
[database]
host = ""
port = 
username = "default"
password = "your-password"
database = ""
```

## 🌐 Web Interface

### Start Web Server

```bash
uv run uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Or:

```bash
python app.py
```

Access at: **http://localhost:8000**

### Web Features

- **SQL Editor**: Syntax highlighting, line numbers, auto-close brackets
- **Keyboard Shortcuts**: `Ctrl+Enter` or `Cmd+Enter` to run query
- **Loading Indicator**: Shows during query execution
- **Results Table**: Scrollable, sticky header, hover effects
- **Export Options**: Download as CSV or Excel
- **Responsive Design**: Optimized for all screen sizes

## 📁 Project Structure

```
clickhouse-starter/
├── config.toml              # Database config (git ignored)
├── config.toml.example      # Config template
├── app.py                   # Web server (FastAPI)
├── templates/
│   └── index.html           # Web interface (Bootstrap 5)
├── modules/
│   ├── __init__.py
│   ├── config.py            # TOML config reader
│   ├── database.py          # ClickHouse connection
│   ├── query.py             # Query executor
│   └── formatter.py         # Data formatter (passthrough)
├── pyproject.toml           # Project dependencies
└── .gitignore              # Git ignore rules
```

## 🔌 Architecture

```
Browser → app.py (FastAPI) → modules → ClickHouse
```

## ⚙️ Configuration

### Database Settings

| Parameter  | Description     | Example         |
|------------|-----------------|-----------------|
| host       | Server address  | 192.168.1.10    |
| port       | ClickHouse port | 12345           |
| username   | Database user   | default         |
| password   | User password   | your-password   |
| database   | Database name   | db_example      |

## 📦 Installation

```bash
uv sync
```

Or with pip:

```bash
pip install -r requirements.txt
```

## 🔒 Security

- `config.toml` is gitignored (contains credentials)
- Use `config.toml.example` as template
- Never commit sensitive data

## ✨ Code Quality

### Best Practices
- ✅ Modular architecture with separation of concerns
- ✅ Single responsibility per module
- ✅ Type hints and comprehensive docstrings
- ✅ Proper error handling

### Clean Code
- ❌ No duplicate code
- ❌ No unused imports
- ❌ No hardcoded values (all in config.toml)
- ❌ No unnecessary files

### Git Ignore Rules
- `__pycache__/` - Python cache
- `config.toml` - Sensitive credentials
- `output/*.csv` - Generated files
- IDE & OS files

## 📝 License

Internal use only.
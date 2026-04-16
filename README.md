# ClickHouse SQL Query Tool

Modern web-based SQL query tool for ClickHouse with responsive UI and data export capabilities.

## ✨ Features

- **Web UI**: Modern Bootstrap 5 design with orange theme
- **SQL Editor**: CodeMirror-powered with syntax highlighting
- **Saved Queries**: Save, load, and manage your favorite queries
- **Execution Timer**: Real-time query execution time tracking
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

#### SQL Editor Tab
- **SQL Editor**: Syntax highlighting, line numbers, auto-close brackets
- **Keyboard Shortcuts**: `Ctrl+Enter` or `Cmd+Enter` to run query
- **Execution Timer**: Real-time timer showing query duration
- **Loading Indicator**: Shows during query execution with live timer
- **Results Table**: Scrollable, sticky header, hover effects
- **Export Options**: Download as CSV or Excel
- **Save Queries**: Bookmark queries for later use

#### Saved Queries Tab
- **Query Library**: View all saved queries in card layout
- **Load Queries**: Load saved queries into editor for editing
- **Delete Queries**: Remove queries you no longer need
- **Metadata Tracking**: Created time and last used timestamps
- **Quick Refresh**: Reload query list with one click

## 📁 Project Structure

```
clickhouse-starter/
├── config.toml              # Database & saved queries config (git ignored)
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

### Saved Queries

Queries are automatically saved to `config.toml` under the `[queries]` section:

```toml
[queries.describe_students]
name = "Describe Students"
sql = "DESCRIBE TABLE db_example.students"
created_at = "2026-04-16T13:00:00"
last_used = "2026-04-16T13:30:00"
```

- **Name**: Display name for the query
- **SQL**: The SQL query statement
- **created_at**: Timestamp when query was saved
- **last_used**: Timestamp when query was last loaded

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

## 📖 Usage Guide

### Running Queries
1. Write or paste SQL query in the editor
2. Click **Run Query** button or press `Ctrl+Enter`
3. Watch the real-time timer during execution
4. View results in the table below
5. Download as CSV or Excel if needed

### Saving Queries
1. Write a query you want to save
2. Click **Save Query** button (green)
3. Enter a memorable name for the query
4. Click **Save** to store in config.toml

### Loading Saved Queries
1. Switch to **Saved Queries** tab
2. Browse your saved queries
3. Click **Load** to load query into editor
4. Edit if needed, then click **Run Query**

### Managing Queries
- **Refresh**: Click refresh button to reload query list
- **Delete**: Click trash icon to remove a query (with confirmation)

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
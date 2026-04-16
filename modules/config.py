"""
Configuration module - Reads from config.toml
"""

import tomllib
from pathlib import Path

# Path to config.toml
CONFIG_FILE = Path(__file__).parent.parent / "config.toml"


def load_config():
    """
    Load configuration from config.toml
    
    Returns:
        dict: Configuration dictionary
    """
    with open(CONFIG_FILE, "rb") as f:
        return tomllib.load(f)


# Load configuration once at module import
_config = load_config()

# Debug: Print loaded config
print(f"[Config] Loaded from: {CONFIG_FILE}")
print(f"[Config] Database: {_config['database']}")

# Database settings
CLICKHOUSE_HOST = _config["database"]["host"]
CLICKHOUSE_PORT = _config["database"]["port"]
CLICKHOUSE_USERNAME = _config["database"]["username"]
CLICKHOUSE_PASSWORD = _config["database"]["password"]
DEFAULT_DATABASE = _config["database"]["database"]

print(f"[Config] Host: {CLICKHOUSE_HOST}, Port: {CLICKHOUSE_PORT}")

"""
Database client module for ClickHouse connections
"""

import clickhouse_connect
from modules.config import (
    CLICKHOUSE_HOST,
    CLICKHOUSE_PORT,
    CLICKHOUSE_USERNAME,
    CLICKHOUSE_PASSWORD
)


def get_client():
    """
    Create and return a ClickHouse client connection
    
    Returns:
        clickhouse_connect.client.Client: Configured ClickHouse client
    """
    # Debug: Print config values
    print(f"Connecting to ClickHouse at {CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}")
    
    try:
        client = clickhouse_connect.get_client(
            host=CLICKHOUSE_HOST,
            port=CLICKHOUSE_PORT,
            username=CLICKHOUSE_USERNAME,
            password=CLICKHOUSE_PASSWORD
        )
        print("✓ Successfully connected to ClickHouse")
        return client
    except Exception as e:
        print(f"✗ Failed to connect to ClickHouse: {e}")
        raise

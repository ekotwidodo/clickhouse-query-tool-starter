"""
Query execution module for ClickHouse queries
"""

from modules.database import get_client


def execute_query(sql_query):
    """
    Execute any SQL query and return DataFrame
    
    Args:
        sql_query (str): Complete SQL query string
        
    Returns:
        pandas.DataFrame: Query results
    """
    client = get_client()
    return client.query_df(sql_query)

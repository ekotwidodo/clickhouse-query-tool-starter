"""
FastAPI Web Interface for ClickHouse SQL Query Tool
Usage: uvicorn app:app --reload --host 0.0.0.0 --port 8000
   or: python app.py
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pandas as pd
from pathlib import Path
import tomlkit
import re
import io
from datetime import datetime

from modules.query import execute_query
from modules.formatter import format_dataframe
from modules.config import DEFAULT_DATABASE

app = FastAPI(title="ClickHouse SQL Query Tool")

# Mount static files directory
STATIC_DIR = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


class QueryRequest(BaseModel):
    sql_query: str


class SaveQueryRequest(BaseModel):
    name: str
    sql: str


@app.get("/", response_class=HTMLResponse)
async def index():
    """Serve the main HTML page"""
    with open("templates/index.html", "r", encoding="utf-8") as f:
        html_content = f.read()
        # Replace {{ database }} with actual database name
        html_content = html_content.replace("{{ database }}", DEFAULT_DATABASE)
        return html_content


@app.post("/api/query")
async def run_query(request: QueryRequest):
    """
    Execute SQL query and return results
    
    Args:
        request: QueryRequest with sql_query field
        
    Returns:
        Dict with columns, data, and row_count
    """
    try:
        # Execute query
        df = execute_query(request.sql_query)
        
        # Format dataframe
        df = format_dataframe(df)
        
        # Replace NaN with None for JSON serialization
        df = df.where(pd.notnull(df), None)
        
        # Convert to dict format
        columns = list(df.columns)
        data = df.to_dict(orient="records")
        row_count = len(df)
        
        return {
            "success": True,
            "columns": columns,
            "data": data,
            "row_count": row_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)


# Helper functions for saved queries
def get_config_path():
    """Get path to config.toml"""
    return Path(__file__).parent / "config.toml"


def slugify(name):
    """Convert name to URL-safe key"""
    # Convert to lowercase, replace non-alphanumeric with underscores
    key = name.lower().strip()
    key = re.sub(r'[^a-z0-9]+', '_', key)
    key = key.strip('_')
    return key


def get_unique_key(base_key):
    """Generate unique key by appending number if key exists"""
    config_path = get_config_path()
    if not config_path.exists():
        return base_key
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = tomlkit.load(f)
    
    queries = config.get('queries', {})
    if base_key not in queries:
        return base_key
    
    # Try appending numbers
    counter = 2
    while f"{base_key}_{counter}" in queries:
        counter += 1
    return f"{base_key}_{counter}"


@app.get("/api/queries")
async def get_saved_queries():
    """Get all saved queries"""
    config_path = get_config_path()
    
    if not config_path.exists():
        return {"queries": []}
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = tomlkit.load(f)
    
    queries_section = config.get('queries', {})
    queries_list = []
    
    for key, query_data in queries_section.items():
        queries_list.append({
            "key": key,
            "name": query_data.get('name', ''),
            "sql": query_data.get('sql', ''),
            "created_at": query_data.get('created_at', ''),
            "last_used": query_data.get('last_used', '')
        })
    
    return {"queries": queries_list}


@app.post("/api/queries")
async def save_query(request: SaveQueryRequest):
    """Save a new query"""
    if not request.sql.strip():
        raise HTTPException(status_code=400, detail="SQL query cannot be empty")
    
    if not request.name.strip():
        raise HTTPException(status_code=400, detail="Query name cannot be empty")
    
    config_path = get_config_path()
    
    # Load or create config
    if config_path.exists():
        with open(config_path, 'r', encoding='utf-8') as f:
            config = tomlkit.load(f)
    else:
        config = tomlkit.document()
    
    # Generate unique key
    base_key = slugify(request.name)
    unique_key = get_unique_key(base_key)
    
    # Create query entry
    now = datetime.now().isoformat()
    query_entry = tomlkit.table()
    query_entry['name'] = request.name.strip()
    query_entry['sql'] = request.sql.strip()
    query_entry['created_at'] = now
    query_entry['last_used'] = now
    
    # Add to queries section
    if 'queries' not in config:
        config['queries'] = tomlkit.table()
    
    config['queries'][unique_key] = query_entry
    
    # Save config
    with open(config_path, 'w', encoding='utf-8') as f:
        tomlkit.dump(config, f)
    
    return {
        "success": True,
        "key": unique_key,
        "name": request.name.strip(),
        "sql": request.sql.strip(),
        "created_at": now,
        "last_used": now
    }


@app.delete("/api/queries/{query_key}")
async def delete_query(query_key: str):
    """Delete a saved query"""
    config_path = get_config_path()
    
    if not config_path.exists():
        raise HTTPException(status_code=404, detail="Config file not found")
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = tomlkit.load(f)
    
    queries = config.get('queries', {})
    if query_key not in queries:
        raise HTTPException(status_code=404, detail="Query not found")
    
    del config['queries'][query_key]
    
    # Save config
    with open(config_path, 'w', encoding='utf-8') as f:
        tomlkit.dump(config, f)
    
    return {"success": True, "message": "Query deleted successfully"}


@app.patch("/api/queries/{query_key}/use")
async def update_query_usage(query_key: str):
    """Update last_used timestamp for a query"""
    config_path = get_config_path()
    
    if not config_path.exists():
        raise HTTPException(status_code=404, detail="Config file not found")
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = tomlkit.load(f)
    
    queries = config.get('queries', {})
    if query_key not in queries:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Update last_used
    now = datetime.now().isoformat()
    config['queries'][query_key]['last_used'] = now
    
    # Save config
    with open(config_path, 'w', encoding='utf-8') as f:
        tomlkit.dump(config, f)
    
    return {"success": True, "last_used": now}


@app.put("/api/queries/{query_key}")
async def update_query(query_key: str, request: SaveQueryRequest):
    """Update an existing query"""
    if not request.sql.strip():
        raise HTTPException(status_code=400, detail="SQL query cannot be empty")
    
    if not request.name.strip():
        raise HTTPException(status_code=400, detail="Query name cannot be empty")
    
    config_path = get_config_path()
    
    if not config_path.exists():
        raise HTTPException(status_code=404, detail="Config file not found")
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = tomlkit.load(f)
    
    queries = config.get('queries', {})
    if query_key not in queries:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Update query entry
    now = datetime.now().isoformat()
    config['queries'][query_key]['name'] = request.name.strip()
    config['queries'][query_key]['sql'] = request.sql.strip()
    config['queries'][query_key]['last_used'] = now
    
    # Save config
    with open(config_path, 'w', encoding='utf-8') as f:
        tomlkit.dump(config, f)
    
    return {
        "success": True,
        "key": query_key,
        "name": request.name.strip(),
        "sql": request.sql.strip(),
        "last_used": now
    }


@app.post("/api/download/parquet")
async def download_parquet(request: QueryRequest):
    """Execute query and return results as Parquet file"""
    try:
        # Execute query
        df = execute_query(request.sql_query)
        
        # Format dataframe
        df = format_dataframe(df)
        
        # Replace NaN with None
        df = df.where(pd.notnull(df), None)
        
        # Convert to Parquet
        parquet_buffer = io.BytesIO()
        df.to_parquet(parquet_buffer, engine='pyarrow', index=False)
        parquet_buffer.seek(0)
        
        # Return as file download
        return StreamingResponse(
            parquet_buffer,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": "attachment; filename=query_result.parquet"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/database/tables")
async def get_database_tables():
    """Get all tables from the database with their columns and types"""
    try:
        # Get all tables from the default database
        tables_query = f"SHOW TABLES FROM {DEFAULT_DATABASE}"
        tables_df = execute_query(tables_query)
        
        tables_list = []
        
        # For each table, get its columns
        for table_name in tables_df.iloc[:, 0]:
            # DESCRIBE TABLE gives us column name and type
            describe_query = f"DESCRIBE TABLE {DEFAULT_DATABASE}.{table_name}"
            columns_df = execute_query(describe_query)
            
            columns_list = []
            for _, row in columns_df.iterrows():
                columns_list.append({
                    "name": row.get("name", row.get("column", "")),
                    "type": row.get("type", "")
                })
            
            tables_list.append({
                "name": table_name,
                "columns": columns_list
            })
        
        return {
            "success": True,
            "tables": tables_list
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

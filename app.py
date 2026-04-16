"""
FastAPI Web Interface for ClickHouse SQL Query Tool
Usage: uvicorn app:app --reload --host 0.0.0.0 --port 8000
   or: python app.py
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pandas as pd
from pathlib import Path

from modules.query import execute_query
from modules.formatter import format_dataframe

app = FastAPI(title="ClickHouse SQL Query Tool")

# Mount static files directory
STATIC_DIR = Path(__file__).parent
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


class QueryRequest(BaseModel):
    sql_query: str


@app.get("/", response_class=HTMLResponse)
async def index():
    """Serve the main HTML page"""
    with open("templates/index.html", "r", encoding="utf-8") as f:
        return f.read()


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

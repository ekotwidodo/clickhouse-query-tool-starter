let currentResults = null;
let queryTimer = null;
let queryStartTime = null;
let sidebarVisible = false;
let databaseTables = null;
let editor = null;
let saveQueryModal = null;
let viewQueryModal = null;
let currentDatabase = '';
let allQueries = [];
let currentEditingQueryKey = null;
let currentPage = 1;
const queriesPerPage = 10;

// Get database name from data attribute
document.addEventListener('DOMContentLoaded', function() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        currentDatabase = mainContent.getAttribute('data-database') || '';
    }
});

// Sidebar functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    sidebarVisible = !sidebarVisible;
    
    if (sidebarVisible) {
        sidebar.classList.add('active');
        mainContent.classList.add('shifted');
        loadDatabaseTables();
    } else {
        sidebar.classList.remove('active');
        mainContent.classList.remove('shifted');
    }
}

async function loadDatabaseTables() {
    if (databaseTables) {
        renderTree(databaseTables);
        return;
    }
    
    const loadingDiv = document.getElementById('tree-loading');
    const treeContainer = document.getElementById('tree-container');
    
    loadingDiv.style.display = 'block';
    treeContainer.style.display = 'none';
    
    try {
        const response = await fetch('/api/database/tables');
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || 'Failed to load tables');
        }
        
        databaseTables = result.tables;
        renderTree(databaseTables);
        
        loadingDiv.style.display = 'none';
        treeContainer.style.display = 'block';
        
    } catch (error) {
        loadingDiv.innerHTML = `<div class="alert alert-danger">Error loading tables: ${error.message}</div>`;
    }
}

function renderTree(tables) {
    const treeContainer = document.getElementById('tree-container');
    
    if (!tables || tables.length === 0) {
        treeContainer.innerHTML = '<div class="text-center text-light p-3">No tables found</div>';
        return;
    }
    
    const treeHTML = tables.map(table => {
        const columnsHTML = table.columns.map(column => {
            const iconInfo = getColumnIcon(column.type);
            return `
                <div class="tree-column" onclick="insertColumnToEditor('${table.name}', '${column.name}')" title="Click to insert column name to editor">
                    <i class="${iconInfo.icon} column-icon"></i>
                    <span class="column-name">${escapeHtml(column.name)}</span>
                    <span class="column-type">${escapeHtml(column.type)}</span>
                </div>
            `;
        }).join('');
        
        return `
            <div class="tree-item">
                <div class="tree-table" onclick="toggleTable(this, '${table.name}')">
                    <i class="bi bi-chevron-right toggle-icon"></i>
                    <i class="bi bi-table"></i>
                    <span class="table-name">${escapeHtml(table.name)}</span>
                    <span class="badge bg-light text-dark">${table.columns.length}</span>
                </div>
                <div class="tree-columns" id="columns-${escapeHtml(table.name)}">
                    ${columnsHTML}
                </div>
            </div>
        `;
    }).join('');
    
    treeContainer.innerHTML = treeHTML;
}

function toggleTable(element, tableName) {
    const columnsDiv = document.getElementById(`columns-${tableName}`);
    const toggleIcon = element.querySelector('.toggle-icon');
    
    if (columnsDiv.classList.contains('expanded')) {
        columnsDiv.classList.remove('expanded');
        toggleIcon.classList.remove('expanded');
    } else {
        columnsDiv.classList.add('expanded');
        toggleIcon.classList.add('expanded');
        
        // Insert SELECT query into editor with database name
        const query = `SELECT * FROM ${currentDatabase}.${tableName} LIMIT 10`;
        editor.setValue(query);
        editor.focus();
    }
}

function getColumnIcon(type) {
    type = type.toLowerCase();
    
    // Number types
    if (type.includes('int') || type.includes('float') || type.includes('double') || 
        type.includes('decimal') || type.includes('numeric')) {
        return {
            icon: 'bi bi-hash'
        };
    }
    
    // String types
    if (type.includes('varchar') || type.includes('char') || type.includes('string') || 
        type.includes('text')) {
        return {
            icon: 'bi bi-type'
        };
    }
    
    // Date types
    if (type === 'date' || type.includes('date32')) {
        return {
            icon: 'bi bi-calendar3'
        };
    }
    
    // DateTime types
    if (type.includes('datetime') || type.includes('timestamp')) {
        return {
            icon: 'bi bi-clock'
        };
    }
    
    // Boolean types
    if (type.includes('bool')) {
        return {
            icon: 'bi bi-toggle-on'
        };
    }
    
    // UUID
    if (type.includes('uuid')) {
        return {
            icon: 'bi bi-fingerprint'
        };
    }
    
    // Array
    if (type.includes('array')) {
        return {
            icon: 'bi bi-list-ul'
        };
    }
    
    // Map
    if (type.includes('map')) {
        return {
            icon: 'bi bi-diagram-3'
        };
    }
    
    // JSON
    if (type.includes('json')) {
        return {
            icon: 'bi bi-braces'
        };
    }
    
    // Default
    return {
        icon: 'bi bi-question-circle'
    };
}

function insertColumnToEditor(tableName, columnName) {
    const currentValue = editor.getValue().trim();
    const currentValueLower = currentValue.toLowerCase();
    
    // Check if current query is a SELECT query
    if (!currentValueLower.startsWith('select')) {
        // If not a SELECT query, create a new one
        const query = `SELECT ${columnName} FROM ${currentDatabase}.${tableName} LIMIT 10`;
        editor.setValue(query);
        editor.focus();
        return;
    }
    
    // Parse the current query to extract components
    const selectMatch = currentValueLower.match(/^select\s+(.+?)\s+from\s+/i);
    const fromMatch = currentValueLower.match(/from\s+(\S+)/i);
    
    if (!selectMatch || !fromMatch) {
        // If can't parse, create new query
        const query = `SELECT ${columnName} FROM ${currentDatabase}.${tableName} LIMIT 10`;
        editor.setValue(query);
        editor.focus();
        return;
    }
    
    const currentColumns = selectMatch[1].trim();
    const currentFrom = fromMatch[1].trim();
    
    // Extract current table name (remove database prefix if exists)
    const currentTableName = currentFrom.includes('.') ? currentFrom.split('.')[1] : currentFrom;
    
    // Check if the new column is from a different table
    if (tableName !== currentTableName) {
        // Different table - replace the entire query
        const query = `SELECT ${columnName} FROM ${currentDatabase}.${tableName} LIMIT 10`;
        editor.setValue(query);
        editor.focus();
        return;
    }
    
    // Same table - replace columns in SELECT clause
    // Check if column already exists in SELECT (and it's not just *)
    if (currentColumns !== '*') {
        const columnsArray = currentColumns.split(',').map(c => c.trim());
        const columnExists = columnsArray.some(c => c.toLowerCase() === columnName.toLowerCase());
        
        if (columnExists) {
            // Column already selected, don't add it
            editor.focus();
            return;
        }
        
        // Add new column to existing columns (replace *)
        const newColumns = currentColumns + ', ' + columnName;
        
        // Preserve original case for SQL keywords
        const originalFromIndex = currentValueLower.indexOf(' from ');
        const originalRest = currentValue.substring(originalFromIndex);
        const finalQuery = `SELECT ${newColumns}${originalRest}`;
        
        editor.setValue(finalQuery);
        editor.focus();
        return;
    }
    
    // If current is SELECT *, replace * with the column name
    const originalFromIndex = currentValueLower.indexOf(' from ');
    const originalRest = currentValue.substring(originalFromIndex);
    const finalQuery = `SELECT ${columnName}${originalRest}`;
    
    editor.setValue(finalQuery);
    editor.focus();
}

async function executeQuery() {
    const sqlQuery = editor.getValue().trim();
    
    if (!sqlQuery) {
        showAlert('Please enter a SQL query', 'danger');
        return;
    }
    
    showLoading(true);
    hideAlert();
    document.getElementById('results-section').classList.remove('active');
    
    // Start timer
    queryStartTime = Date.now();
    startTimer();
    
    try {
        const response = await fetch('/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql_query: sqlQuery })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || 'Query execution failed');
        }
        
        // Stop timer and get elapsed time
        const elapsedTime = stopTimer();
        
        displayResults(result);
        showAlert(`✓ Query executed successfully! ${result.row_count} rows returned in ${elapsedTime}`, 'success');
        
    } catch (error) {
        stopTimer();
        showAlert(`✗ Error: ${error.message}`, 'danger');
    } finally {
        showLoading(false);
    }
}

function startTimer() {
    const loadingTimer = document.getElementById('loading-timer');
    const executionTimeText = document.getElementById('execution-time-text');
    
    // Update timer every 10ms
    queryTimer = setInterval(() => {
        const elapsed = (Date.now() - queryStartTime) / 1000;
        const timeText = formatTime(elapsed);
        loadingTimer.textContent = timeText;
        executionTimeText.textContent = timeText;
    }, 10);
}

function stopTimer() {
    if (queryTimer) {
        clearInterval(queryTimer);
        queryTimer = null;
    }
    
    const elapsed = (Date.now() - queryStartTime) / 1000;
    const timeText = formatTime(elapsed);
    
    // Show execution time badge
    const executionTimeBadge = document.getElementById('execution-time');
    const executionTimeText = document.getElementById('execution-time-text');
    executionTimeText.textContent = timeText;
    executionTimeBadge.classList.add('active');
    
    return timeText;
}

function formatTime(seconds) {
    if (seconds < 1) {
        return `${(seconds * 1000).toFixed(0)}ms`;
    } else if (seconds < 60) {
        return `${seconds.toFixed(2)}s`;
    } else {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(2);
        return `${mins}m ${secs}s`;
    }
}

function displayResults(result) {
    const { columns, data, row_count } = result;
    currentResults = result;
    
    document.getElementById('row-count').textContent = `(${row_count} rows)`;
    
    const thead = document.getElementById('table-head');
    thead.innerHTML = '<tr>' + columns.map(col => `<th>${escapeHtml(col)}</th>`).join('') + '</tr>';
    
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = data.map(row => 
        '<tr>' + columns.map(col => `<td title="${escapeHtml(String(row[col] ?? ''))}">${escapeHtml(String(row[col] ?? ''))}</td>`).join('') + '</tr>'
    ).join('');
    
    document.getElementById('results-section').classList.add('active');
    document.getElementById('download-csv-btn').style.display = 'inline-block';
    document.getElementById('download-excel-btn').style.display = 'inline-block';
    document.getElementById('download-parquet-btn').style.display = 'inline-block';
}

function clearEditor() {
    editor.setValue('');
    editor.focus();
    hideAlert();
    document.getElementById('results-section').classList.remove('active');
    document.getElementById('download-csv-btn').style.display = 'none';
    document.getElementById('download-excel-btn').style.display = 'none';
    document.getElementById('download-parquet-btn').style.display = 'none';
    document.getElementById('execution-time').classList.remove('active');
    currentResults = null;
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    const runBtn = document.getElementById('run-btn');
    const clearBtn = document.getElementById('clear-btn');
    
    if (show) {
        overlay.classList.add('active');
        runBtn.disabled = true;
        clearBtn.disabled = true;
        editor.setOption('readOnly', true);
    } else {
        overlay.classList.remove('active');
        runBtn.disabled = false;
        clearBtn.disabled = false;
        editor.setOption('readOnly', false);
    }
}

function showAlert(message, type) {
    const alert = document.getElementById('alert');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(hideAlert, 5000);
    }
}

function hideAlert() {
    document.getElementById('alert').style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function downloadCSV() {
    if (!currentResults) {
        showAlert('No data to download', 'danger');
        return;
    }
    
    const { columns, data } = currentResults;
    let csv = columns.join(',') + '\n';
    data.forEach(row => {
        const values = columns.map(col => {
            const value = String(row[col] ?? '');
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csv += values.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `query_result_${new Date().getTime()}.csv`;
    link.click();
}

function downloadExcel() {
    if (!currentResults) {
        showAlert('No data to download', 'danger');
        return;
    }
    
    const { columns, data } = currentResults;
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xml += '<Worksheet ss:Name="Query Results">\n';
    xml += '<Table>\n';
    
    xml += '<Row>\n';
    columns.forEach(col => {
        xml += `<Cell><Data ss:Type="String">${escapeXml(col)}</Data></Cell>\n`;
    });
    xml += '</Row>\n';
    
    data.forEach(row => {
        xml += '<Row>\n';
        columns.forEach(col => {
            const value = row[col] ?? '';
            const type = typeof value === 'number' ? 'Number' : 'String';
            xml += `<Cell><Data ss:Type="${type}">${escapeXml(String(value))}</Data></Cell>\n`;
        });
        xml += '</Row>\n';
    });
    
    xml += '</Table>\n</Worksheet>\n</Workbook>';
    
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `query_result_${new Date().getTime()}.xls`;
    link.click();
}

function escapeXml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function downloadParquet() {
    const sqlQuery = editor.getValue().trim();
    
    if (!sqlQuery) {
        showAlert('No query to download', 'danger');
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/download/parquet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql_query: sqlQuery })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to generate Parquet file');
        }
        
        // Download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `query_result_${new Date().getTime()}.parquet`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        showAlert('✓ Parquet file downloaded successfully', 'success');
        
    } catch (error) {
        showAlert(`✗ Error: ${error.message}`, 'danger');
    } finally {
        showLoading(false);
    }
}

// Saved Queries Functions
function switchTab(tabName) {
    // Update tab links
    document.querySelectorAll('#mainTabs .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.closest('.nav-link').classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Load saved queries when switching to saved tab
    if (tabName === 'saved') {
        currentPage = 1; // Reset to first page
        loadSavedQueries();
    }
    
    // Reset save button when switching to editor tab
    if (tabName === 'editor') {
        resetSaveButton();
        currentEditingQueryKey = null;
    }
}

function showSaveQueryModal() {
    const sql = editor.getValue().trim();
    if (!sql) {
        showAlert('Please enter a SQL query to save', 'danger');
        return;
    }
    
    // Set preview
    document.getElementById('query-preview').textContent = sql;
    document.getElementById('query-name-input').value = '';
    
    // Reset modal title and button to default
    document.querySelector('#saveQueryModal .modal-title').innerHTML = '<i class="bi bi-bookmark-plus"></i> Save Query';
    document.querySelector('#saveQueryModal .btn-primary').textContent = 'Save Query';
    document.querySelector('#saveQueryModal .btn-primary').onclick = function() {
        saveQuery();
    };
    
    // Show modal
    saveQueryModal = new bootstrap.Modal(document.getElementById('saveQueryModal'));
    saveQueryModal.show();
    
    // Focus on input
    setTimeout(() => {
        document.getElementById('query-name-input').focus();
    }, 500);
    
    // Reset when modal is hidden
    document.getElementById('saveQueryModal').addEventListener('hidden.bs.modal', function () {
        resetSaveButton();
    }, { once: true });
}

async function saveQuery() {
    const name = document.getElementById('query-name-input').value.trim();
    const sql = editor.getValue().trim();
    
    if (!name) {
        alert('Please enter a query name');
        return;
    }
    
    try {
        const response = await fetch('/api/queries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, sql })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || 'Failed to save query');
        }
        
        showAlert(`✓ Query saved successfully as "${result.name}"`, 'success');
        
        // Close modal
        saveQueryModal.hide();
        
        // Reset save button
        resetSaveButton();
        
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

function showUpdateQueryModal(key) {
    const sql = editor.getValue().trim();
    if (!sql) {
        showAlert('Please enter a SQL query to update', 'danger');
        return;
    }
    
    const query = allQueries.find(q => q.key === key);
    if (!query) return;
    
    // Set preview
    document.getElementById('query-name-input').value = query.name;
    document.getElementById('query-preview').textContent = sql;
    
    // Show modal
    saveQueryModal = new bootstrap.Modal(document.getElementById('saveQueryModal'));
    saveQueryModal.show();
    
    // Change modal title and save button
    document.querySelector('#saveQueryModal .modal-title').innerHTML = '<i class="bi bi-pencil"></i> Update Query';
    document.querySelector('#saveQueryModal .btn-primary').textContent = 'Update Query';
    document.querySelector('#saveQueryModal .btn-primary').onclick = function() {
        updateQuery(key);
    };
    
    // Focus on input
    setTimeout(() => {
        document.getElementById('query-name-input').focus();
    }, 500);
}

async function updateQuery(key) {
    const name = document.getElementById('query-name-input').value.trim();
    const sql = editor.getValue().trim();
    
    if (!name) {
        alert('Please enter a query name');
        return;
    }
    
    try {
        const response = await fetch(`/api/queries/${key}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, sql })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || 'Failed to update query');
        }
        
        showAlert(`✓ Query updated successfully as "${result.name}"`, 'success');
        
        // Close modal
        saveQueryModal.hide();
        
        // Reset save button
        resetSaveButton();
        currentEditingQueryKey = null;
        
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

function resetSaveButton() {
    document.getElementById('save-query-btn').innerHTML = '<i class="bi bi-bookmark-plus"></i> Save Query';
    document.getElementById('save-query-btn').onclick = function() {
        showSaveQueryModal();
    };
}

async function loadSavedQueries() {
    const container = document.getElementById('saved-queries-list');
    container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-primary"></div><p class="mt-2">Loading saved queries...</p></div>';
    
    try {
        const response = await fetch('/api/queries');
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error('Failed to load queries');
        }
        
        displaySavedQueries(result.queries);
        
    } catch (error) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-danger">Error loading queries: ${error.message}</div></div>`;
    }
}

function displaySavedQueries(queries) {
    const container = document.getElementById('saved-queries-list');
    
    if (!queries || queries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-bookmark"></i>
                <h4>No Saved Queries</h4>
                <p>Write a query in the SQL Editor and click "Save Query" to save it here.</p>
            </div>
        `;
        document.getElementById('pagination-container').style.display = 'none';
        return;
    }
    
    allQueries = queries;
    const totalPages = Math.ceil(queries.length / queriesPerPage);
    const startIndex = (currentPage - 1) * queriesPerPage;
    const endIndex = startIndex + queriesPerPage;
    const pageQueries = queries.slice(startIndex, endIndex);
    
    container.innerHTML = pageQueries.map(query => {
        const lastUsed = query.last_used ? formatDate(query.last_used) : 'Never';
        const createdAt = query.created_at ? formatDate(query.created_at) : 'Unknown';
        
        return `
            <div class="card query-card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h5 class="card-title">${escapeHtml(query.name)}</h5>
                            <p class="card-text text-muted small mb-2">
                                <i class="bi bi-clock"></i> Last used: ${lastUsed} &nbsp;|
                                <i class="bi bi-calendar"></i> Created: ${createdAt}
                            </p>
                        </div>
                        <div class="query-actions d-flex gap-2">
                            <button class="btn btn-sm btn-outline-info" onclick="viewQuery('${query.key}')" title="View Query">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary" onclick="loadQuery('${query.key}')" title="Load Query">
                                <i class="bi bi-play-fill"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-warning" onclick="editQuery('${query.key}')" title="Edit Query">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteQuery('${query.key}')" title="Delete Query">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Render pagination
    renderPagination(totalPages);
}

async function loadQuery(key) {
    try {
        // Update last_used
        await fetch(`/api/queries/${key}/use`, { method: 'PATCH' });
        
        // Load query into editor
        const response = await fetch('/api/queries');
        const result = await response.json();
        const query = result.queries.find(q => q.key === key);
        
        if (query) {
            editor.setValue(query.sql);
            
            // Switch to editor tab
            document.querySelectorAll('#mainTabs .nav-link').forEach(link => {
                link.classList.remove('active');
            });
            document.querySelectorAll('#mainTabs .nav-link')[0].classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById('editor-tab').classList.add('active');
            
            // Focus on editor
            editor.focus();
            
            showAlert(`✓ Query "${query.name}" loaded into editor`, 'success');
        }
        
    } catch (error) {
        showAlert(`Error loading query: ${error.message}`, 'danger');
    }
}

async function deleteQuery(key) {
    if (!confirm('Are you sure you want to delete this query?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/queries/${key}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || 'Failed to delete query');
        }
        
        showAlert('✓ Query deleted successfully', 'success');
        
        // Reload saved queries
        loadSavedQueries();
        
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function renderPagination(totalPages) {
    const paginationContainer = document.getElementById('pagination-container');
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'block';
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
            </li>
        `;
    }
    
    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;
    
    pagination.innerHTML = paginationHTML;
}

function changePage(page) {
    const totalPages = Math.ceil(allQueries.length / queriesPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displaySavedQueries(allQueries);
}

function viewQuery(key) {
    const query = allQueries.find(q => q.key === key);
    if (!query) return;
    
    document.getElementById('view-query-name').textContent = query.name;
    document.getElementById('view-query-sql').textContent = query.sql;
    document.getElementById('view-query-created').textContent = query.created_at ? formatDate(query.created_at) : 'Unknown';
    document.getElementById('view-query-last-used').textContent = query.last_used ? formatDate(query.last_used) : 'Never';
    
    viewQueryModal = new bootstrap.Modal(document.getElementById('viewQueryModal'));
    viewQueryModal.show();
}

function editQuery(key) {
    const query = allQueries.find(q => q.key === key);
    if (!query) return;
    
    currentEditingQueryKey = key;
    
    // Load query into editor
    editor.setValue(query.sql);
    
    // Switch to editor tab
    document.querySelectorAll('#mainTabs .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelectorAll('#mainTabs .nav-link')[0].classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById('editor-tab').classList.add('active');
    
    // Update save button to show "Update" instead
    document.getElementById('save-query-btn').innerHTML = '<i class="bi bi-pencil"></i> Update Query';
    document.getElementById('save-query-btn').onclick = function() {
        showUpdateQueryModal(key);
    };
    
    // Focus on editor
    editor.focus();
    
    showAlert(`✓ Query "${query.name}" loaded for editing. Make changes and click "Update Query" to save.`, 'success');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize CodeMirror editor
    editor = CodeMirror.fromTextArea(document.getElementById('sql-editor'), {
        mode: 'text/x-sql',
        theme: 'material-darker',
        lineNumbers: true,
        autoCloseBrackets: true,
        lineWrapping: true,
        indentWithTabs: true,
        tabSize: 2
    });
    
    editor.setValue(`DESCRIBE TABLE db_example.students`);
    
    // Allow Enter key in modal input
    document.getElementById('query-name-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            saveQuery();
        }
    });
});

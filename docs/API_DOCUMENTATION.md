# Maturion Data Sources API Documentation

## Overview
The Maturion Data Sources API provides secure, live querying capabilities across multiple database and API types with production-ready credential encryption.

## Security Features
- **AES-256-GCM Encryption**: All credentials are encrypted using industry-standard encryption
- **PBKDF2 Key Derivation**: 100,000 iterations with random salt for key security
- **Read-Only Access**: All connections enforce read-only permissions
- **Organization-Scoped**: All data access is restricted by organization membership

## Authentication
All API endpoints require:
- Valid Supabase JWT token in `Authorization` header
- Organization membership for the target resources

## Endpoints

### 1. Create Data Source
**POST** `/data_sources`

Creates a new data source connection with encrypted credentials.

**Request Body:**
```json
{
  "name": "Production Database",
  "description": "Main application database",
  "source_type": "supabase|postgresql|mysql|rest_api|google_drive|sharepoint|custom",
  "connection_config": {
    // Type-specific configuration
  },
  "organization_id": "uuid"
}
```

**Supported Source Types:**
- `supabase`: Supabase database connection
- `postgresql`: PostgreSQL database
- `mysql`: MySQL database
- `rest_api`: RESTful API
- `google_drive`: Google Drive API
- `sharepoint`: Microsoft SharePoint
- `custom`: Custom API endpoint

**Response:**
```json
{
  "id": "uuid",
  "name": "Production Database",
  "source_type": "supabase",
  "is_active": true,
  "created_at": "2025-01-21T10:00:00Z",
  "connection_status": "pending"
}
```

### 2. Test Connection
**POST** `/supabase/functions/v1/connect-data-source`

Tests connectivity to a data source.

**Request Body:**
```json
{
  "data_source_id": "uuid",
  "organization_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "connection_status": "connected",
  "response_time_ms": 150,
  "metadata": {
    "server_version": "PostgreSQL 14.2",
    "features_available": ["SELECT", "EXPLAIN"]
  }
}
```

### 3. Query Data Source
**POST** `/supabase/functions/v1/query-data-source`

Executes live queries against connected data sources.

**Request Body:**
```json
{
  "data_source_id": "uuid",
  "organization_id": "uuid",
  "query_type": "list|search|get|sql",
  "query": "SELECT * FROM users LIMIT 10",
  "parameters": {
    "table": "users",
    "filters": {"status": "active"}
  },
  "limit": 100
}
```

**Query Types:**
- `list`: List records from a table/collection
- `search`: Search with filters or text queries
- `get`: Retrieve specific record by ID
- `sql`: Execute raw SQL (SELECT only)

**Response:**
```json
{
  "success": true,
  "data": [
    {"id": 1, "name": "John Doe", "status": "active"},
    {"id": 2, "name": "Jane Smith", "status": "active"}
  ],
  "metadata": {
    "total_records": 2,
    "execution_time_ms": 45,
    "query_type": "sql",
    "data_source_name": "Production Database"
  }
}
```

### 4. List Data Sources
**GET** `/data_sources?organization_id=uuid`

Returns all data sources for an organization.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Production Database",
      "source_type": "supabase",
      "description": "Main application database",
      "is_active": true,
      "connection_status": "connected",
      "last_tested_at": "2025-01-21T09:30:00Z",
      "created_at": "2025-01-21T08:00:00Z"
    }
  ]
}
```

## Database-Specific Configuration

### Supabase
```json
{
  "connection_config": {
    "supabase_url": "https://xxx.supabase.co",
    "supabase_anon_key": "eyJ...",
    "supabase_service_key": "eyJ..."
  }
}
```

### PostgreSQL
```json
{
  "connection_config": {
    "host": "localhost",
    "port": 5432,
    "database": "mydb",
    "username": "readonly_user",
    "password": "secure_password",
    "ssl": true
  }
}
```

### MySQL
```json
{
  "connection_config": {
    "host": "localhost",
    "port": 3306,
    "database": "mydb",
    "username": "readonly_user",
    "password": "secure_password",
    "ssl": true
  }
}
```

### REST API
```json
{
  "connection_config": {
    "base_url": "https://api.example.com",
    "api_key": "your_api_key",
    "authentication_type": "bearer|basic|api_key",
    "headers": {
      "Custom-Header": "value"
    }
  }
}
```

## Error Handling

**Error Response Format:**
```json
{
  "success": false,
  "error": "Connection failed",
  "error_code": "CONNECTION_ERROR",
  "details": {
    "message": "Unable to connect to database",
    "suggestion": "Check your credentials and network connectivity"
  }
}
```

**Common Error Codes:**
- `CONNECTION_ERROR`: Cannot connect to data source
- `AUTHENTICATION_FAILED`: Invalid credentials
- `PERMISSION_DENIED`: Insufficient permissions
- `QUERY_ERROR`: Invalid query syntax
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `ENCRYPTION_ERROR`: Credential encryption/decryption failed

## Rate Limits
- Connection tests: 10 per minute per organization
- Queries: 100 per minute per organization
- Data source creation: 5 per minute per organization

## Audit Logging
All API calls are logged with:
- User ID and organization ID
- Timestamp and IP address
- Request payload (credentials excluded)
- Response status and execution time
- Error details (if applicable)

## Best Practices

### Security
1. Always use read-only database credentials
2. Rotate credentials regularly
3. Monitor audit logs for suspicious activity
4. Use IP whitelisting when possible

### Performance
1. Add appropriate `LIMIT` clauses to queries
2. Use indexed columns in WHERE clauses
3. Monitor execution times and optimize slow queries
4. Cache frequently accessed data

### Reliability
1. Test connections before deploying
2. Handle connection timeouts gracefully
3. Implement retry logic for transient failures
4. Monitor connection health regularly

## Support
For technical support or feature requests, contact the Maturion development team.
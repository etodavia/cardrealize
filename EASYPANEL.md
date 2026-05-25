# EasyPanel

## App

Use the repository as a Dockerfile app.

Environment variables:

```env
PORT=3000
DB_TYPE=mariadb
DB_HOST=<mariadb-service-host>
DB_PORT=3306
DB_USER=<mariadb-user>
DB_PASSWORD=<mariadb-password>
DB_NAME=<mariadb-database>
UPLOAD_DIR=/app/uploads
```

Expose port:

```text
3000
```

## Persistent Files

Create a persistent volume for:

```text
/app/uploads
```

If you run without MariaDB and use SQLite fallback, also persist:

```text
/app/database.sqlite
```

## Database

The app creates this table automatically on startup when MariaDB variables are configured:

```sql
CREATE TABLE IF NOT EXISTS cards (
  id VARCHAR(50) PRIMARY KEY,
  data LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

# Database Migration Guide

## Schema Change: Email → User ID

The database schema has been updated to use `user_id` instead of `email` for authentication.

## If you're getting 500 errors on login/register:

Your database still has the old schema. You need to delete the old database file.

### Steps to Fix:

1. **Stop the server** (Ctrl+C)

2. **Delete the database file:**
   ```bash
   # Windows (PowerShell)
   Remove-Item server\prescriptions.db
   
   # Windows (Command Prompt)
   del server\prescriptions.db
   
   # Mac/Linux
   rm server/prescriptions.db
   ```

3. **Restart the server:**
   ```bash
   npm run dev
   ```

The database will be automatically recreated with the new schema and default users will be created.

### Default Accounts (after migration):

- Patient: PAT001 / password123
- Doctor: DOC001 / password123
- Vendor: VEND001 / password123

**Note:** If you had any data in the old database, it will be lost. This migration is designed for development environments only.


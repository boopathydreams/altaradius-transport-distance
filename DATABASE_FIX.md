# Database Sequence Fix

If you encounter the error `Unique constraint failed on the fields: (id)` when adding new sources or destinations in production, this means the PostgreSQL sequences are out of sync with the actual data.

## The Problem

When data is imported using explicit IDs (like in the seed script), PostgreSQL sequences don't automatically update to reflect the highest ID value. This causes new records to try using IDs that already exist.

## The Solution

Run the sequence fix script to synchronize all table sequences with their maximum ID values:

### On Vercel (Production)

**Method 1: Environment Variable (Recommended)**
1. In your Vercel project dashboard, go to Settings → Environment Variables
2. Add: `RUN_SEQUENCE_FIX` = `true`
3. Deploy - the sequence fix will run automatically after the build

**Method 2: Direct Build Command**
1. In Vercel project settings, set Build Command to:
   ```bash
   npm run build:vercel
   ```
2. This will build and then run the sequence fix

**Method 3: One-time Fix via CLI**
```bash
# Using Vercel CLI
vercel env add RUN_SEQUENCE_FIX
# Enter 'true' when prompted
vercel --prod
```

## What the Script Does

The `fix-sequences.ts` script:

1. Finds the maximum ID in each table (Source, Destination, Distance, User)
2. Updates the PostgreSQL sequence to start from the next available ID
3. Logs the changes for verification

## After Running the Fix

Once the sequences are fixed, you should be able to add new sources and destinations without encountering the unique constraint error.

## Prevention

To avoid this issue in the future:
- Use `INSERT` without specifying IDs when possible
- If importing data with explicit IDs, always run the sequence fix afterward
- Consider using UUIDs instead of auto-incrementing integers for better distributed system compatibility

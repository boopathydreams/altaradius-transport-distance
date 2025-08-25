# Database Sequence Fix

If you encounter the error `Unique constraint failed on the fields: (id)` when adding new sources or destinations in production, this means the PostgreSQL sequences are out of sync with the actual data.

## The Problem

When data is imported using explicit IDs (like in the seed script), PostgreSQL sequences don't automatically update to reflect the highest ID value. This causes new records to try using IDs that already exist.

## The Solution

Run the sequence fix script to synchronize all table sequences with their maximum ID values:

### On Vercel (Production)

1. Add the following environment variable to your Vercel project:
   - `RUN_SEQUENCE_FIX=true`

2. Deploy and it will automatically run the fix on the next deployment.

### Manually via Script

```bash
# In your project directory
npm run fix-sequences
```

### Via Vercel CLI

```bash
# If you have Vercel CLI installed
vercel exec -- npm run fix-sequences
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

# Deployment Configuration

## Local Development
- Uses regular PostgreSQL database
- DATABASE_URL format: `postgresql://username:password@localhost:5432/database_name`
- Uses standard Prisma Client from `@prisma/client`

## Production Deployment (Vercel)

### Database Setup
1. **Set Environment Variable in Vercel Dashboard:**
   ```
   DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_API_KEY
   ```

### Database Client Configuration
For production deployment, you need to update the import in `src/lib/db.ts` to use the edge client:

```typescript
// Replace this line for production deployment:
import { PrismaClient } from '@prisma/client'

// With this line for Vercel/Accelerate:
export { prisma } from './db.edge'
```

### Alternative: Automated Production Build
The project includes `npm run build:prod` which generates Prisma client with `--no-engine` flag for serverless deployment.

### Vercel Configuration
- `vercel.json` is configured to use `npm run build:prod` for production builds
- Uses Prisma Accelerate-compatible client generation

### Steps for Production Deployment:
1. Set `DATABASE_URL` environment variable in Vercel to your Prisma Accelerate URL
2. Optionally, update `src/lib/db.ts` to import from `./db.edge` for production
3. Deploy to Vercel - the build process will automatically use the correct configuration

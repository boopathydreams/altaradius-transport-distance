# Distance Calculator Web Application

A modern Next.js web application for calculating truck driving distances between sources and destinations using Google Maps API. Built with authentication, SQLite database caching, and comprehensive distance management features.

## Features

- 🔐 **User Authentication**: Secure login system with JWT tokens
- 📍 **Source & Destination Management**: Add, view, and manage sources with coordinates and destinations with pincodes
- 🗺️ **Google Maps Integration**: Calculate real truck driving distances and durations
- 💾 **Smart Caching**: SQLite database caching to avoid duplicate API calls
- ⚡ **Batch Processing**: Efficient batch distance calculations for multiple routes
- 📊 **Multiple Scenarios**:
  - Source → All Destinations
  - Destination ← All Sources
  - Specific Source ↔ Destination
- 🎨 **Modern UI**: Built with Tailwind CSS and responsive design

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite with Prisma
- **Authentication**: JWT tokens, bcryptjs
- **External API**: Google Maps Distance Matrix API
- **Development**: ESLint, TypeScript, Turbopack

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Google Maps API key (optional for development)

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up the database:**
   ```bash
   npm run db:generate
   npm run db:push
   ```

3. **Seed the database with CSV data:**
   ```bash
   npm run db:seed
   ```
   This will create:
   - Admin user (username: `admin`, password: `admin123`)
   - 35 sources from `data/sources.csv`
   - 180+ destinations from `data/destinations.csv`

4. **Configure environment variables:**
   Copy the `.env` file and update with your Google Maps API key:
   ```env
   GOOGLE_MAPS_API_KEY="your-api-key-here"
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── auth/         # Authentication endpoints
│   │   │   ├── sources/      # Source management
│   │   │   ├── destinations/ # Destination management
│   │   │   └── distances/    # Distance calculations
│   │   ├── app/              # Main application page
│   │   └── page.tsx          # Login page
│   ├── lib/
│   │   ├── auth.ts           # Authentication utilities
│   │   ├── db.ts             # Database connection
│   │   └── googleMaps.ts     # Google Maps API integration
│   └── middleware.ts         # Route protection
├── data/
│   ├── sources.csv           # Source locations data
│   └── destinations.csv      # Destination data
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── dev.db                # SQLite database
└── scripts/
    └── seed.ts               # Database seeding script
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Data Management
- `GET /api/sources` - Fetch all sources
- `POST /api/sources` - Create new source
- `GET /api/destinations` - Fetch all destinations
- `POST /api/destinations` - Create new destination
- `GET /api/distances` - Calculate distances (with caching)

## Usage Scenarios

### Scenario 1: Source → All Destinations
Select a source to view distances to all destinations in a table format.

### Scenario 2: Destination ← All Sources
Select a destination to view distances from all sources in a table format.

### Scenario 3: Specific Route
Select both source and destination to get the specific distance and route details.

## Database Schema

- **Users**: Authentication and user management
- **Sources**: Warehouse/pickup locations with coordinates
- **Destinations**: Delivery locations with pincodes and addresses
- **Distances**: Cached distance calculations with route details

## Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Seed database with CSV data

### Environment Variables

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
JWT_SECRET="your-jwt-secret"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and proprietary.

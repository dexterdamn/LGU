# GADFS Data Entry System

A full-stack data entry platform for Gender and Development Framework Statistics (GADFS). Collect tabulated data segregated by sex and barangay, with automatic categorization, role-based access, and secure multi-factor registration.

## Features

- **Multi-step Registration**: Email OTP → Google Authenticator (TOTP with grace period) → Password
- **Role-Based Access**: Admin, Data Encoder, and Public Visitor roles
- **Spreadsheet Data Entry**: Google Sheets-like interface for tabulated data
- **Auto-Categorization**: Automatic sector, subcategory, and tag assignment
- **Public Data Browsing**: Visitors can view all entered data
- **Admin User Management**: Approve/reject data encoder registrations

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT sessions, bcrypt passwords, TOTP (otplib)
- **Email**: Nodemailer (SMTP)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon, Vercel Postgres, or local)

### Setup

1. Clone and install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Configure `.env`:

```env
DATABASE_URL="postgresql://postgres:password@host:5432/gadfs"
JWT_SECRET="generate-with-openssl-rand-base64-32"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="GADFS <your-email@gmail.com>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
TOTP_ISSUER="GADFS Data Entry"
```

4. Push database schema:

```bash
npx prisma db push
```

5. Run development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

### First User

The first registered user automatically becomes the **Admin** and can log in immediately. All subsequent users are **Data Encoders** who require admin approval before they can log in.

## Deploy to Vercel

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Use [Neon](https://neon.tech) or [Vercel Postgres](https://vercel.com/storage/postgres) for the database
5. Deploy — `postinstall` runs `prisma generate` automatically

After deploy, run database migration:

```bash
npx prisma db push
```

Or add a build step in Vercel with `DATABASE_URL` set.

## User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access, user management, modify/delete any data |
| **Data Encoder** | Create/edit own data, view all data |
| **Visitor** | View all public data only |

## Registration Flow

1. Enter personal info (email, name, office, sex, birthday, address)
2. Verify 6-digit email OTP
3. Scan QR code with Google Authenticator, enter TOTP (2-period grace window)
4. Set password (8+ chars, alphanumeric)
5. Admin approval required (except first user who is auto-admin)

## Data Categories

**Sectors**: Social, Environment, Institutional, Infrastructure, Economic

**Auto-tags**: `#gad`, `#sex-disaggregated`, `#barangay-level`, `#demographic`, etc.

The system auto-detects category from column names and table title. Manual override available during table creation.

## License

MIT

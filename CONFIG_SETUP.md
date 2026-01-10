# Frontend Configuration Setup

This guide will help you set up the environment configuration for the frontend service.

## Quick Setup

1. **Copy the example configuration:**
   ```bash
   cp env.example .env
   ```

   Or use the setup script:
   ```bash
   ./setup-env.sh
   ```

2. **Edit the `.env` file** with your actual configuration values.

3. **Generate a secure cookie secret:**
   ```bash
   openssl rand -base64 32
   ```
   Copy the output and set it as `APP_COOKIE_SECRET` in your `.env` file.

## Required Configuration

### Application Settings
- `APP_PORT` - Port the frontend service will run on (default: 8080)
- `APP_COOKIE_SECRET` - Secret key for session cookies (generate a secure random string)
- `APP_HANAYO_KEY` - API key for communication with the backend API
- `APP_ENV` - Environment (development/production)

### Database Configuration
- `DB_SCHEME` - Database type (usually `mysql`)
- `DB_HOST` - Database host (localhost for local dev)
- `DB_PORT` - Database port (3306 for MySQL)
- `DB_USER` - Database username
- `DB_PASS` - Database password
- `DB_NAME` - Database name

### Redis Configuration
- `REDIS_HOST` - Redis host (localhost for local dev)
- `REDIS_PORT` - Redis port (6379 default)
- `REDIS_PASS` - Redis password (empty if no password)
- `REDIS_DB` - Redis database number (0 default)
- `REDIS_USE_SSL` - Whether to use SSL (false for local dev)

### External Services
- `APP_BASE_URL` - Base URL of your frontend (http://localhost:8080 for local dev)
- `APP_API_URL` - URL of your API service
- `APP_AVATAR_URL` - URL for user avatars
- `APP_BANCHO_URL` - URL for bancho service

### Optional Services
- **Mailgun** - For sending emails (registration, password reset, etc.)
- **reCAPTCHA** - For bot protection on forms
- **Discord OAuth** - For Discord login integration
- **PayPal** - For donation/supporter features

## Local Development Setup

For local development, you can use these minimal settings:

```env
APP_PORT=8080
APP_COOKIE_SECRET=<generate-with-openssl-rand-base64-32>
APP_HANAYO_KEY=dev-key
APP_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your-password
DB_NAME=rosu

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASS=
REDIS_DB=0
REDIS_USE_SSL=false
```

You can leave optional services (Mailgun, reCAPTCHA, etc.) with placeholder values if you're not using them in development.

## Running the Service

After setting up your `.env` file:

```bash
go run main.go
# or
./frontend
```

The service will read the `.env` file automatically using the `godotenv` package.

## Troubleshooting

### "Missing environment variable" error
- Make sure your `.env` file exists in the frontend directory
- Check that all required variables are set
- Verify there are no syntax errors in your `.env` file (no spaces around `=`)

### Database connection errors
- Verify your MySQL/Redis services are running
- Check that the credentials in `.env` match your database setup
- For Docker setups, use service names (e.g., `mysql`, `redis`) instead of `localhost`

## Security Notes

- **Never commit `.env` to version control** - it's already in `.gitignore`
- Use strong, randomly generated secrets for production
- Keep your `APP_COOKIE_SECRET` secure - if compromised, all user sessions are at risk
- Rotate secrets periodically in production environments

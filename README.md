# DiscoverPlay

DiscoverPlay is a game discovery website backed by Express, MongoDB, and a static frontend.

## Local setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `MONGODB_URI` and a strong `JWT_SECRET`.
3. Start the backend with `npm start` from `backend/`.
4. Open `http://localhost:5000`.

## Development

Use `npm run dev` for automatic restarts.

## Admin

Use `npm run create-admin` only when an admin account is intentionally needed.

The production catalog is frozen; historical batch import and image-refresh scripts have been removed from the application package.

Never commit or share `backend/.env`.

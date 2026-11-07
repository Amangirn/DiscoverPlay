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


## Razorpay Support Developer (₹99)

The footer includes a one-time **Support Developer · ₹99** button. Payments are created and verified by the Express backend; the amount is fixed server-side and the Razorpay secret is never sent to the browser.

### Configure Razorpay Test Mode

1. In the Razorpay Dashboard, switch to **Test Mode**.
2. Generate a Test Key ID and Test Key Secret.
3. In `backend/`, copy `.env.example` to `.env`.
4. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `backend/.env`.
5. Make sure `MONGODB_URI` and `JWT_SECRET` are also configured.
6. Install backend dependencies and start the server:

   ```bash
   cd backend
   npm install
   npm start
   ```

7. Open the website through the Express server at `http://localhost:5000` (not by double-clicking `index.html`).

For the deployed site, add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` as **backend service environment variables** in Render. Keep Test Mode keys while testing. Do not put the Key Secret in frontend JavaScript or commit `backend/.env`.

### Payment behavior

- The amount is always ₹99 (9900 paise) and is enforced by the backend.
- A Razorpay order is created for each attempt.
- The backend verifies the checkout signature and confirms the payment details with Razorpay.
- Only captured payments are recorded as successful in MongoDB.
- If Razorpay keys are not configured, the button displays a setup error; the rest of DiscoverPlay continues to work.

### Disable support payments later

Remove the footer support block or disable the payment routes/button when you no longer want to accept contributions. You can also keep the integration in Test Mode for a project demonstration.

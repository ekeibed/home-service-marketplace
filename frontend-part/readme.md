# Frontend updates to drop into frontend-part/

These files wire the frontend to the live Django backend (login by email, request service, bookings, reviews, worker dashboard, availability toggle, Turkish-aware area filter).

api.js is a NEW file. All other files replace the existing ones.

## How to apply:

1. In your local repo, copy these files into the `frontend-part/` folder  
   (overwrite when prompted, except `api.js` which is brand new)

2. Commit under your own name so attribution is correct:

```bash
cd home-service-marketplace
git pull
git add frontend-part/
git commit -m "Wire frontend to backend API"
git push
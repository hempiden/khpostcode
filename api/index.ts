// Vercel serverless entrypoint: every /api/* request is rewritten here
// (see vercel.json) and handled by the shared Express app.
import app from "../server";

export default app;

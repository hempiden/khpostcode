// Vercel serverless entrypoint: every /api/* request is rewritten here
// (see vercel.json) and handled by the shared Express app.
// The ".js" extension is required: the function is emitted as ESM, where
// extensionless relative imports fail to resolve at runtime.
import app from "../server.js";

export default app;

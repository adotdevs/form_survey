// Deprecated: All persistent data operations now run through MongoDB in lib/mongodb.ts
// Re-exporting from lib/mongodb to eliminate any local filesystem writes or directory creation on Vercel/serverless.
export * from './mongodb';

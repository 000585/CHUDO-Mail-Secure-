import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    dialect: 'sqlite',
    schema: './src/entity/*.js',
    out: './migrations',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'file:local.db'
    }
});

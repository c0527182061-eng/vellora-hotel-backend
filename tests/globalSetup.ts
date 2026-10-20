import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

// לפני כל הרצת בדיקות: מסד הבדיקות נבנה מחדש מתוך קובצי ה־Migrations
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/vellora_test';
  if (!/test/i.test(url)) throw new Error('TEST_DATABASE_URL חייב להצביע על מסד בדיקות (שם שמכיל "test")');

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    const dir = path.resolve('prisma/migrations');
    const migrations = fs.readdirSync(dir).filter((d) => fs.statSync(path.join(dir, d)).isDirectory()).sort();
    for (const m of migrations) {
      await client.query(fs.readFileSync(path.join(dir, m, 'migration.sql'), 'utf8'));
    }
  } finally {
    await client.end();
  }

  return () => fs.rmSync(path.resolve('.test-uploads'), { recursive: true, force: true });
}

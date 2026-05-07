import { PrismaClient } from "@prisma/client";
import { app } from "../../src/app";
import { config } from "../../src/config";

// Use a separate test database or mock
// In CI, this would point to a test DB
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://easysplit:easysplit@localhost:5432/easysplit_test?schema=public";
process.env.NODE_ENV = "test";
process.env.DEV_AUTH_ENABLED = "true";

const prisma = new PrismaClient();

/**
 * Clean all tables in the database (in correct order to avoid FK violations).
 */
export async function cleanDatabase(): Promise<void> {
  const tablenames = [
    "expense_participants",
    "expenses",
    "settlements",
    "reminders",
    "audit_logs",
    "balances",
    "idempotency_keys",
    "group_members",
    "groups",
    "subscriptions",
    "users",
  ];

  for (const tablename of tablenames) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${tablename}" CASCADE;`);
  }
}

/**
 * Disconnect Prisma after all tests.
 */
export async function closeConnection(): Promise<void> {
  await prisma.$disconnect();
}

export { app, prisma, config };

import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { creatorsTable } from "./creators";

export const supportTable = pgTable(
  "da3mni_support_records",
  {
    id: serial("id").primaryKey(),
    creatorId: integer("creator_id")
      .notNull()
      .references(() => creatorsTable.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("IQD"),
    displayName: text("display_name"),
    isAnonymous: boolean("is_anonymous").notNull().default(true),
    message: text("message"),
    status: text("status").notNull().default("simulated"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("da3mni_support_creator_created_idx").on(table.creatorId, table.createdAt)],
);

export const insertSupportSchema = createInsertSchema(supportTable).omit({
  id: true,
  createdAt: true,
});

export type InsertSupport = z.infer<typeof insertSupportSchema>;
export type Support = typeof supportTable.$inferSelect;

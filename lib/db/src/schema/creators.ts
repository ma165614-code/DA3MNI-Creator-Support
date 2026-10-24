import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const creatorsTable = pgTable("da3mni_creators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  bio: text("bio").notNull(),
  goalAmount: integer("goal_amount").notNull(),
  goalRaised: integer("goal_raised").notNull().default(0),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertCreatorSchema = createInsertSchema(creatorsTable).omit({
  id: true,
  goalRaised: true,
  createdAt: true,
});

export type InsertCreator = z.infer<typeof insertCreatorSchema>;
export type Creator = typeof creatorsTable.$inferSelect;

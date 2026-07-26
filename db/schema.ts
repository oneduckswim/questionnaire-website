import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const responses = sqliteTable("responses", {
  id: text("id").primaryKey(),
  condition: text("condition").notNull(),
  product: text("product").notNull(),
  aiDisclosure: integer("ai_disclosure", { mode: "boolean" }).notNull(),
  pilot: integer("pilot", { mode: "boolean" }).notNull().default(false),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  status: text("status").notNull().default("in_progress"),
  durationSeconds: integer("duration_seconds"),
  attentionPassed: integer("attention_passed", { mode: "boolean" }),
  manipulationPassed: integer("manipulation_passed", { mode: "boolean" }),
  answersJson: text("answers_json").notNull().default("{}"),
});

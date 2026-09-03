import z from "zod";

// Payment and recovery history are derived from orders and payments rather
// than stored here, so aggregates cannot drift from the underlying records.
export const CustomerSchema = z.object({
  id: z.string(),
  email: z.email(),
  contact: z.string(),
  created_at: z.iso.datetime(),
});

export type Customer = z.infer<typeof CustomerSchema>;

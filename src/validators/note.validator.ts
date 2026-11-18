import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().min(1).max(10000),
});

export const updateNoteSchema = createNoteSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'Provide title or content to update' });

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

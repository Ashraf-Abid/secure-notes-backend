import { z } from 'zod';

export const emailField = z.string().trim().toLowerCase().pipe(z.email());
export const passwordField = z.string().min(8).max(72);
export const interestsField = z.array(z.string().trim().toLowerCase().min(1).max(30)).max(20);

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(50),
  email: emailField,
  password: passwordField,
  interests: interestsField.optional(),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

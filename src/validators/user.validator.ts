import { z } from 'zod';
import { ROLES } from '../models/User';
import { emailField, interestsField, passwordField } from './auth.validator';
import { paginationSchema } from '../utils/pagination';

export const objectIdField = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const userFields = z.object({
  name: z.string().trim().min(1).max(50),
  email: emailField,
  password: passwordField,
  role: z.enum(ROLES),
  interests: interestsField,
});

export const createUserSchema = userFields.extend({
  role: userFields.shape.role.default('USER'),
  interests: userFields.shape.interests.default([]),
});

export const updateUserSchema = userFields
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'Provide at least one field to update' });

export const adminNotesQuerySchema = paginationSchema.extend({
  userId: objectIdField.optional(),
});

export const interestGroupsQuerySchema = paginationSchema.extend({
  interest: z.string().trim().toLowerCase().min(1).max(30).optional(),
});

export type InterestGroupsQuery = z.infer<typeof interestGroupsQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AdminNotesQuery = z.infer<typeof adminNotesQuerySchema>;

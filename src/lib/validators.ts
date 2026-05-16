import { z } from 'zod';

export const CreateNCRSchema = z.object({
  problem: z.string().min(10, 'Problem description must be at least 10 characters.'),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  department: z.enum(['Production', 'Installer', 'Accountant', 'Seller']),
  approver1: z.string().min(1, 'Approver 1 is required.'),
  submitNow: z.boolean().default(false),
});
export type CreateNCRInput = z.infer<typeof CreateNCRSchema>;

export const UpdateDraftSchema = z.object({
  problem: z.string().min(10),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  department: z.enum(['Production', 'Installer', 'Accountant', 'Seller']),
  approver1: z.string().min(1),
});
export type UpdateDraftInput = z.infer<typeof UpdateDraftSchema>;

export const WorkflowActionSchema = z
  .object({
    action: z.enum([
      'SUBMIT',
      'APPROVE_1',
      'REJECT_1',
      'APPROVE_2',
      'REJECT_2',
      'APPROVE_AMD',
      'REJECT_AMD',
      'CLOSE',
    ]),
    comment: z.string().optional(),
    approver1: z.string().optional(),
    approver2: z.string().optional(),
    amd: z.string().optional(),
    workers: z.array(z.string()).optional(),
  })
  .refine(
    (d) => {
      if (['REJECT_1', 'REJECT_2', 'REJECT_AMD'].includes(d.action)) {
        return !!d.comment?.trim();
      }
      return true;
    },
    { message: 'A rejection reason is required.', path: ['comment'] }
  );
export type WorkflowActionInput = z.infer<typeof WorkflowActionSchema>;

export const ReassignSchema = z.object({
  ncrId: z.string().min(1),
  newUserId: z.string().min(1),
});
export type ReassignInput = z.infer<typeof ReassignSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Invalid email.'),
  password: z.string().min(1, 'Password is required.'),
});

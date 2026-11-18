import { z } from 'zod';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';
import { emailField, passwordField } from '../validators/auth.validator';

const adminEnvSchema = z.object({
  ADMIN_NAME: z.string().trim().min(1).max(50).default('Admin'),
  ADMIN_EMAIL: emailField,
  ADMIN_PASSWORD: passwordField,
});

async function main() {
  const parsed = adminEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid admin config. Set ADMIN_EMAIL and ADMIN_PASSWORD (8-72 chars) in .env');
    for (const issue of parsed.error.issues) console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    process.exit(1);
  }
  const { ADMIN_NAME: name, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = parsed.data;

  await connectDB();

  const existing = await User.findOne({ email });
  if (!existing) {
    await User.create({ name, email, password, role: 'ADMIN' });
    console.log(`Admin created: ${email}`);
  } else if (existing.role === 'ADMIN') {
    console.log(`${email} is already an admin`);
  } else {
    existing.role = 'ADMIN';
    await existing.save();
    console.log(`Promoted ${email} to admin`);
  }

  await disconnectDB();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});

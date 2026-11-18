import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';
import { LoginInput, RegisterInput } from '../validators/auth.validator';

export async function register(input: RegisterInput) {
  const user = await User.create({
    name: input.name,
    email: input.email,
    password: input.password,
    interests: input.interests ?? [],
    role: 'USER',
  });
  return { token: signToken(user.id), user };
}

export async function login({ email, password }: LoginInput) {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError(401, 'Invalid email or password');
  }
  return { token: signToken(user.id), user };
}

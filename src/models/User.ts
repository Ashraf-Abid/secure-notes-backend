import { Schema, model, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = ['USER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: Role;
  interests: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

type UserModel = Model<IUser, {}, IUserMethods>;

const BCRYPT_ROUNDS = 12;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true, // so "A@x.com" and "a@x.com" can't both register
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    // Stores the bcrypt hash, never the plain password.
    // select: false => excluded from every query unless explicitly requested
    // with .select('+password') (only the login flow does that).
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'USER' },
    interests: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
      default: [],
      validate: [(v: string[]) => v.length <= 20, 'At most 20 interests allowed'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      // Second layer of protection: even if a hash is loaded, it never
      // leaves the API in a response body.
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// ---------------------------------------------------------------------------
// Indexes (defined with schema.index() so they are visible in review)
// ---------------------------------------------------------------------------

// 1. Login + registration duplicate check: findOne({ email }).
//    unique: true also enforces "one account per email" at the database
//    level, which is race-safe (two simultaneous registrations can't both win).
userSchema.index({ email: 1 }, { unique: true });

// 2. Group-by-interests aggregation: the pipeline's first stage is
//    $match on `interests`. Because `interests` is an array, this is a
//    MULTIKEY index (one index entry per array element).
userSchema.index({ interests: 1 });

// Not indexed on purpose:
//  - GET user by id / profile          -> built-in _id index
//  - Admin list users, newest first    -> sort({ _id: -1 }) uses the _id index
//    (ObjectIds start with a timestamp, so _id order == creation order)

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

// Hash only when the password was set or changed, so updating e.g. the name
// doesn't re-hash an existing hash.
// NOTE: this hook runs on save()/create(), NOT on findOneAndUpdate()/updateOne().
// Any code that changes a password must therefore use doc.save().
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
});

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = model<IUser, UserModel>('User', userSchema);

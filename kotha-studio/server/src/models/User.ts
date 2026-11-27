import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { MAX_REFRESH_TOKENS, ROLES } from '@kotha/shared';

const tokenSchema = new Schema(
  {
    hash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'client', index: true },
    isVerified: { type: Boolean, default: false },
    avatarUrl: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: {
      line: { type: String, default: '' },
      city: { type: String, default: '' },
    },
    refreshTokens: {
      type: [tokenSchema],
      default: [],
      validate: [(v: unknown[]) => v.length <= MAX_REFRESH_TOKENS, 'too many sessions'],
    },
    verifyToken: { type: tokenSchema, default: null },
    resetToken: { type: tokenSchema, default: null },
    isActive: { type: Boolean, default: true },
    roleAudit: {
      type: [{ role: String, note: String, by: { type: Schema.Types.ObjectId, ref: 'User' }, at: Date }],
      default: [],
    },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, createdAt: -1 });

/** Never let a hash escape through toJSON. */
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete (ret as Record<string, unknown>).passwordHash;
    delete (ret as Record<string, unknown>).refreshTokens;
    delete (ret as Record<string, unknown>).verifyToken;
    delete (ret as Record<string, unknown>).resetToken;
    return ret;
  },
});

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
export const User: Model<UserDoc> = mongoose.model<UserDoc>('User', userSchema);

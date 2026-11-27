import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { REVIEW_TARGETS } from '@kotha/shared';

const reviewSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: REVIEW_TARGETS, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 800 },
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

reviewSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
reviewSchema.index({ author: 1, targetType: 1, targetId: 1 }, { unique: true });

export type ReviewDoc = InferSchemaType<typeof reviewSchema> & { _id: mongoose.Types.ObjectId };
export const Review: Model<ReviewDoc> = mongoose.model<ReviewDoc>('Review', reviewSchema);

import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { NOTIFICATION_TYPES } from '@kotha/shared';

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 90 },
    body: { type: String, default: '', maxlength: 240 },
    link: { type: String, default: '' },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const Notification: Model<NotificationDoc> = mongoose.model<NotificationDoc>(
  'Notification',
  notificationSchema,
);

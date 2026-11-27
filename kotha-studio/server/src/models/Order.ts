import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { ORDER_STATUSES } from '@kotha/shared';

/** Line items are snapshots: an invoice must survive a product rename or a price change. */
const orderItemSchema = new Schema(
  {
    furniture: { type: Schema.Types.ObjectId, ref: 'Furniture', required: true },
    name: { type: String, required: true },
    dimensions: { w: Number, d: Number, h: Number },
    unitPaisa: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1, max: 20 },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNo: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    design: { type: Schema.Types.ObjectId, ref: 'Design', default: null },
    items: { type: [orderItemSchema], required: true },
    subtotalPaisa: { type: Number, required: true, min: 0 },
    deliveryPaisa: { type: Number, required: true, min: 0 },
    vatPaisa: { type: Number, required: true, min: 0 },
    totalPaisa: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending_payment', index: true },
    payment: {
      provider: { type: String, default: 'khalti' },
      pidx: { type: String, default: '' },
      status: { type: String, default: '' },
      transactionId: { type: String, default: '' },
      amountPaisa: { type: Number, default: 0 },
      lookedUpAt: { type: Date, default: null },
      paymentUrl: { type: String, default: '' },
    },
    address: {
      line: { type: String, required: true },
      city: { type: String, required: true },
      slot: { type: String, required: true },
    },
    history: {
      type: [{ status: String, at: { type: Date, default: Date.now }, note: String }],
      default: [],
    },
    idempotencyKey: { type: String, default: '' },
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.pidx': 1 }, { unique: true, sparse: true });
orderSchema.index({ idempotencyKey: 1 }, { sparse: true });

/** Only these transitions are legal. The service enforces them, not the schema. */
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['paid', 'cancelled', 'failed'],
  paid: ['packing', 'cancelled'],
  packing: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
  failed: ['pending_payment'],
};

export type OrderDoc = InferSchemaType<typeof orderSchema> & { _id: mongoose.Types.ObjectId };
export const Order: Model<OrderDoc> = mongoose.model<OrderDoc>('Order', orderSchema);

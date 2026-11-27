import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import {
  COLOUR_TOKENS,
  FURNITURE_MATERIALS,
  MAX_DIM_MM,
  MAX_PRICE_PAISA,
  MAX_PRODUCT_IMAGES,
  MIN_DIM_MM,
  MIN_PRICE_PAISA,
} from '@kotha/shared';

const furnitureSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 90 },
    description: { type: String, default: '', maxlength: 1200 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    dimensions: {
      w: { type: Number, required: true, min: MIN_DIM_MM, max: MAX_DIM_MM },
      d: { type: Number, required: true, min: MIN_DIM_MM, max: MAX_DIM_MM },
      h: { type: Number, required: true, min: MIN_DIM_MM, max: MAX_DIM_MM },
    },
    pricePaisa: { type: Number, required: true, min: MIN_PRICE_PAISA, max: MAX_PRICE_PAISA },
    stock: { type: Number, default: 0, min: 0 },
    material: { type: String, enum: FURNITURE_MATERIALS, default: 'other' },
    colourToken: { type: String, enum: COLOUR_TOKENS, default: 'stone' },
    images: {
      type: [String],
      default: [],
      validate: [(v: string[]) => v.length <= MAX_PRODUCT_IMAGES, `at most ${MAX_PRODUCT_IMAGES} images`],
    },
    modelUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    soldCount: { type: Number, default: 0, min: 0 },
    priceAudit: {
      type: [{ from: Number, to: Number, by: { type: Schema.Types.ObjectId, ref: 'User' }, at: Date }],
      default: [],
    },
  },
  { timestamps: true },
);

furnitureSchema.index({ name: 'text', description: 'text' }, { weights: { name: 8, description: 2 } });
furnitureSchema.index({ category: 1, pricePaisa: 1 });
furnitureSchema.index({ isActive: 1, soldCount: -1 });
furnitureSchema.index({ isActive: 1, createdAt: -1 });

export type FurnitureDoc = InferSchemaType<typeof furnitureSchema> & { _id: mongoose.Types.ObjectId };
export const Furniture: Model<FurnitureDoc> = mongoose.model<FurnitureDoc>('Furniture', furnitureSchema);

import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { FLOOR_FINISHES, MAX_PLACEMENTS, WALL_FINISHES } from '@kotha/shared';

const placementSchema = new Schema(
  {
    id: { type: String, required: true },
    furniture: { type: Schema.Types.ObjectId, ref: 'Furniture', required: true },
    spaceId: { type: String, required: true },
    x: { type: Number, required: true },
    z: { type: Number, required: true },
    rotationDeg: { type: Number, default: 0 },
    qty: { type: Number, default: 1, min: 1, max: 20 },
  },
  { _id: false },
);

/**
 * A design version is an immutable snapshot. Restoring never edits history;
 * it copies a snapshot into a new version.
 */
const designSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    version: { type: Number, required: true, min: 1 },
    placements: {
      type: [placementSchema],
      default: [],
      validate: [(v: unknown[]) => v.length <= MAX_PLACEMENTS, `at most ${MAX_PLACEMENTS} items`],
    },
    materials: {
      walls: { type: String, enum: WALL_FINISHES, default: 'paper' },
      floors: { type: Map, of: String, enum: FLOOR_FINISHES, default: {} },
    },
    totalPaisa: { type: Number, default: 0, min: 0 },
    thumbnailUrl: { type: String, default: '' },
    note: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

designSchema.index({ project: 1, version: -1 }, { unique: true });

export type DesignDoc = InferSchemaType<typeof designSchema> & { _id: mongoose.Types.ObjectId };
export const Design: Model<DesignDoc> = mongoose.model<DesignDoc>('Design', designSchema);

import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import {
  DEFAULT_WALL_HEIGHT_MM,
  DEFAULT_WALL_THICKNESS_MM,
  MAX_SPACES,
  PROJECT_STATUSES,
  ROOM_TYPES,
} from '@kotha/shared';

const pointSchema = new Schema({ type: [Number] }, { _id: false });

const spaceSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ROOM_TYPES, required: true },
    polygon: { type: [pointSchema], required: true },
    wallIds: { type: [String], default: [] },
  },
  { _id: false },
);

const wallSchema = new Schema(
  {
    id: { type: String, required: true },
    from: { type: pointSchema, required: true },
    to: { type: pointSchema, required: true },
    spaceIds: { type: [String], default: [] },
    shared: { type: Boolean, default: false },
  },
  { _id: false },
);

const openingSchema = new Schema(
  {
    id: { type: String, required: true },
    kind: { type: String, enum: ['door', 'window'], required: true },
    wallId: { type: String, required: true },
    offsetMm: { type: Number, required: true, min: 0 },
    widthMm: { type: Number, required: true, min: 100 },
    heightMm: { type: Number, required: true, min: 100 },
    sillMm: { type: Number, default: 0, min: 0 },
    swing: {
      type: String,
      enum: ['inward-left', 'inward-right', 'outward-left', 'outward-right'],
      default: 'inward-left',
    },
    connects: { type: [String], default: [] },
  },
  { _id: false },
);

/**
 * The blueprint is embedded because it is always read with its project and is
 * bounded (three spaces). Zod owns the contract; Mongoose owns the storage shape.
 */
export const blueprintSchema = new Schema(
  {
    schemaVersion: { type: Number, default: 2 },
    revision: { type: Number, default: 0, min: 0 },
    scale: {
      mmPerUnit: { type: Number, default: 1 },
      calibrated: { type: Boolean, default: false },
      reference: {
        type: new Schema({ a: pointSchema, b: pointSchema, declaredMm: Number }, { _id: false }),
        default: null,
      },
    },
    wall: {
      thicknessMm: { type: Number, default: DEFAULT_WALL_THICKNESS_MM },
      heightMm: { type: Number, default: DEFAULT_WALL_HEIGHT_MM },
    },
    spaces: { type: [spaceSchema], default: [] },
    walls: { type: [wallSchema], default: [] },
    openings: { type: [openingSchema], default: [] },
    referenceImage: {
      type: new Schema(
        { url: String, opacity: { type: Number, default: 0.4 }, locked: { type: Boolean, default: false } },
        { _id: false },
      ),
      default: null,
    },
  },
  { _id: false },
);

const projectSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    designer: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    sharedWith: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    roomType: { type: String, enum: ROOM_TYPES, required: true },
    status: { type: String, enum: PROJECT_STATUSES, default: 'draft' },
    blueprint: { type: blueprintSchema, default: () => ({ spaces: [], walls: [], openings: [] }) },
    thumbnailUrl: { type: String, default: '' },
    isTemplate: { type: Boolean, default: false },
    templateApproval: { type: String, enum: ['none', 'pending', 'approved'], default: 'none' },
    templateName: { type: String, default: '' },
    versionCounter: { type: Number, default: 0 },
    comments: {
      type: [
        new Schema(
          {
            id: String,
            author: { type: Schema.Types.ObjectId, ref: 'User' },
            anchor: { kind: String, id: String, x: Number, z: Number },
            body: String,
            createdAt: { type: Date, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

projectSchema.index({ owner: 1, updatedAt: -1 });
projectSchema.index({ sharedWith: 1, updatedAt: -1 });
projectSchema.index({ isTemplate: 1, templateApproval: 1 });
projectSchema.index({ name: 'text' });

projectSchema.pre('validate', function limitSpaces(next) {
  const spaces = (this.blueprint as { spaces?: unknown[] } | undefined)?.spaces ?? [];
  if (spaces.length > MAX_SPACES) {
    return next(new Error(`a project holds at most ${MAX_SPACES} spaces`));
  }
  next();
});

export type ProjectDoc = InferSchemaType<typeof projectSchema> & { _id: mongoose.Types.ObjectId };
export const Project: Model<ProjectDoc> = mongoose.model<ProjectDoc>('Project', projectSchema);

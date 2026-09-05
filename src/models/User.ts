import mongoose, { Schema, models, model } from "mongoose";

export type UserRole = "customer" | "laundry" | "delivery";

/**
 * Single "users" collection for all three roles, discriminated by `role`.
 * Role-specific fields are kept optional and only used by the relevant role.
 * This keeps auth (Common Workflow) simple, while Laundry/Delivery-specific
 * fields power Module 1 & 2 features (availability, job feed, ratings, favorites).
 */
const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["customer", "laundry", "delivery"], required: true },
    location: { type: String, required: true }, // simple text address; can be upgraded to GeoJSON later

    // --- Laundry-only fields ---
    laundryName: { type: String },
    isOnline: { type: Boolean, default: false }, // Module 1: Availability toggle
    servicesOffered: [{ type: String }], // e.g. ["Washing", "Ironing"]
    vipEnabled: { type: Boolean, default: false },
    vipCustomerIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    vipFee: { type: Number, default: 199 }, // BDT, one-time mock membership fee set by the laundry

    // --- Delivery-only fields ---
    verified: { type: Boolean, default: false }, // verified delivery-man
    assignedLaundryId: { type: Schema.Types.ObjectId, ref: "User" }, // appointed by which laundry

    // --- Customer-only fields ---
    favorites: {
      laundries: [{ type: Schema.Types.ObjectId, ref: "User" }],
      deliveryMen: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },

    // Aggregate rating cache (Module 2)
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, isOnline: 1 });

export type UserDoc = mongoose.InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

export default models.User || model("User", UserSchema);
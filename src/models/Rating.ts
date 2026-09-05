import mongoose, { Schema, models, model } from "mongoose";

const RatingSchema = new Schema(
  {
    fromCustomerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // laundry OR delivery-man
    targetRole: { type: String, enum: ["laundry", "delivery"], required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    stars: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// A customer can only rate a given target once per booking
RatingSchema.index({ fromCustomerId: 1, bookingId: 1, targetUserId: 1 }, { unique: true });

export type RatingDoc = mongoose.InferSchemaType<typeof RatingSchema> & { _id: mongoose.Types.ObjectId };

export default models.Rating || model("Rating", RatingSchema);

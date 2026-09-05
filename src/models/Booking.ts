import mongoose, { Schema, models, model } from "mongoose";

/**
 * A Booking is created by a Customer against a Laundry.
 * Once the Laundry accepts it, they may appoint a Delivery-Man to it
 * (Module 1: Job Feed and Appointment).
 */
const BookingSchema = new Schema(
  {
    orderSerial: { type: String, required: true, unique: true }, // Module 3: identity generation per order
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    laundryId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deliveryManId: { type: Schema.Types.ObjectId, ref: "User", default: null },

    services: [{ type: String, required: true }], // ["Washing", "Ironing"]
    notes: { type: String },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "picked_up", "in_progress", "ready", "delivered", "cancelled"],
      default: "pending",
    },

    pickupAddress: { type: String, required: true },
    expectedReturnDate: { type: Date },

    isVipOrder: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type BookingDoc = mongoose.InferSchemaType<typeof BookingSchema> & { _id: mongoose.Types.ObjectId };

export default models.Booking || model("Booking", BookingSchema);

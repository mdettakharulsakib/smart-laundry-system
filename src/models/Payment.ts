import mongoose, { Schema, models, model } from "mongoose";

const PaymentSchema = new Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    laundryId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    purpose: { type: String, enum: ["vip_membership"], default: "vip_membership" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "BDT" },

    status: { type: String, enum: ["succeeded", "failed"], default: "succeeded" },
    method: { type: String, default: "mock_card" },
    cardBrand: { type: String },
    cardLast4: { type: String },
  },
  { timestamps: true }
);

export type PaymentDoc = mongoose.InferSchemaType<typeof PaymentSchema> & { _id: mongoose.Types.ObjectId };

export default models.Payment || model("Payment", PaymentSchema);
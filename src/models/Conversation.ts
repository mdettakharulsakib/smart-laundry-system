import mongoose, { Schema, models, model } from "mongoose";

/**
 * A Conversation can be 1:1 (customer <-> laundry, customer <-> delivery-man)
 * or a group (customer + laundry + delivery-man together), per Module 2:
 * "Customers can chat with Laundry User or Delivery-man or make a group discussion".
 */
const ConversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    isGroup: { type: Boolean, default: false },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null }, // optional link to an order
    title: { type: String }, // e.g. "Order #SLS-0001 discussion" for group chats
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export type ConversationDoc = mongoose.InferSchemaType<typeof ConversationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export default models.Conversation || model("Conversation", ConversationSchema);

import mongoose, { Schema, models, model } from "mongoose";

const MessageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 4000 },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export type MessageDoc = mongoose.InferSchemaType<typeof MessageSchema> & { _id: mongoose.Types.ObjectId };

export default models.Message || model("Message", MessageSchema);

import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    globalRole: { type: String, enum: ["ANALYST", "SUBSCRIBER"], required: true },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model("User", UserSchema);
export type UserDoc = mongoose.InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

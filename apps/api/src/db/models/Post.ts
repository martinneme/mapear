import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Tenant",
    },

    countryIso3: { type: String, required: true, index: true }, // "ARG"
    layerKey: { type: String, required: true, index: true }, // "geopolitica"

    title: { type: String, required: true },
    summary: { type: String, default: "" },
    body: { type: String, default: "" }, // markdown

    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    publishedAt: { type: Date, index: true },

    tags: { type: [String], default: [] },
    media: { type: [{ type: { type: String }, url: String }], default: [] },
  },
  { timestamps: true }
);

PostSchema.index({ countryIso3: 1, layerKey: 1, publishedAt: -1 });
PostSchema.index({ tenantId: 1, publishedAt: -1 });

export const PostModel = mongoose.model("Post", PostSchema);
export type PostDoc = mongoose.InferSchemaType<typeof PostSchema> & {
  _id: mongoose.Types.ObjectId;
};

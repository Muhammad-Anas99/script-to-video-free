const mongoose = require('mongoose');

const SceneSchema = new mongoose.Schema({
  text: String, // the spoken line (empty for silent scenes)
  speaker: String, // narrator | character
  visual: String,
  keywords: [String],
  clipUrl: String,
  thumb: String, // preview of the footage that was picked
  mediaKind: String, // video | image
  duration: Number,
});

const VideoSchema = new mongoose.Schema(
  {
    script: { type: String, required: true },
    status: { type: String, default: 'queued' }, // queued | processing | done | error
    progress: { type: String, default: 'Queued' },
    step: { type: String, default: 'analyze' }, // analyze | scenes | join | done
    current: { type: Number, default: 0 }, // scenes finished so far
    total: { type: Number, default: 0 }, // scenes in total
    options: { type: mongoose.Schema.Types.Mixed, default: {} },
    plan: { type: mongoose.Schema.Types.Mixed }, // scenes the user reviewed and edited
    scenes: [SceneSchema],
    videoFile: String,
    posterFile: String,
    srtFile: String,
    warnings: [String],
    error: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Video', VideoSchema);

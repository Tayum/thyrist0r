// A MODULE TO EXPORT THE trackModel MODEL (USED WHEN WORKING WITH DATABASE)!
const mongoose = require('mongoose');

var Schema = mongoose.Schema;

var trackSchema = new Schema({
	name: String,
  // file_size
  // duration
  number: Number,
	raw_data: { type: Schema.Types.ObjectId, ref:"fs.files" },
  album: { type: Schema.Types.ObjectId, ref:"Album" }
});

var trackModel = mongoose.model('Track', trackSchema);

module.exports = trackModel;

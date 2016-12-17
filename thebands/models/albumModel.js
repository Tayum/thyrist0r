// A MODULE TO EXPORT THE albumModel MODEL (USED WHEN WORKING WITH DATABASE)!
const mongoose = require('mongoose');

var Schema = mongoose.Schema;

var albumSchema = new Schema({
	name: String,
	rls_date: String,
	genre: String,
	tracks: Number,
	logo: Buffer,
  tracks_array: [ { type: Schema.Types.ObjectId, ref:"Track" } ],
	band: { type: Schema.Types.ObjectId, ref: "Band" }
});

var albumModel = mongoose.model('Album', albumSchema);

module.exports = albumModel;

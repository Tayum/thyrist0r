// A MODULE TO EXPORT THE bandModel MODEL (USED WHEN WORKING WITH DATABASE)!
const mongoose = require('mongoose');

var Schema = mongoose.Schema;

var bandSchema = new Schema({
	name: String,
	formed: String,
	members: Number,
	genre: String,
	albums: Number,
	description: String,
	albums_array: [ { type: Schema.Types.ObjectId, ref:"Album" } ]
});

var bandModel = mongoose.model('Band', bandSchema);

module.exports = bandModel;

// A MODULE TO EXPORT THE bandModel MODEL (USED WHEN WORKING WITH DATABASE)!
const mongoose = require('mongoose');
var path = require('path');
var fs = require('fs');

var Schema = mongoose.Schema;

const albumModel = require('./albumModel');
const albumFuncs = require('./album');
const bandModel = require('./bandModel');

module.exports.deleteBand = function(band, cb) {
	if (band.albums_array) {
		for (let i = 0; i < band.albums_array.length; i++) {
			albumFuncs.deleteAlbum(band.albums_array[i]);
		}
	}
	band.remove();
};

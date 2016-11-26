// A MODULE TO EXPORT THE bandModel MODEL (USED WHEN WORKING WITH DATABASE)!
const mongoose = require('mongoose');
var path = require('path');
var fs = require('fs');
// required for deleting the folder containing files (synchronously)
var rimraf = require('rimraf');

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
	let dir = 'public/images/bands/' + band._id;
	band.remove();
	// Remove the directory (with a unique name - '_id') for the certain object
	// (also removing all the files inside it)
	rimraf(dir, function(err) {
		if(err) {
			console.log("ERROR WHILE DELETING THE FOLDER!");
		}
		else {
			console.log("The folder has been successfully removed.");
		}
	});
};

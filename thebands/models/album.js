// A MODULE TO EXPORT THE albumModel MODEL (USED WHEN WORKING WITH DATABASE)!
const mongoose = require('mongoose');
var path = require('path');
var fs = require('fs');
// required for deleting the folder containing files (synchronously)
var rimraf = require('rimraf');

var Schema = mongoose.Schema;

const albumModel = require('./albumModel');
const bandModel = require('./bandModel');
// const trackModel = require('./trackModel');

module.exports.deleteAlbum = function(albumRef) {
	let query = albumModel.findById(albumRef._id).populate('band');
	query.exec(function(err, album) {
		if (err) {
			err = new Error('Sorry, the album cannot be removed from the database.');
			err.status = 500;
			next(err);
		}
		else {
			// Unlink the album on the band's side
			query = bandModel.update(
			{
				_id: album.band
			},
			{
				$pull: { albums_array: album._id }
			});
			query.exec(function(err, band) {
				if (err) {
					console.log("ERROR: cannot unlink the album from the corresponding band.");
				}
				if (album.tracks_array) {
					for (let i = 0; i < album.tracks_array.length; i++) {
						// deleteTrack(album.tracks_array[i]);
					}
				}
				let dir = 'public/images/albums/' + album._id;
				album.remove();
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
			});
		}
	});
};

module.exports.createAlbum = function(infoObj, cb) {
	let newAlbum = new albumModel({
		name: infoObj.name,
		rls_date: infoObj.rls_date,
		genre: infoObj.genre,
		tracks: infoObj.tracks,
		// tracks_array: infoObj.tracks_array,
		band: infoObj.band
	});
	console.log("NEW CREATED ALBUM:\n" + newAlbum);
	newAlbum.save(function(err, album) {
		if (err) {
			err = new Error('Sorry, the album cannot be saved to the database.');
			err.status = 500;
			next(err);
		}
		else {
			// Link the album on the band's side
			let query = bandModel.update(
			{
				_id: album.band
			},
			{
				$push: { albums_array: album._id }
			});
			query.exec(function(err) {
				if (err) {
					console.log("ERROR: cannot link the album to the cooresponding band.");
				}
				// Create a directory (with a unique name - '_id') for the certain object
				// and place the passed image there
				let dir = 'public/images/albums/' + album._id;
				fs.mkdir(dir, function() {
					fs.writeFile(dir + '/logo.jpg', infoObj.albumLogo);
				});
				cb();
			});
		}
	});
};

module.exports.updateAlbum = function(album, infoObj, cb) {
	album.name = infoObj.name;
	album.albumRls_date = infoObj.rls_date;
	album.genre = infoObj.genre;
	album.tracks = infoObj.tracks;

	// If the band reference WAS NOT changed
	if (album.band === infoObj.band) {
		album.save();
		cb();
	}
	// If the band reference WAS changed (i.e. new band was linked)
	else {
		// 1) Unlink the album on the old band's side
		let query = bandModel.update(
		{
			_id: album.band
		},
		{
			$pull: { albums_array: album._id }
		});
		query.exec(function(err) {
			if (err) {
				console.log("ERROR: cannot unlink the album from the old band.");
			}

			// 2) Link the new band on the album's side
			album.band = infoObj.band;

			// 3.1) Link the album on the new band's side
			query = bandModel.update(
			{
				_id: album.band
			},
			{
				$push: { albums_array: album._id }
			});
			query.exec(function(err) {
				if (err) {
					console.log("ERROR: cannot link the album to the new band.");
				}
				// 3.2) Save the changes on the album's side
				album.save();
				cb();
			});
		});
	}
};

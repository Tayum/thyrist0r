// A MODULE TO EXPORT THE albumModel MODEL (USED WHEN WORKING WITH DATABASE)!
const mongoose = require('mongoose');
var path = require('path');
var fs = require('fs');

var Schema = mongoose.Schema;

const trackModel = require('./trackModel');
const trackFuncs = require('./track');
const albumModel = require('./albumModel');
const bandModel = require('./bandModel');


module.exports.deleteAlbum = function(albumRef) {
	let query = albumModel.findById(albumRef._id).populate('band');
	query.exec(function(err, album) {
		if (err) {
			console.log('ERROR: the album cannot be removed from the database.');
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
						deleteTrack(album.tracks_array[i]);
					}
				}
				album.remove();
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
		logo: infoObj.albumLogo,
		tracks_array: infoObj.tracks_array,
		band: infoObj.band
	});
	newAlbum.save(function(err, album) {
		if (err) {
			console.log("ERROR: the album cannot be saved to the database.");
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

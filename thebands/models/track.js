// A MODULE TO EXPORT THE albumModel MODEL (USED WHEN WORKING WITH DATABASE)!
const mongoose = require('mongoose');

var Schema = mongoose.Schema;

const trackModel = require('./trackModel');
const albumModel = require('./albumModel');

module.exports.deleteTrack = function(trackRef) {
	let query = trackModel.findById(trackRef._id).populate('album');
	query.exec(function(err, track) {
		if (err) {
			console.log("ERROR: the track cannot be removed from the database.");
		}
		else {
			// Unlink the track on the album's side
			query = albumModel.update(
			{
				_id: track.album
			},
			{
				$pull: { tracks_array: track._id }
			});
			query.exec(function(err, album) {
				if (err) {
					console.log("ERROR: cannot unlink the track from the corresponding album.");
				}
				track.remove();
			});
		}
	});
};

module.exports.createTrack = function(infoObj, cb) {
	let newTrack = new trackModel({
		name: infoObj.name,
    // file_size: infoObj.file_size,
    // duration: infoObj.duration,
		number: infoObj.number,
    track_raw: infoObj.track_raw,
		album: infoObj.album
	});
	//console.log("NEW CREATED TRACK:\n" + newTrack);
	newTrack.save(function(err, track) {
		if (err) {
			console.log("ERROR: the track cannot be saved to the database.");
		}
		else {
			// Link the track on the album's side
			let query = albumModel.update(
			{
				_id: track.album
			},
			{
				$push: { tracks_array: track._id }
			});
			query.exec(function(err) {
				if (err) {
					console.log("ERROR: cannot link the track to the cooresponding album.");
				}
				cb();
			});
		}
	});
};

module.exports.updateTrack = function(track, infoObj, cb) {
	track.name = infoObj.name;
  //track.file_size = infoObj.file_size;
  //track.duration = infoObj.duration;
	track.number = infoObj.number;
	// track.track_raw = infoObj.track_raw;

	// If the album reference WAS NOT changed
	if (track.album === infoObj.album) {
		track.save();
		cb();
	}
	// If the album reference WAS changed (i.e. new album was linked)
	else {
		// 1) Unlink the track on the old album's side
		let query = albumModel.update(
		{
			_id: track.album
		},
		{
			$pull: { tracks_array: track._id }
		});
		query.exec(function(err) {
			if (err) {
				console.log("ERROR: cannot unlink the track from the old album.");
			}

			// 2) Link the new album on the track's side
			track.album = infoObj.album;

			// 3.1) Link the track on the new album's side
			query = albumModel.update(
			{
				_id: track.album
			},
			{
				$push: { tracks_array: track._id }
			});
			query.exec(function(err) {
				if (err) {
					console.log("ERROR: cannot link the track to the new album.");
				}
				// 3.2) Save the changes on the track's side
				track.save();
				cb();
			});
		});
	}
};

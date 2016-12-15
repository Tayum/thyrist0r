var express = require('express');
var router = express.Router();

// track MODEL MODULE
var trackModel = require('../models/trackModel');
var trackFuncs = require('../models/track');
// album MODEL MODULE
var albumModel = require('../models/albumModel');
var bandModel = require('../models/bandModel');

// CHECK whether user is authentificated MODULE
var ensureAuth = require('../public/javascripts/ensureAuth');
var ensureAuthFunc = new ensureAuth();

router.route('/')
	/* POST new track. */
	.post(ensureAuthFunc.ensureAdminAuth, function(req, res, next) {
		req.checkBody('trackNumber', 'The number of the song in album must be integer number').isInt();
		let errs = req.validationErrors();
		if (errs) {
			res.render('addTrack', {
				errors: errs
			});
		}
		else {
			let query = albumModel.findById(req.body.trackAlbum).populate('tracks_array');
			query.exec(function(err, album) {
				if (err) {
					err = new Error('Sorry, the file with contents was not found on the server.');
					err.status = 500;
					next(err);
				}
				else if (album === null) {
					let err = new Error('Sorry, there is no such album in the database.');
					err.status = 404;
					next(err);
				}
				else {
					let isExceeds = false;
					let isDuplicate = false;
					let errs = [];
					if (req.body.trackNumber > album.tracks) {
						isExceeds = true;
						errs = [{
							param: 'trackNumber',
							msg: 'There cannot be a song with such a number in this album.',
							value: req.body.trackNumber
						}];
					}
					if (!isExceeds) {
						let trackArr = album.tracks_array;
						for (let i = 0; i < trackArr.length; i++) {
							if (req.body.trackNumber == trackArr[i].number) {
								errs = [{
									param: 'trackNumber',
									msg: 'Such number of the song already exists. Delete or change the existing song first.',
									value: req.body.trackNumber
								}];
								isDuplicate = true;
								break;
							}
						}
					}
					if(isExceeds || isDuplicate) {
						res.render('addTrack', {
							errors: errs
						});
					}
					else {
						let newTrackObj = {
							name: req.body.trackName,
							// file_size: req.body.trackFile_size,
			        // duration: req.body.trackDuration,
							number: parseInt(req.body.trackNumber),
			        track_raw: req.files.trackTrack_raw.data.toString('base64'),
			        album: req.body.trackAlbum,
						};

						trackFuncs.createTrack(newTrackObj, function() {
							req.flash('success_msg', 'The track has been successfully created!');
							res.redirect('/albums/' + req.body.trackAlbum);
						});
					}
				}
			});
		}
	});

// Helping DELETE function for POST method for single track
var deleteTheTrack = function(req, res, next) {
	let trackPathId = req.params.track_id_param;

	let query = trackModel.findById(trackPathId).populate({
		path: 'album', populate: {
			path: 'band',
			model: bandModel
		}
	});

	query.exec(function(err, track) {
		if (err) {
			err = new Error('Sorry, the track cannot be removed from the database.');
			err.status = 500;
			next(err);
		}
		else if (track === null) {
			let err = new Error('Sorry, there is no such track on this site.');
			err.status = 404;
			next(err);
		}
		else {
			let albumHref = track.album._id;
			trackFuncs.deleteTrack(track);
			req.flash('success_msg', 'The track has been successfully removed!');
			res.redirect('/albums/' + albumHref);
		}
	});
};

// Helping UPDATE (PUT) function for POST methods for single track
var updateTheTrack = function(req, res, next) {
	let trackPathId = req.params.track_id_param;

	let query = trackModel.findById(trackPathId).populate({
		path: 'album', populate: {
			path: 'band',
			model: bandModel
		}
	});

	query.exec(function(err, track) {
		if (err) {
			err = new Error('Sorry, the file with contents were not found on server.');
			err.status = 500;
			next(err);
		}
		else if (track === null) {
			let err = new Error('Sorry, there is no such track on this site.');
			err.status = 404;
			next(err);
		}
		else {
      req.checkBody('trackNumber', 'The number of the song in album must be integer number').isInt();
			let errs = req.validationErrors();
			if (errs) {
				res.render('updateTrack', {
					errors: errs,
					track_url: trackPathId,
					back_url: req.header('Referer') || ('/tracks/' + track.album._id),
					thyTrack: track
				});
			}
			else {
				let query = albumModel.findById(req.body.trackAlbum).populate('tracks_array');
				query.exec(function(err, album) {
					if (err) {
						err = new Error('Sorry, the file with contents was not found on the server.');
						err.status = 500;
						next(err);
					}
					else if (album === null) {
						let err = new Error('Sorry, there is no such album in the database.');
						err.status = 404;
						next(err);
					}
					else {
						let isExceeds = false;
						let isDuplicate = false;
						let errs = [];
						if (req.body.trackNumber > album.tracks) {
							isExceeds = true;
							errs = [{
								param: 'trackNumber',
								msg: 'There cannot be a song with such a number in this album.',
								value: req.body.trackNumber
							}];
						}
						if (!isExceeds) {
							let trackArr = album.tracks_array;
							for (let i = 0; i < trackArr.length; i++) {
								if (req.body.trackNumber == trackArr[i].number) {
									errs = [{
										param: 'trackNumber',
										msg: 'Such number of the song already exists. Delete or change the existing song first.',
										value: req.body.trackNumber
									}];
									isDuplicate = true;
									break;
								}
							}
						}
						if(isExceeds || isDuplicate) {
							res.render('updateTrack', {
								errors: errs,
								track_url: trackPathId,
								back_url: req.header('Referer') || ('/tracks/' + track.album._id),
								thyTrack: track
							});
						}
						else {
							let updTrackObj = {
								name: req.body.trackName,
								// file_size: req.body.trackFile_size,
								// duration: req.body.trackDuration,
								number: req.body.trackNumber,
								// track_raw: req.body.trackTrack_raw
								album: req.body.trackAlbum,
							};

							trackFuncs.updateTrack(track, updTrackObj, function() {
								req.flash('success_msg', 'The track has been successfully updated!');
								res.redirect('/tracks/' + trackPathId);
							});
						}
					}
				});
			}
		}
	});
};

router.route('/:track_id_param')
	/* GET method: checking
	WHETHER [User wants to gain a page with POST form to perform and UPDATE method]
	OR [User simply wants to gain a page with the info of the track] */
	.get(ensureAuthFunc.ensureAuth, function(req, res, next) {
	  let trackPathId = req.params.track_id_param;
		let query = trackModel.findById(trackPathId).populate({
			path: 'album', populate: {
				path: 'band',
				model: bandModel
			}
		});
		query.exec(function(err, track) {
			if (err) {
				err = new Error('Sorry, the file with contents were not found on server.');
				err.status = 500;
				next(err);
			}
			else if (track === null) {
				let err = new Error('Sorry, there is no such track on this site.');
				err.status = 404;
				next(err);
			}
			else {
				// if the track is about to be UPDATED, render the page with the UPDATE fields
				if (req.query.q === "toUpdate") {
					res.render('updateTrack', {
						errors: null,
						track_url: trackPathId,
						back_url: req.header('Referer') || ('/tracks/' + trackPathId),
						thyTrack: track
					});
				}
				else {
					// else simply render single certain track
		      res.render('singleTrack', {
		        img_path: '/images/albums/' + track.album._id + '/logo.jpg',
						track_url: trackPathId,
						back_url: req.header('Referer') || ('/albums/' + track.album._id),
						track: track
		      });
				}
			}
		});
	})
	/* POST method: checking
	WHETHER [UPDATE or DELETE button was pressed]
	OR [the info about some track was UPDATED] */
	.post(ensureAuthFunc.ensureAdminAuth, function(req, res, next) {
		let thyQuery = req.query.q;
		// DELETE button was pressed
		if (thyQuery === "delete") {
			deleteTheTrack(req, res, next);
		}
		// UPDATE button was pressed
		else if (thyQuery === "update") {
			res.redirect(req.params.track_id_param + "?q=toUpdate");
		}
		// the track has been UPDATED
		else if (req.query.q === "isUpdated") {
			updateTheTrack(req, res, next);
		}
		// None of cases above (nothing special)?
		// Simply redirect the user to the page with the info of the track
		else {
			res.redirect(req.params.track_id_param);
		}
	});


module.exports = router;

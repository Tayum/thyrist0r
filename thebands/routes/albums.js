var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
// required for deleting the folder containing files (synchronously)
var rimraf = require('rimraf');

// album MODEL MODULE
var albumModel = require('../models/album');

// CHECK whether user is authentificated MODULE
var ensureAuth = require('../public/javascripts/ensureAuth');
var ensureAuthFunc = new ensureAuth();

router.route('/')
	/* GET albums listing (pagination included). */
	.get(ensureAuthFunc.ensureAuth, function(req, res, next) {
		if (req.originalUrl === '/albums/') {
			res.redirect('/albums');
		}
		else {
			let query = albumModel.count();
			query.exec(function(err, amount) {
				if (err) {
					err = new Error('Sorry, the file with contents were not found on server.');
					err.status = 500;
					next(err);
				}
				// None albums are in database
				else if (amount <= 0) {
					res.render('albums', {
						curPage: 1,
						maxPage: 1,
						arr: [],
						search_value: ""
					});
				}
				else {
					let search_value = req.query.albumName;
					// If search field is empty - assign search_value to ""
					if(search_value === null ||
						 search_value === undefined)
					{
						search_value = "";
					}
					// Receive amount of albums that meet criteria
					query = albumModel.count({
						// search (case insensitive) partial match
						name: { "$regex": search_value, "$options": "i" }
					});
					query.exec(function(err, amount) {
						if(err) {
							err = new Error('Sorry, the file with contents were not found on server.');
							err.status = 500;
							next(err);
						}
						else {
							// if amount equals 0, notify the user about it
							if (amount === 0) {
								req.flash('error_msg', 'Nothing was found :(');
								res.redirect('/albums');
							}
							else {
								let pageNumber = req.query.page;
								req.checkQuery('page', 'Page is required').notEmpty();
								if (!search_value) {
									req.checkQuery('page', 'Page should lay in proper bounds (from 1 to ' + parseInt((amount-1)/4 + 1) + ' at the moment).').isInt({ min: 1, max: parseInt((amount-1)/4 + 1) });
								}
								else {
									req.checkQuery('page', 'Page should lay in proper bounds (from 1 to ' + parseInt((amount-1)/4 + 1) + ' for this query).').isInt({ min: 1, max: parseInt((amount-1)/4 + 1) });
								}
								let errs = req.validationErrors();
								// If page is set improperly
								if (errs.length === 1) {
									req.flash('error_msg', errs[0].msg);
									// If the search field was empty: redirect to /bands
									if (!search_value) {
										res.redirect('/albums');
									}
									// If the search field was not empty: redirect to /albums with search field that was set previously
									else {
										res.redirect('/albums?albumName=' + search_value);
									}
								}
								// If page is not set at all: set is on default (1)
								else {
									if (errs.length === 2) {
										pageNumber = 1;
									}
									query = albumModel.find({
										// search (case insensitive) partial match
										name: { "$regex": search_value, "$options": "i" }
									}).limit(4).skip(4 * (pageNumber - 1)).lean();
									query.exec(function(err, albums) {
										if (err) {
											err = new Error('Sorry, the file with contents were not found on server.');
											err.status = 500;
											next(err);
										}
										else {
											let arr = [];
											let albumList = albums;
											for (let i = 0; i < albumList.length; i++) {
												let thyAlbum = albumList[i];
												arr.push({
													title: thyAlbum.name,
													href: 'albums/' + thyAlbum._id,
													alt: thyAlbum.name + '_logo',
													img_path: 'images/albums/' + thyAlbum._id + '/logo.jpg'
												});
											}
											res.render('albums', {
												curPage: pageNumber,
												maxPage: parseInt((amount-1)/4 + 1),
												arr: arr,
												search_value: search_value
											});
										}
									});
								}
							}
						}
					});
				}
			});
		}
	})
	/* POST new album. */
	.post(ensureAuthFunc.ensureAdminAuth, function(req, res, next) {
		req.checkBody('albumTracks', 'Tracks field must be integer number').isInt();
		let errs = req.validationErrors();
		if (errs) {
			res.render('addAlbum', {
				errors: errs
			});
		}
		else {
			let newAlbum = new albumModel({
				name: req.body.albumName,
				rls_date: req.body.albumRls_date,
				genre: req.body.albumGenre,
				tracks: req.body.albumTracks,
        // @TODO
        // tracks_array: [],
        // @TODO is it right?
        band: req.body.albumBand
			});
			console.log("NEW CREATED ALBUM:\n" + newAlbum);
			newBand.save(function(err, album) {
				if (err) {
					err = new Error('Sorry, the band cannot be saved to the database.');
					err.status = 500;
					next(err);
				}
				else {
					// Create a directory (with a unique name - '_id') for the certain object
					// and place the passed image there
					let dir = 'public/images/albums/' + album._id;
			    fs.mkdir(dir, function() {
						fs.writeFile(dir + '/logo.jpg', req.files.albumLogo.data);
					});
					req.flash('success_msg', 'The album has been successfully created!');
					res.redirect('/albums');
				}
			});
		}
	});

// Helping DELETE function for POST method for single album
var deleteTheAlbum = function(req, res, next) {
	let albumPathId = req.params.album_id_param;

	let query = albumModel.findById(albumPathId);

	query.exec(function(err, album) {
		if (err) {
			err = new Error('Sorry, the band cannot be removed from the database.');
			err.status = 500;
			next(err);
		}
		else if (album === null) {
			let err = new Error('Sorry, there is no such album on this site.');
			err.status = 404;
			next(err);
		}
		else {
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
			req.flash('success_msg', 'The album has been successfully removed!');
			res.redirect('/albums');
		}
	});
};

// Helping UPDATE (PUT) function for POST methods for single album
var updateTheAlbum = function(req, res, next) {
	let albumPathId = req.params.album_id_param;

	let query = albumModel.findById(albumPathId);

	query.exec(function(err, album) {
		if (err) {
			err = new Error('Sorry, the file with contents were not found on server.');
			err.status = 500;
			next(err);
		}
		else if (album === null) {
			let err = new Error('Sorry, there is no such album on this site.');
			err.status = 404;
			next(err);
		}
		else {
      req.checkBody('albumTracks', 'Tracks field must be integer number').isInt();
			let errs = req.validationErrors();
			if (errs) {
				res.render('updateAlbum', {
					errors: errs,
					album_url: albumPathId,
					back_url: req.header('Referer') || '/albums',
					thyAlbum: album
				});
			}
			else {
				let isUpdated = false;
				if (req.body.albumName !== album.name) {
					album.name = req.body.albumName;
					isUpdated = true;
				}
				if (req.body.albumRls_date !== album.albumRls_date) {
					album.albumRls_date = req.body.albumRls_date;
					isUpdated = true;
				}
				if (req.body.albumGenre !== album.genre) {
					album.genre = req.body.albumGenre;
					isUpdated = true;
				}
				if (parseInt(req.body.albumTracks) !== album.tracks) {
					album.tracks = parseInt(req.body.albumTracks);
					isUpdated = true;
				}
        // @TODO
        // add tracks_array?
        // @TODO
        // Is it working like this?
				if (req.body.albumBand !== album.band) {
					album.band = req.body.albumBand;
					isUpdated = true;
				}
        // if some info has been changed, render the successful UPDATE notification page
				if (isUpdated) {
					album.save();
					req.flash('success_msg', 'The album has been successfully updated!');
					res.redirect('/albums/' + albumPathId);
				}
				else {
					req.flash('error_msg', 'The album not been updated. No changes were made.');
					res.redirect('/albums/' + albumPathId);
				}
			}
		}
	});
};

router.route('/:album_id_param')
	/* GET method: checking
	WHETHER [User wants to gain a page with POST form to perform and UPDATE method]
	OR [User simply wants to gain a page with the info of the album] */
	.get(ensureAuthFunc.ensureAuth, function(req, res, next) {
	  let albumPathId = req.params.album_id_param;

		let query = albumModel.findById(albumPathId);

		query.exec(function(err, album) {
			if (err) {
				err = new Error('Sorry, the file with contents were not found on server.');
				err.status = 500;
				next(err);
			}
			else if (album === null) {
				let err = new Error('Sorry, there is no such album on this site.');
				err.status = 404;
				next(err);
			}
			else {
				// if the album is about to be UPDATED, render the page with the UPDATE fields
				if (req.query.q === "toUpdate") {
					res.render('updateAlbum', {
						errors: null,
						album_url: albumPathId,
						back_url: req.header('Referer') || '/albums',
						thyAlbum: album
					});
				}
				else {
					// else simply render single certain album
		      res.render('singleAlbum', {
		        img_path: '/images/albums/' + album._id + '/logo.jpg',
						album_url: albumPathId,
						back_url: req.header('Referer') || '/albums',
						album: album
		      });
				}
			}
		});
	})
	/* POST method: checking
	WHETHER [UPDATE or DELETE button was pressed]
	OR [the info about some album was UPDATED] */
	.post(ensureAuthFunc.ensureAdminAuth, function(req, res, next) {
		let thyQuery = req.query.q;
		// DELETE button was pressed
		if (thyQuery === "delete") {
			deleteTheAlbum(req, res, next);
		}
		// UPDATE button was pressed
		else if (thyQuery === "update") {
			res.redirect(req.params.album_id_param + "?q=toUpdate");
		}
		// the album has been UPDATED
		else if (req.query.q === "isUpdated") {
			updateTheAlbum(req, res, next);
		}
		// None of cases above (nothing special)?
		// Simply redirect the user to the page with the info of the album
		else {
			res.redirect(req.params.album_id_param);
		}
	});


module.exports = router;

var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');

// csrfProtection
var csrf = require('csurf');
var csrfProtection = csrf({ cookie: true });

// band MODEL MODULE
var bandModel = require('../models/bandModel');
var bandFuncs = require('../models/band');

// CHECK whether user is authentificated MODULE
var ensureAuth = require('../public/javascripts/ensureAuth');
var ensureAuthFunc = new ensureAuth();

router.route('/')
	/* GET bands listing (pagination included). */
	.get(csrfProtection, ensureAuthFunc.ensureAuth, function(req, res, next) {
		if (req.originalUrl === '/bands/') {
			res.redirect('/bands');
		}
		else {
			let query = bandModel.count();
			query.exec(function(err, amount) {
				if (err) {
					err = new Error('Sorry, the file with contents were not found on server.');
					err.status = 500;
					next(err);
				}
				// None bands are in database
				else if (amount <= 0) {
					res.render('bands', {
						csrfToken: req.csrfToken(),
						curPage: 1,
						maxPage: 1,
						arr: [],
						search_value: ""
					});
				}
				else {
					let search_value = req.query.bandName;
					// If search field is empty - assign search_value to ""
					if(search_value === null ||
						 search_value === undefined)
					{
						search_value = "";
					}
					// Receive amount of bands that meet criteria
					query = bandModel.count({
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
								res.redirect('/bands');
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
										res.redirect('/bands');
									}
									// If the search field was not empty: redirect to /bands with search field that was set previously
									else {
										res.redirect('/bands?bandName=' + search_value);
									}
								}
								// If page is not set at all: set is on default (1)
								else {
									if (errs.length === 2) {
										pageNumber = 1;
									}
									query = bandModel.find({
										// search (case insensitive) partial match
										name: { "$regex": search_value, "$options": "i" }
									}).limit(4).skip(4 * (pageNumber - 1)).lean();
									query.exec(function(err, bands) {
										if (err) {
											err = new Error('Sorry, the file with contents were not found on server.');
											err.status = 500;
											next(err);
										}
										else {
											res.render('bands', {
										    csrfToken: req.csrfToken(),
												curPage: pageNumber,
												maxPage: parseInt((amount-1)/4 + 1),
												arr: bands,
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
	/* POST new band. */
	.post(ensureAuthFunc.ensureAdminAuth, function(req, res, next) {
		req.checkBody('bandMembers', 'Members field must be integer number').isInt();
		req.checkBody('bandAlbums', 'Albums field must be integer number').isInt();
		let errs = req.validationErrors();
		if (errs) {
			res.render('addBand', {
				errors: errs
			});
		}
		else {
			let bandLogo = "";
			if (req.files && req.files.bandLogo && req.files.bandLogo.data) {
				bandLogo = req.files.bandLogo.data;
			}
			let bandMembersLogo = "";
			if (req.files && req.files.bandMembersLogo && req.files.bandMembersLogo.data) {
				bandMembersLogo = req.files.bandMembersLogo.data;
			}
			let newBand = new bandModel({
				name: req.body.bandName,
				formed: req.body.bandFormed,
				members: req.body.bandMembers,
				genre: req.body.bandGenre,
				albums: req.body.bandAlbums,
				logo: bandLogo,
				members_logo: bandMembersLogo,
				albums_array: [],
				description: req.body.bandDescription || ""
			});
			newBand.save(function(err, band) {
				if (err) {
					err = new Error('Sorry, the band cannot be saved to the database.');
					err.status = 500;
					next(err);
				}
				else {
					req.flash('success_msg', 'The band has been successfully created!');
					res.redirect('/bands');
				}
			});
		}
	});

// Helping DELETE function for POST method for single band
var deleteTheBand = function(req, res, next) {
	let bandPathId = req.params.band_id_param;

	let query = bandModel.findById(bandPathId).populate('albums_array');

	query.exec(function(err, band) {
		if (err) {
			err = new Error('Sorry, the band cannot be removed from the database.');
			err.status = 500;
			next(err);
		}
		else if (band === null) {
			let err = new Error('Sorry, there is no such band on this site.');
			err.status = 404;
			next(err);
		}
		else {
			bandFuncs.deleteBand(band);
			req.flash('success_msg', 'The band has been successfully removed!');
			res.redirect('/bands');
		}
	});
};

// Helping UPDATE (PUT) function for POST methods for single band
var updateTheBand = function(req, res, next) {
	let bandPathId = req.params.band_id_param;

	let query = bandModel.findById(bandPathId).populate('albums_array');
	query.exec(function(err, band) {
		if (err) {
			err = new Error('Sorry, the file with contents were not found on server.');
			err.status = 500;
			next(err);
		}
		else if (band === null) {
			let err = new Error('Sorry, there is no such band on this site.');
			err.status = 404;
			next(err);
		}
		else {
			req.checkBody('bandMembers', 'Members field must be integer number').isInt();
			req.checkBody('bandAlbums', 'Albums field must be integer number').isInt();
			let errs = req.validationErrors();
			if (errs) {
				res.render('updateBand', {
					csrfToken: req.csrfToken(),
					errors: errs,
					band_url: bandPathId,
					back_url: req.header('Referer') || '/bands',
					thyBand: band
				});
			}
			else {
				band.name = req.body.bandName;
				band.formed = req.body.bandFormed;
				band.members = parseInt(req.body.bandMembers);
				band.genre = req.body.bandGenre;
				band.albums = parseInt(req.body.bandAlbums);
				band.description = req.body.bandDescription;

				band.save();
				req.flash('success_msg', 'The band has been successfully updated!');
				res.redirect('/bands/' + bandPathId);
			}
		}
	});
};

router.route('/:band_id_param')
	/* GET method: checking
	WHETHER [User wants to gain a page with POST form to perform and UPDATE method]
	OR [User simply wants to gain a page with the info of the band] */
	.get(csrfProtection, ensureAuthFunc.ensureAuth, function(req, res, next) {
	  let bandPathId = req.params.band_id_param;

		let query = bandModel.findById(bandPathId).populate('albums_array');

		query.exec(function(err, band) {
			if (err) {
				err = new Error('Sorry, the file with contents were not found on server.');
				err.status = 500;
				next(err);
			}
			else if (band === null) {
				let err = new Error('Sorry, there is no such band on this site.');
				err.status = 404;
				next(err);
			}
			else {
				// if the band is about to be UPDATED, render the page with the UPDATE fields
				if (req.query.q === "toUpdate") {
					res.render('updateBand', {
					  csrfToken: req.csrfToken(),
						errors: null,
						band_url: bandPathId,
						back_url: req.header('Referer') || '/bands',
						thyBand: band
					});
				}
				else {
					// else simply render single certain band
		      res.render('singleBand', {
		        img_path: '/images/bands/' + band._id + '/members.jpg',
						band_url: bandPathId,
						back_url: req.header('Referer') || '/bands',
						band: band
		      });
				}
			}
		});
	})
	/* POST method: checking
	WHETHER [UPDATE or DELETE button was pressed]
	OR [the info about some band was UPDATED] */
	.post(ensureAuthFunc.ensureAdminAuth, function(req, res, next) {
		let thyQuery = req.query.q;
		// DELETE button was pressed
		if (thyQuery === "delete") {
			deleteTheBand(req, res, next);
		}
		// UPDATE button was pressed
		else if (thyQuery === "update") {
			res.redirect(req.params.band_id_param + "?q=toUpdate");
		}
		// the band has been UPDATED
		else if (req.query.q === "isUpdated") {
			updateTheBand(req, res, next);
		}
		// None of cases above (nothing special)?
		// Simply redirect the user to the page with the info of the band
		else {
			res.redirect(req.params.band_id_param);
		}
	});


module.exports = router;

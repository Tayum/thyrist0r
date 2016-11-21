var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
// required for deleting the folder containing files (synchronously)
var rimraf = require('rimraf');

// band MODEL MODULE
var bandModel = require('../models/band');

// CHECK whether user is authentificated MODULE
var ensureAuth = require('../public/javascripts/ensureAuth');
var ensureAuthFunc = new ensureAuth();

router.route('/')
	/* GET bands listing. */
	.get(ensureAuthFunc.ensureAuth, function(req, res, next) {
		if (req.originalUrl === '/bands/') {
			res.redirect('/bands');
		}
		else {
			let query = null;
			let search_field_value = "";
			if(req.query.bandName === undefined ||
		     req.query.bandName === null)
			{
				query = bandModel.find().lean();
			}
			else {
				search_field_value = req.query.bandName;
				query = bandModel.find({
					// search (case insensitive) partial match
					name: { "$regex": req.query.bandName, "$options": "i" }
				}).lean();
			}
			let arr = [];
			query.exec(function(err, bands) {
				if (err) {
					err = new Error('Sorry, the file with contents were not found on server.');
					err.status = 500;
					next(err);
				}
				else {
					let bandList = bands;
					for (let i = 0; i < bandList.length; i++) {
						let thyBand = bandList[i];
						arr.push({
							title: thyBand.name,
							href: 'bands/' + thyBand._id,
							alt: thyBand.name + '_logo',
							img_path: 'images/' + thyBand._id + '/logo.jpg'
						});
					}
					if (arr.length === 0) {
						// if no bands were found - render a special page with "Nothing Found!" notification
						res.render('infoAndBack', {
							title: 'Band Search',
							operation_title: "Nothing found!",
							operation_description: "No bands were found by \"" + search_field_value + "\" name.",
							back_button_href: "/bands",
							back_button_desc: "Return to the list of bands"
						});
					}
					else {
						res.render('bands', {
							arr: arr,
							search_value: search_field_value
						});
					}
				}
			});
		}
	})
	/* POST new band. */
	.post(ensureAuthFunc.ensureAuth, function(req, res, next) {
		req.checkBody('bandName', 'Name field is required').notEmpty();
		req.checkBody('bandFormed', 'Formed field is required').notEmpty();
		req.checkBody('bandMembers', 'Members field is required').notEmpty();
		req.checkBody('bandMembers', 'Members field must be integer number').isInt();
		req.checkBody('bandGenre', 'Genre field is required').notEmpty();
		req.checkBody('bandAlbums', 'Albums field is required').notEmpty();
		req.checkBody('bandAlbums', 'Albums field must be integer number').isInt();
		let errs = req.validationErrors();
		if (errs) {
			res.render('addBand', {
				errors: errs
			});
		}
		else {
			let newBand = new bandModel({
				name: req.body.bandName,
				formed: req.body.bandFormed,
				members: req.body.bandMembers,
				genre: req.body.bandGenre,
				albums: req.body.bandAlbums
			});
			console.log("NEW CREATED BAND:\n" + newBand);
			newBand.save(function(err, band) {
				if (err) {
					err = new Error('Sorry, the band cannot be saved to the database.');
					err.status = 500;
					next(err);
				}
				else {
					// Create a directory (with a unique name - '_id') for the certain object
					// and place the passed images there
					let dir = 'public/images/' + band._id;
			    fs.mkdir(dir, function() {
						fs.writeFile(dir + '/logo.jpg', req.files.bandLogo.data);
						fs.writeFile(dir + '/members.jpg', req.files.bandMembers.data);
					});
					req.flash('success_msg', 'The band has been successfully created!');
					res.redirect('/bands');
				}
			});
		}
	});

// Helping DELETE function for POST method for single band
var deleteTheBand = function(req, res, next) {
	let bandPathId = req.params.band_id_param;

	let query = bandModel.findById(bandPathId);

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
			let dir = 'public/images/' + band._id;
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
			req.flash('success_msg', 'The band has been successfully removed!');
			res.redirect('/bands');
		}
	});
};

// Helping UPDATE (PUT) function for POST methods for single band
var updateTheBand = function(req, res, next) {
	let bandPathId = req.params.band_id_param;

	let query = bandModel.findById(bandPathId);

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
			req.checkBody('bandName', 'Name field is required').notEmpty();
			req.checkBody('bandFormed', 'Formed field is required').notEmpty();
			req.checkBody('bandMembers', 'Members field is required').notEmpty();
			req.checkBody('bandMembers', 'Members field must be integer number').isInt();
			req.checkBody('bandGenre', 'Genre field is required').notEmpty();
			req.checkBody('bandAlbums', 'Albums field is required').notEmpty();
			req.checkBody('bandAlbums', 'Albums field must be integer number').isInt();
			let errs = req.validationErrors();
			if (errs) {
				res.render('updateBand', {
					errors: errs,
					band_url: bandPathId,
					thyBand: band
				});
			}
			else {
				let isUpdated = false;
				if (req.body.bandName !== band.name) {
					band.name = req.body.bandName;
					isUpdated = true;
				}
				if (req.body.bandFormed !== band.formed) {
					band.formed = req.body.bandFormed;
					isUpdated = true;
				}
				if (parseInt(req.body.bandMembers) !== band.members) {
					band.members = parseInt(req.body.bandMembers);
					isUpdated = true;
				}
				if (req.body.bandGenre !== band.genre) {
					band.genre = req.body.bandGenre;
					isUpdated = true;
				}
				if (parseInt(req.body.bandAlbums) !== band.albums) {
					band.albums = parseInt(req.body.bandAlbums);
					isUpdated = true;
				}
        // if some info has been changed, render the successful UPDATE notification page
				if (isUpdated) {
					band.save();
					req.flash('success_msg', 'The band has been successfully updated!');
					res.redirect('/bands/' + bandPathId);
				}
				else {
					req.flash('error_msg', 'The band not been updated. No changes were made.');
					res.redirect('/bands/' + bandPathId);
				}
			}
		}
	});
};

router.route('/:band_id_param')
	/* GET method: checking
	WHETHER [User wants to gain a page with POST form to perform and UPDATE method]
	OR [User simply wants to gain a page with the info of the band] */
	.get(ensureAuthFunc.ensureAuth, function(req, res, next) {
	  let bandPathId = req.params.band_id_param;

		let query = bandModel.findById(bandPathId);

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
						errors: null,
						band_url: bandPathId,
						thyBand: band
					});
				}
				else {
					// else simply render single certain band
		      res.render('singleBand', {
		        page_title: band.name,
		        img_alt: band.name + '_members',
		        img_path: '/images/' + band._id + '/members.jpg',
		        name: band.name,
						band_url: bandPathId,
		        desc: 'is ' + band.genre + ' genre band, formed on ' + band.formed + '. Consists of ' + band.members + ' members at the moment. The band has published ' + band.albums + ' albums so far.'
		      });
				}
			}
		});
	})
	/* POST method: checking
	WHETHER [UPDATE or DELETE button was pressed]
	OR [the info about some band was UPDATED] */
	.post(ensureAuthFunc.ensureAuth, function(req, res, next) {
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

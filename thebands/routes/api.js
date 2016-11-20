var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
// required for deleting the folder containing files (synchronously)
var rimraf = require('rimraf');

// band MODEL MODULE
var bandModel = require('../models/band');

router.route('/bands')
  /* GET bands (by pagination). */
  .get(function(req, res, next) {
    if (req.originalUrl === '/bands/') {
      res.redirect('/bands');
    }
    else {
      let query = bandModel.count();
      query.exec(function(err, amount) {
        if (err) {
          res.send('Sorry, the file with contents were not found on server.');
          res.end();
        }
        else if (amount <= 0) {
          res.send('[]');
          res.end();
        }
        else {
          req.checkQuery('page', 'Page should lay in proper bounds (from 1 to ' + parseInt(amount/4 + 1) + ' at the moment).').isInt({ min: 1, max: parseInt(amount/4 + 1) });
          let errs = req.validationErrors();
          if (errs) {
            let arr = [];
            for (let i = 0; i < errs.length; i++) {
              arr.push(errs[i].msg);
            }
            res.send("Cannot GET the bands. Reason: \n" + arr.join(', '));
            res.end();
          }
          else {
            query = bandModel.find().limit(4).skip(4*(parseInt(req.query.page)-1)).lean();
            query.exec(function(err, bands) {
              if (err) {
                res.send('Sorry, the file with contents were not found on server.');
                res.end();
              }
              else {
                console.log("SENT THE NEXT INFO: " + bands);
                res.send(bands);
                res.end();
              }
            });
          }
        }
      });
    }
  })
  /* POST new band. */
	.post(function(req, res, next) {
    req.checkBody('bandName', 'Name field is required').notEmpty();
    req.checkBody('bandFormed', 'Formed field is required').notEmpty();
    req.checkBody('bandMembers', 'Members field is required').notEmpty();
    req.checkBody('bandMembers', 'Members field must be integer number').isInt();
    req.checkBody('bandGenre', 'Genre field is required').notEmpty();
    req.checkBody('bandAlbums', 'Albums field is required').notEmpty();
    req.checkBody('bandAlbums', 'Albums field must be integer number').isInt();
    let errs = req.validationErrors();
    if (errs) {
      let arr = [];
      for (let i = 0; i < errs.length; i++) {
        arr.push(errs[i].msg);
      }
      res.send("New band has not been created. Reason: \n" + arr.join(', '));
      res.end();
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
          res.send('Sorry, the band cannot be saved to the database.');
          res.end();
        }
        else {
          // Create a directory (with a unique name - '_id') for the certain object
          // and place the passed images there
          let dir = 'public/images/' + band._id;
          fs.mkdir(dir, function() {
            fs.writeFile(dir + '/logo.jpg', "");
            fs.writeFile(dir + '/members.jpg', "");
          });
          res.send("New band has been created, thank you");
          res.end();
        }
      });
    }
  });

  router.route('/filterBands')
    /* GET filtered bands. */
    .get(function(req, res, next) {
      if (req.originalUrl === '/filterBands/') {
        res.redirect('/filterBands');
      }
      let queryObject = {};
      if (req.query.bandName) {
        queryObject.name = req.query.bandName;
      }
      if (req.query.bandFormed) {
        queryObject.formed = req.query.bandFormed;
      }
      if (req.query.bandMembers) {
        queryObject.members = req.query.bandMembers;
      }
      if (req.query.bandGenre) {
        queryObject.genre = req.query.bandGenre;
      }
      if (req.query.bandAlbums) {
        queryObject.albums = req.query.bandAlbums;
      }
      let query = bandModel.find(queryObject).lean();
      query.exec(function(err, bands) {
        if (err) {
          res.send('Sorry, the file with contents were not found on server.');
          res.end();
        }
        else {
          console.log("SENT THE NEXT INFO: " + bands);
          res.send(bands);
          res.end();
        }
      });
    });

  router.route('/bands/:band_id_param')
  /* GET single certain band. */
	.get(function(req, res, next) {
	  let bandPathId = req.params.band_id_param;

		let query = bandModel.findById(bandPathId);

		query.exec(function(err, band) {
			if (err) {
        res.send('Sorry, the file with contents were not found on server.');
        res.end();
			}
			else if (band === null) {
        res.send('Sorry, there is no such a band in the database.');
        res.end();
			}
			else {
        console.log("SENT THE NEXT INFO: " + band);
	      res.send(band);
        res.end();
			}
		});
	})
  /* UPDATE single band. */
  .put(function(req, res, next) {
    let bandPathId = req.params.band_id_param;

    let query = bandModel.findOne({
      '_id': bandPathId
    });

    query.exec(function(err, band) {
      if (err) {
        res.send('Sorry, the band cannot be updated.');
        res.end();
      }
      else if (band === null) {
        res.send('Sorry, there is no such a band in the database.');
        res.end();
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
          let arr = [];
          for (let i = 0; i < errs.length; i++) {
            arr.push(errs[i].msg);
          }
          res.send("The band cannot be updated. Reason:\n" + arr.join(', '));
          res.end();
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
          // if some info has been changed, send the successful UPDATE notification text
          if (isUpdated) {
            band.save();
            res.send("The band has been successfully updated.");
            res.end();
          }
          else {
            res.send("The band has not been updated. Reason:\nNo changes were made.");
            res.end();
          }
        }
      }
    });
  })
  /* DELETE single band. */
  .delete(function(req, res, next) {
    let bandPathId = req.params.band_id_param;

    let query = bandModel.findById(bandPathId);

    query.exec(function(err, band) {
      if (err) {
        res.send('Sorry, the band cannot be removed from the database.');
        res.end();
      }
      else if (band === null) {
        res.send('Sorry, there is no such a band in the database.');
        res.end();
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
        res.send("The band has been successfully removed.");
        res.end();
      }
    });
  });


module.exports = router;

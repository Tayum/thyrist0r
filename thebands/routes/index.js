var express = require('express');
var router = express.Router();

// csrfProtection
var csrf = require('csurf');
var csrfProtection = csrf({ cookie: true });

// CHECK whether user is authentificated MODULE
var ensureAuth = require('../public/javascripts/ensureAuth');
var ensureAuthFunc = new ensureAuth();

router.route('/')
  /* GET home page. */
  .get(function(req, res, next) {
    res.render('index');
  });

router.route('/about')
  /* GET about page. */
  .get(function(req, res, next) {
    if (req.originalUrl === '/about/') {
      res.redirect('/about');
    }
    res.render('about');
  });

router.route('/addband')
  /* GET the page with the POST form of creating the new band. */
  .get(csrfProtection, ensureAuthFunc.ensureAdminAuth, function(req, res, next) {
    res.render('addBand', {
      csrfToken: req.csrfToken(),
      errors: null
    });
  });

router.route('/addalbum')
  /* GET the page with the POST form of creating the new album. */
  .get(csrfProtection, ensureAuthFunc.ensureAdminAuth, function(req, res, next) {
    res.render('addAlbum', {
      csrfToken: req.csrfToken(),
      errors: null
    });
  });

router.route('/addtrack')
  /* GET the page with the POST form of creating the new track. */
  .get(csrfProtection, ensureAuthFunc.ensureAdminAuth, function(req, res, next) {
    res.render('addTrack', {
      csrfToken: req.csrfToken(),
      errors: null
    });
  });

module.exports = router;

var express = require('express');
var router = express.Router();

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
  .get(ensureAuthFunc.ensureAdminAuth, function(req, res, next) {
    res.render('addBand', {
      errors: null
    });
  });

module.exports = router;

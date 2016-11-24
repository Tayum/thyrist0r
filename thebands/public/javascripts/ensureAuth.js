var express = require('express');

function ensureAuthModule() {
  this.ensureAuth = function(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    else {
      req.flash('error_msg', 'You have to login to view that page!');
      res.redirect('/users/login');
    }
  };
  this.ensureAdminAuth = function(req, res, next) {
    if (req.isAuthenticated() && req.user.access_level === 10) {
      return next();
    }
    else {
      req.flash('error_msg', 'You need to have admin rights to access that page!');
      res.redirect('/');
    }
  };
}

module.exports = ensureAuthModule;

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
}

module.exports = ensureAuthModule;

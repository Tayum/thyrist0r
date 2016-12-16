var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

// csrfProtection
var csrf = require('csurf');
var csrfProtection = csrf({ cookie: true });

// User MODEL MODULE
var userModel = require('../models/user');

// CHECK whether user is authentificated MODULE
var ensureAuth = require('../public/javascripts/ensureAuth');
var ensureAuthFunc = new ensureAuth();

router.route('/')
  /* GET the list of Users (just for admin) */
  .get(ensureAuthFunc.ensureAdminAuth, function(req, res, next) {
    // Admin requests this page (with all users (pagination included))
    userModel.getAmount(function(err, amount) {
      if (err) {
        err = new Error('Sorry, cannot receive the amount of users.');
        err.status = 500;
        next(err);
      }
      else {
        let pageNumber = req.query.page;
        req.checkQuery('page', 'Page is required').notEmpty();
        req.checkQuery('page', 'Page should lay in proper bounds (from 1 to ' + parseInt((amount-1)/20 + 1) + ')').isInt({ min: 1, max: parseInt((amount-1)/20 + 1) });
        let errs = req.validationErrors();
        // If page is set improperly
        if (errs.length === 1) {
          req.flash('error_msg', errs[0].msg);
          res.redirect('/users');
        }
        // If page is not set at all: set is on default (1)
        else {
          if (errs.length === 2) {
            pageNumber = 1;
          }
          userModel.getAllUsers(pageNumber, function(err, users) {
            if (err) {
              err = new Error('Sorry, cannot GET all the users.');
              err.status = 500;
              next(err);
            }
            else {
              let arr = [];
              for (let i = 0; i < users.length; i++) {
                arr.push({
                  access_level: users[i].access_level,
                  name: users[i].name,
                  email: users[i].email,
                  username: users[i].username,
                  img_path: '/images/users/' + users[i]._id + '/avatar.jpg',
                  href: '/users/profile/' + users[i].username
                });
              }
              res.render('users', {
                curPage: pageNumber,
                maxPage: parseInt((amount-1)/20 + 1),
                arr: arr
              });
            }
          });
        }
      }
    });
  });

router.route('/register')
  /* GET register page. */
  .get(csrfProtection, function(req, res, next) {
    if (req.originalUrl === '/register/') {
      res.redirect('/register');
    }
    // if the user is already authorised - redirect to home page
    if (req.user) {
      res.redirect('back');
    }
    res.render('register', {
      csrfToken: req.csrfToken(),
      errors: null
    });
  })
  /* Registration. */
  .post(csrfProtection, function(req, res, next) {
    // Validate all the fields
    req.checkBody('email', 'Email is not valid').isEmail();
    req.checkBody('repassword', 'Passwords do not match').equals(req.body.password);
    let errs = req.validationErrors();
    if (errs) {
      res.render('register', {
        csrfToken: req.csrfToken(),
        errors: errs
      });
    }
    else {
      userModel.getUserByUsername(req.body.username.trim(), function (err, user) {
        if (err) {
          err = new Error('Sorry, cannot GET the user by such a username.');
          err.status = 500;
          next(err);
        }
        else {
          if (!user) {
            let newUser = new userModel({
              // adding with common acces level (simply 'authorised user')
              access_level: 1,
              name: req.body.name,
              email: req.body.email,
              username: req.body.username.trim(),
              password: req.body.password
            });

            userModel.createUser(newUser, function(err, user) {
              if (err) {
                err = new Error('Sorry, the new user cannot be created.');
                err.status = 500;
                next(err);
              }
              else {
                console.log("NEW USER CREATED: " + user);
                req.flash('success_msg', 'Registration complete!');
                res.redirect('/users/login');
              }
            });
          }
          else {
            req.flash('error_msg', 'The user with such a username already exists.');
            res.redirect('/users/register');
          }
        }
      });
    }
  });

// Passport Strategy
passport.use(new LocalStrategy(
  function(username, password, done) {
    userModel.getUserByUsername(username, function(err, user) {
      if (err) {
        console.log("ERROR has been thrown while getting user by username.");
        throw err;
      }
      else if(!user) {
        return done(null, false, { message: 'There is no such an user in the database' });
      }

      userModel.comparePassword(password, user.password, function(err, isMatch) {
        if (err) {
          console.log("ERROR has been thrown while comparing passwords (USERS.JS).");
          throw err;
        }
        else if (isMatch) {
          return done(null, user);
        }
        else {
          return done(null, false, { message: 'Invalid password' });
        }
      });
    });
  }
));

passport.serializeUser(function(user, done) {
  console.log("serializerUser function called");
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  console.log("deserializeUser function called");
  userModel.getUserById(id, function(err, user) {
    done(err, user);
  });
});

router.route('/login')
    /* GET login page. */
  .get(csrfProtection, function(req, res, next) {
    // if the user is already authorised - redirect to home page
    if (req.user) {
      res.redirect('back');
    }
    if (req.originalUrl === '/login/') {
      res.redirect('/login');
    }
    res.render('login', {
      csrfToken: req.csrfToken(),
    });
  })
  /* Try to authentificate. */
  // res.cookie('thyCookie', user.id, { maxAge: 2592000000 })
  .post(
    passport.authenticate('local', { successRedirect: '/', failureRedirect: '/users/login', failureFlash: true }),
    function(req, res, next) {
      res.redirect('/');
    });

router.route('/logout')
  /* Logout. */
  // res.clearCookie('thyCookie'),
  .get(function(req, res, next) {
    if (req.originalUrl === '/logout/') {
      res.redirect('/logout');
    }
    // if the user was not authorised - nothing will happen
    if (req.user) {
      req.logout();
      req.flash('success_msg', 'You were successfully logged out.');
    }
    res.redirect('/users/login');
  });

router.route('/profile/:user_username_param')
  /* GET profile page. */
  .get(csrfProtection, ensureAuthFunc.ensureAuth, function(req, res, next) {
    let userPathUsername = req.params.user_username_param;
    userModel.getUserByUsername(userPathUsername, function(err, user) {
      if (err) {
        err = new Error('Sorry, cannot GET the user by such a username.');
        err.status = 500;
        next(err);
      }
      else {
        // User with such a name does not exist.
        if (!user) {
          req.flash('error_msg', 'The user with such a name was not found.');
          res.redirect('back');
        }
        // Any other page request for any authorised user (including admin)
        else {
          let userPageUrl = '/users/profile/' + req.user.username;
          let thyUser = {
            access_level: user.access_level,
            name: user.name,
            email: user.email,
            username: user.username,
            img_path: '/images/users/' + user._id + '/avatar.jpg',
            href: '/users/profile/' + user.username
          };
          res.render('userPage', {
            csrfToken: req.csrfToken(),
            thyUser: thyUser,
            back_url: req.header('Referer') || userPageUrl
          });
        }
      }
    });
  })
  /* POST an avatar to profile page. */
  .post(ensureAuthFunc.ensureAuth, function(req, res, next) {
    let userPathUsername = req.params.user_username_param;
    userModel.getUserByUsername(userPathUsername, function(err, user) {
      if (err) {
        err = new Error('Sorry, cannot GET the user by such a username.');
        err.status = 500;
        next(err);
      }
      else {
        // User with such a name does not exist.
        if (!user) {
          req.flash('error_msg', 'The user with such a name was not found.');
          res.redirect('back');
        }
        else {
          // Create a directory (with a unique name - '_id') for the certain user
          // and place the avatar there
          let dir = 'public/images/users/' + user._id;
          fs.mkdir(dir, function() {
            fs.writeFile(dir + '/avatar.jpg', req.files.avatar.data);
          });
          req.flash('success_msg', 'The avatar has been successfully uploaded!');
          res.redirect('/users/profile/' + req.params.user_username_param);
        }
      }
    });
  });

module.exports = router;

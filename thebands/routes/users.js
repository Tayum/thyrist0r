var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

// User MODEL MODULE
var userModel = require('../models/user');

// CHECK whether user is authentificated MODULE
var ensureAuth = require('../public/javascripts/ensureAuth');
var ensureAuthFunc = new ensureAuth();

router.route('/')
  /* Simply redirect to home page. */
  .get(function(req, res, next) {
    res.redirect('back');
  });

router.route('/register')
  /* GET register page. */
  .get(function(req, res, next) {
    if (req.originalUrl === '/register/') {
      res.redirect('/register');
    }
    // if the user is already authorised - redirect to home page
    if (req.user) {
      res.redirect('back');
    }
    res.render('register');
  })
  /* Registration. */
  .post(function(req, res, next) {
    // Validate all the fields
    req.checkBody('name', 'Name is required').notEmpty();
    req.checkBody('email', 'Email is required').notEmpty();
    req.checkBody('email', 'Email is not valid').isEmail();
    req.checkBody('username', 'Username is required').notEmpty();
    req.checkBody('password', 'Password is required').notEmpty();
    req.checkBody('repassword', 'Passwords do not match').equals(req.body.password);

    let errs = req.validationErrors();
    if (errs) {
      let arr = [];
      for (let i = 0; i < errs.length; i++) {
        arr.push(errs[i].msg);
      }
      for(let i = 0; i < arr.length; i++) {
        req.flash('error_msg', ' ' + arr[i]);
      }
      res.redirect('/users/register');
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
  .get(function(req, res, next) {
    // if the user is already authorised - redirect to home page
    if (req.user) {
      res.redirect('back');
    }
    if (req.originalUrl === '/login/') {
      res.redirect('/login');
    }
    res.render('login');
  })
  /* Try to authentificate. */
  .post(
    passport.authenticate('local', { successRedirect: '/', failureRedirect: '/users/login', failureFlash: true }),
    function(req, res, next) {
      res.redirect('/');
    });

router.route('/logout')
  /* Logout. */
  .get(function(req, res, next) {
    if (req.originalUrl === '/logout/') {
      res.redirect('/logout');
    }
    // if the user was not authorised - nothing will happen
    if (req.user) {
      req.logout();
      req.flash('success_msg', 'You are logged out');
    }
    res.redirect('/users/login');
  });

router.route('/profile/:user_username_param')
  /* GET profile page. */
  .get(ensureAuthFunc.ensureAuth, function(req, res, next) {
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
        // Admin access level:
        else if(req.user &&
                parseInt(req.user.access_level) === 10 &&
                req.user.username.toLowerCase() === userPathUsername.toLowerCase())
        {
          // Admin requests his page (with all users)
          userModel.getAllUsers(function(err, users) {
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
                  href: '/users/profile/' + users[i].username
                });
              }
              res.render('userPage', {
                arr: arr
              });
            }
          });
        }
        // Any other page request for any authorised user (including admin)
        else {
          let arr = [];
          arr.push({
            access_level: user.access_level,
            name: user.name,
            email: user.email,
            username: user.username,
            href: '/users/profile/' + user.username
          });
          res.render('userPage', {
            arr: arr
          });
        }
      }
    });
  });

module.exports = router;

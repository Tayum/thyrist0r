// A MODULE TO EXPORT THE userModel MODEL (USED WHEN WORKING WITH USERS)!
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

var Schema = mongoose.Schema;

var userSchema = new Schema({
	// 1 - auth. user, 10 - admin
	access_level: Number,
	username: String,
	password: String,
	email: String,
	name: String,
	logo: Buffer
});

var userModel = mongoose.model('User', userSchema);

module.exports = userModel;

// Copied from official documentation
module.exports.createUser = function(newUser, cb) {
  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(newUser.password, salt, function(err, hash) {
      newUser.password = hash;
      newUser.save(cb);
    });
  });
};

module.exports.getUserByUsername = function(username, cb) {
	// case insensitive complete match
	var regexUsername = new RegExp(["^", username, "$"].join(""), "i");
	let query = userModel.findOne({
		username: regexUsername
	});
	query.exec(cb);
};

// Get amount of all users
module.exports.getAmount = function(cb) {
	let query = userModel.count();
	query.exec(cb);
};


// Get all users (just for viewing on admin's profile page)
module.exports.getAllUsers = function(pageNumber, cb) {
	let query = userModel.find().limit(20).skip(20 * (pageNumber - 1)).lean();
	query.exec(cb);
};

module.exports.getUserById = function(id, cb) {
	let query = userModel.findById(id);
	query.exec(cb);
};

// Copied from official documentation
module.exports.comparePassword = function(enteredPassword, hash, cb) {
	bcrypt.compare(enteredPassword, hash, function(err, isMatch) {
		if(err) {
			console.log("ERROR has been thrown while comparing passwords (USER.JS).");
			throw err;
		}
		cb(null, isMatch);
	});
};

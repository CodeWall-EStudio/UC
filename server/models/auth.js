var Util = require('../util');
var config = require('../config');
var db = require('./db');


//
// oauth2-server callbacks
//
exports.getAccessToken = function(bearerToken, callback) {
    console.log('in getAccessToken (bearerToken: ' + bearerToken + ')');

    db.OAuthAccessTokens.findOne({
        accessToken: bearerToken
    }, callback);
};

exports.getClient = function(clientId, clientSecret, callback) {
    console.log('in getClient (clientId: ' + clientId + ', clientSecret: ' + clientSecret + ')');
    if (clientSecret === null) {
        return db.OAuthClients.findOne({
            clientId: clientId
        }, callback);
    }

    db.OAuthClients.findOne({
        clientId: clientId,
        clientSecret: clientSecret
    }, callback);
};

// This will very much depend on your setup, I wouldn't advise doing anything exactly like this but
// it gives an example of how to use the method to resrict certain grant types
// var authorizedClientIds = ['s6BhdRkqt3', 'toto', 'asdf314'];
exports.grantTypeAllowed = function(clientId, grantType, callback) {
    console.log('in grantTypeAllowed (clientId: ' + clientId + ', grantType: ' + grantType + ')');

    // if (grantType === 'password') {
    //     return callback(false, authorizedClientIds.indexOf(clientId) >= 0);
    // }

    // callback(false, true);

    callback(false, config.ALLOW_GRANT_TYPES.indexOf(grantType) >= 0);
};

exports.saveAccessToken = function(token, clientId, expires, user, callback) {
    var userId = user._id || user.id;
    console.log('in saveAccessToken (token: ' + token + ', clientId: ' + clientId + ', userId: ' + userId + ', expires: ' + expires + ')');

    db.OAuthAccessTokens.save({
        accessToken: token,
        clientId: clientId,
        userId: userId,
        expires: expires
    }, callback);
};

/*
 * Required to support password grant type
 */
exports.getUser = function(username, password, callback) {
    console.log('in getUser (username: ' + username + ', password: ' + password + ')');

    db.Users.findOne({
        username: username,
        password: Util.md5(password)
    }, function(err, user) {
        if (err) return callback(err);
        callback(null, user);
    });
};

/*
 * Required to support refreshToken grant type
 */
exports.saveRefreshToken = function(token, clientId, expires, user, callback) {
    var userId = user._id || user.id;
    console.log('in saveRefreshToken (token: ' + token + ', clientId: ' + clientId + ', userId: ' + userId + ', expires: ' + expires + ')');

    db.OAuthRefreshTokens.save({
        refreshToken: token,
        clientId: clientId,
        userId: userId,
        expires: expires
    }, callback);
};

exports.getRefreshToken = function(refreshToken, callback) {
    console.log('in getRefreshToken (refreshToken: ' + refreshToken + ')');

    db.OAuthRefreshTokens.findOne({
        refreshToken: refreshToken
    }, callback);
};

exports.getAuthCode = function(bearerCode, callback) {
    console.log("in getAuthCode (bearerCode: " + bearerCode + ")");

    db.OAuthCodes.findOne({
        authCode: bearerCode
    }, callback);
};

exports.saveAuthCode = function(authCode, clientId, expires, user, callback) {
    var userId = user._id || user.id;
    console.log('in saveAuthCode (authCode: ' + authCode + ', clientId: ' + clientId + ', userId: ' + userId + ', expires: ' + expires + ')');

    db.OAuthCodes.save({
        authCode: authCode,
        clientId: clientId,
        userId: userId,
        expires: expires
    }, callback);
};
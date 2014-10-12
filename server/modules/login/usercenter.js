var path = require('path');
var us = require('underscore');
var ObjectID = require('mongodb').ObjectID;

var db = require('../../models/db');
var ERR = require('../../errorcode');
var config = require('../../config');
var Logger = require('../../logger');


exports.login = function(req, res, next){

    var loginUrl = config.LOGIN_PAGE + '?redirect_uri=' + encodeURIComponent(req.url);
    res.redirect(loginUrl);
};
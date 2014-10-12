var URL = require('url');
var querystring = require('querystring');
var ObjectID = require('mongodb').ObjectID;

var db = require('../models/db');
var Util = require('../util');
var Logger = require('../logger');
var config = require('../config');
var ERR = require('../errorcode');

exports.post = function(req, res) {
    var parameter = req.parameter;

    var username = parameter.username;
    var password = parameter.password;

    db.Users.findOne({
        username: username,
        password: Util.md5(password)
    }, function(err, user) {
        if (err) {
            return res.redirect(config.LOGIN_FAIL_PAGE + '?err=' + ERR.LOGIN_FAILURE);
        }
        if (!user) {
            return res.redirect(config.LOGIN_FAIL_PAGE + '?err=' + ERR.ACCOUNT_ERROR);
        }

        req.session['loginUid'] = user._id.toString();

        var referer = req.get('Referer');
        var obj = URL.parse(referer);
        obj = querystring.parse(obj.query);
        var redirectUrl = obj.redirect_uri || config.INFO_PAGE;

        Logger.info('[usercenter.login] login success, redirect to ' + redirectUrl);
        res.redirect(decodeURIComponent(redirectUrl));
    });

};

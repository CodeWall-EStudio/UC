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

        res.redirect(decodeURIComponent(redirectUrl));
    });

};

/**
 * 检查是否登录, 如果没有登录, 跳转到登录页
 */
exports.checkAuthAndLogin = function(req, res, next) {
    var path = req.path;
    var method = req.method;
    var loginUrl = config.LOGIN_PAGE + '?redirect_uri=' + encodeURIComponent(req.url);

    var loginUid = req.session['loginUid'];
    if (!loginUid) {
        Logger.info('[checkAuthAndLogin] goto login', 'path: ', path, ', method: ', method);
        res.redirect(loginUrl);

        return;
    }

    // 这里改成每次请求都从数据库读取用户信息, 为了数据的一致性, 只能牺牲下性能
    db.Users.findOne({
        _id: new ObjectID(loginUid)
    }, function(err, user) {
        if (err) {
            res.json({
                err: ERR.SERVER_ERROR,
                msg: 'verify user error'
            });
            Logger.error('[checkAuthAndLogin] verify user error: ', user, ':', err, 'path: ', path, ', method: ', method);
        } else if (user) {

            req.loginUser = user;
            next();

        } else {
            Logger.info('[checkAuthAndLogin] verify user error, con\'t find user in db', 'path: ', path, ', method: ', method);
            res.redirect(loginUrl);
            return;
        }
    });
};

exports.getAuthUser = function(req, res) {

    db.Users.findOne({
        _id: req.user.id
    }, function(err, user) {
        if (err) {
            res.json({
                code: ERR.SERVER_ERROR,
                msg: err
            });
            return;
        } else if (!user) {
            res.json({
                code: ERR.NOT_FOUND,
                msg: 'user not found'
            });
            return;
        }
        var token = req.oauth.bearerToken;
        user.open_id = Util.md5(user._id.toString() + ':' + token.clientId);
        delete user.password;
        res.json(user);
    });

};
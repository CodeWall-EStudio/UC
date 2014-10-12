var path = require('path');
var us = require('underscore');
var ObjectID = require('mongodb').ObjectID;

var db = require('../models/db');
var ERR = require('../errorcode');
var config = require('../config');
var Logger = require('../logger');

var authModel = require('../models/auth');

us.extend(exports, require('../modules/verify/param_verify'));

// us.extend(exports, require('./auth_verify'));


function getRouter(uri, method) {

    var arr = uri.split('/'),
        module;
    try {

        module = require(path.join(__dirname, '../' + arr[1] + '/' + arr[2]));
        if (arr[3]) {
            return module[arr[3]];
        } else {
            return module[method.toLowerCase()];
        }
    } catch (e) {
        Logger.error('getRouter(', method, ':', uri, ') Error: ', e.message);
        if (config.DEBUG) {
            Logger.error(e.stack);
        }
    }
    return null;
}

exports.route = function(req, res, next) {
    var path = req.redirectPath || req.path;
    var method = req.method;

    var router = getRouter(path, method);
    if (router) {

        router(req, res, next);
        Logger.debug('route to ', path);
    } else {
        next();
    }
};

exports.setXHR2Headers = function(req, res, next) {
    var origin = req.headers['origin'];
    var method = req.method;
    var index;

    if ((index = config.XHR2_ALLOW_ORIGIN.indexOf(origin)) > -1) {

        res.setHeader('Access-Control-Allow-Origin', config.XHR2_ALLOW_ORIGIN[index]);
        res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Headers', 'origin,content-type');
        res.setHeader('Access-Control-Max-Age', '3600');

        Logger.info('[setXHR2Headers]', 'origin: ', origin, 'method: ', method);

    }
    if (method === 'OPTIONS') {

        res.send(200);
    } else {
        next();
    }
};


/**
 * oauth 授权登录模式判断
 * @param  {[type]}   req  [description]
 * @param  {[type]}   res  [description]
 * @param  {Function} next [description]
 * @return {[type]}        [description]
 */
exports.checkAuthMode = function(req, res, next) {
    var clientId = req.param('client_id');
    var clientSecret = req.param('client_secret');
    var grantType = req.param('grant_type');

    authModel.getClient(clientId, clientSecret, function(err, client) {
        if (err) {
            res.json({
                err: ERR.SERVER_ERROR,
                msg: 'verify user error'
            });
        } else if (!client) {
            res.json({
                err: ERR.NOT_FOUND,
                msg: 'no such client_id'
            });
        } else {
            req.oauthClient = client;
            if (req.path === '/oauth/authorise' && client.allowGrantTypes.indexOf('authorization_code') === -1) {
                res.json({
                    err: ERR.NOT_SUPPORT,
                    msg: 'this client_id doesn\'t support this grant_type'
                });
                return;
            }

            if (req.path === '/oauth/token' && client.allowGrantTypes.indexOf(grantType) === -1) {
                res.json({
                    err: ERR.NOT_SUPPORT,
                    msg: 'this client_id doesn\'t support this grant_type'
                });
                return;
            }
            if (req.path === '/oauth/token' && client.authType !== 'usercenter') {
                exports.checkAuthAndLogin(req, res, next);
                return;
            }
            next();
        }
    });

};

/**
 * 检查是否登录, 如果没有登录, 跳转到登录页
 */
exports.checkAuthAndLogin = function(req, res, next) {

    var client = req.oauthClient;
    var authType = client.authType;

    var path = req.path;
    var method = req.method;
    var loginModule = require('../modules/login/' + authType);

    var loginUid = req.session['loginUid'];
    if (!loginUid) {
        Logger.info('[checkAuthAndLogin] goto login', 'path: ', path, ', method: ', method);

        loginModule.login(req, res, next);
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
            loginModule.login(req, res, next);
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
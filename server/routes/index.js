var path = require('path');
var us = require('underscore');
var ObjectID = require('mongodb').ObjectID;

var ERR = require('../errorcode');
var config = require('../config');
var Logger = require('../logger');

// us.extend(exports, require('./param_verify'));

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


function gotoLogin(req, res) {
    res.redirect('login', {
        'redirect_uri': req.url,
        title: 'hello word'
    });

}

/**
 * 检查是否登录, 如果没有登录, 跳转到登录页
 */
exports.checkAuthAndLogin = function(req, res, next) {
    var path = req.path;
    var method = req.method;
    var skey = req.cookies.skey || req.body.skey || req.query.skey;
    req.skey = skey;

    var loginUid;

    if (!req.session || !skey || !(loginUid = req.session[skey])) {
        Logger.info('[checkAuthAndLogin] goto login', 'path: ', path, ', method: ', method);
        gotoLogin(req, res);
        return;
    }
    req.loginUid = loginUid;
    
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
            gotoLogin(req, res);
        }
    });
};
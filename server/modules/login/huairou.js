var path = require('path');
var url = require('url');
var querystring = require('querystring');

var us = require('underscore');
var ObjectID = require('mongodb').ObjectID;
var iconv = require('iconv-lite');
var parseXMLString = require('xml2js').parseString;

var db = require('../../models/db');
var ERR = require('../../errorcode');
var config = require('../../config');
var Logger = require('../../logger');
var Util = require('../../util');


var CONST_LOGIN_PATH = 'http://sso.edures.bjedu.cn/auth/authNewAction.a';
var CONST_USERINFO_PATH = 'http://sso.edures.bjedu.cn/auth/authInfoAction.do';

iconv.extendNodeEncodings();

exports.login = function(req, res, next) {
    var username = req.param('username');
    var password = req.param('password');


    var data = querystring.stringify({
        auth_url: req.appDomain + '/cgi/login/huairouLoginSuccess',
        auth_key: req.session.id,
        auth_logining: 1,
        auth_username: username,
        auth_password: password,
        sys_id: 1
    });

    Util.request({
        url: CONST_LOGIN_PATH,
        method: 'POST',
        encoding: 'gbk',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': data.length
        },
        data: data
    }, function(err, data, response) {

        if (err) {
            res.json({
                err: ERR.SERVER_ERROR,
                msg: err
            });
            return;
        }
        if (response.statusCode > 300 && response.statusCode < 400 && response.headers.location) {
            var obj = url.parse(response.headers.location);
            obj = querystring.parse(obj.search.substring(1));
            Logger.info('[huairou.login] success: ', obj);
            req.parameter = {
                username: obj.auth_username,
                auth_key: obj.auth_key
            };
            getUserInfoAndLogin(req, res, next);
        } else {
            res.json({
                err: ERR.LOGIN_FAILURE,
                msg: '[huairou.login] login failure'
            });
            Logger.info('[huairou.login] failure: ', data);

            return;
        }
    });
};

function getUserInfoAndLogin(req, res, next) {
    var username = req.parameter.username;
    var password = req.param('password');

    var data = querystring.stringify({
        becom_auth_username: username,
        userinfoparameter: 'user_name,user_type,name,town,teacher_id,card_id'
    });

    Util.request({
        url: CONST_USERINFO_PATH,
        method: 'POST',
        encoding: 'utf8',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': data.length
        },
        data: data
    }, function(err, data) {
        if (err) {
            res.json({
                err: ERR.SERVER_ERROR,
                msg: err
            });
            return;
        }
        parseXMLString(data, function(err, data) {
            if (err) {
                res.json({
                    err: ERR.SERVER_ERROR,
                    msg: err
                });
                return;
            }
            Logger.info('[huairou.login] get userinfo: ', data);
            var userInfo = data.userinfo;
            db.Users.findOne({
                username: username
            }, function(err, user) {
                if (err) {
                    res.json({
                        err: ERR.SERVER_ERROR,
                        msg: 'verify user error'
                    });
                } else if (user) {
                    // 已经存在的用户, 更新资料
                    req.loginUser = user;
                    user.nick = userInfo.name[0];
                    user.password = Util.md5(password);
                    user.save(next);
                    Logger.info('[huairou.login] update userinfo: ', user);
                } else {
                    // 不存在的, 插入一条记录
                    user = {
                        username: username,
                        status: 0
                    };
                    req.loginUser = user;
                    user.nick = userInfo.name[0];
                    user.password = Util.md5(password);
                    db.Users.create(user, next);
                    Logger.info('[huairou.login] insert userinfo: ', user);
                }
            });

        });

    });

}
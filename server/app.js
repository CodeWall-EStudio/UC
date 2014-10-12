/**
 * Module dependencies.
 */
var express = require('express');
var MongoStore = require('connect-mongo')(express);
var http = require('http');
var path = require('path');
var authServer = require('oauth2-server');
var authModel = require('./models/auth');

var config = require('./config');
var routes = require('./routes');
var Logger = require('./logger');
var Util = require('./util');
var ERR = require('./errorcode');

var app = express();

app.oauth = authServer({
    model: authModel,
    grants: config.ALLOW_GRANT_TYPES,
    accessTokenLifetime: 3600 * 24 * 30,
    refreshTokenLifetime: 3600 * 24 * 30 * 3,
    authCodeLifetime: 3600,
    debug: true
});


app.engine('.html', require('ejs').__express);

// all environments
app.set('port', process.env.PORT || config.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'html');
app.use(express.favicon());
app.use(express.logger('dev'));
app.enable('trust proxy');

app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());

app.use(express.cookieParser());
app.use(express.session({
    key: 'oauth.sid',
    secret: config.COOKIE_SECRET,
    cookie: {
        maxAge: config.COOKIE_TIME, // 2 hour
        httpOnly: true
    },
    store: new MongoStore({
        url: config.DB_URI
    }, function() {
        Logger.info('session db connection open');
    })
}));


app.use(app.router);
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: config.STATIC_FILE_EXPIRES
}));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}


/////////// oauth 相关 ///////////////

// 获取token
app.post('/oauth/token', routes.checkAuthMode, app.oauth.grant());

// 检查是否登录, 如果没有登录, 跳转到登录页
app.get('/oauth/authorise', routes.checkAuthMode, routes.checkAuthAndLogin, app.oauth.authCodeGrant(function(req, next) {
    next(null, true, req.loginUser);
}));

// 获取用户信息和 openid
app.all('/oauth/verify', app.oauth.authorise(), routes.getAuthUser);


/////////// API 相关 ///////////////

// 设置跨域请求头
app.all('/api/*', routes.setXHR2Headers);


// 检查是否登录, 如果登录了, 从数据库把用户信息找出; 没有登录则返回错误
// app.all('/api/*', routes.checkAuth);

// 检查参数合法性
app.all('/api/*', routes.checkParams);

// 检查 API 调用权限
// app.all('/api/*', routes.checkAPI);

// 路由请求
app.all('/api/*', routes.route);

// 检查参数合法性
app.all('/cgi/*', routes.checkParams);

// 路由请求
app.all('/cgi/*', routes.route);

app.use(app.oauth.errorHandler());

http.createServer(app).listen(app.get('port'), function() {
    Logger.info('Express server listening on port ' + app.get('port'));
});
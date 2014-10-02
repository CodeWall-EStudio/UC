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

var loginApi = require('./api/login');

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
    key: 'skey',
    secret: config.COOKIE_SECRET,
    cookie: {
        maxAge: config.COOKIE_TIME,
        httpOnly: true
    }, // 2 hour)
    store: new MongoStore({
        url: config.DB_URI
    }, function () {
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



//app.all(config.INDEX_PAGE, routes.checkAuthAndLogin);
// app.all('/', routes.index);

app.post('/oauth/token', app.oauth.grant());

// 检查是否登录, 如果没有登录, 跳转到登录页
app.all('/oauth/authorise', loginApi.checkAuthAndLogin);

app.get('/oauth/authorise', app.oauth.authCodeGrant(function(req, next) {
    // next(err, allowed, user);
    next(null, true, req.loginUser);
}));

app.all('/oauth/verify', app.oauth.authorise(), function(req, res) {
    // res.send('Secret area');
    res.send(req.loginUser);
});

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

app.use(app.oauth.errorHandler());

http.createServer(app).listen(app.get('port'), function() {
    Logger.info('Express server listening on port ' + app.get('port'));
});
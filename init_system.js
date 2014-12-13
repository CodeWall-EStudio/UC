var db = require('./server/models/db');

db.OAuthClients.create({
    clientId: '54321',
    clientSecret: '22ff294ea9c161ca843fbc22eafb068b',
    redirectUri: 'http://szone.hylc-edu.cn/api/login/loginUCSuccess',
    allowGrantTypes: ['usercenter'],
    authType: 'token',
    name: '工作室'
}, function(err) {
    console.log('inited with error: ', err);
});
var db = require('./server/models/db');

db.OAuthClients.create({
    clientId: '54321',
    clientSecret: '22ff294ea9c161ca843fbc22eafb068b',
    redirectUri: 'http://szone.hylc-edu.cn/api/login/loginUCSuccess',
    allowGrantTypes: ['password'],
    authType: 'usercenter',
    name: '工作室'
});
db.Users.create({
    username: 'azrael',
    password: '9a26f23b24bc2cd94e3f17d5496ebd7b',
    nick: 'Azrael',
    status: 0
});
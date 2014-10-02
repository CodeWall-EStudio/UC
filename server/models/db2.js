var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var config = require('../config');
var Util = require('../util');
var Logger = require('../logger');


// Makes connection asynchronously. Mongoose will queue up database
// operations and release them when the connection is complete.
var dbUri = config.DB_URI;

mongoose.connect(dbUri, function(err, res) {
    if (err) {
        Logger.info('ERROR connecting to: ' + dbUri + '. ' + err);
    } else {
        Logger.info('Succeeded connected to: ' + dbUri);
    }
});


//
// Schemas definitions
//
var models = {
    OAuthAccessTokens: {
        accessToken: {
            type: String
        },
        clientId: {
            type: String
        },
        userId: {
            type: String
        },
        expires: {
            type: Date
        }
    },
    OAuthRefreshTokens: {
        refreshToken: {
            type: String
        },
        clientId: {
            type: String
        },
        userId: {
            type: String
        },
        expires: {
            type: Date
        }
    },
    OAuthClients: {
        clientId: {
            type: String
        },
        clientSecret: {
            type: String
        },
        redirectUri: {
            type: String
        },
        allowGrantTypes: {
            type: Array
        }
    },
    OAuthUsers: {
        username: {
            type: String
        },
        password: {
            type: String
        }
    }
};

for (var i in models) {
    mongoose.model(i, new Schema(models[i]));
    exports[i + 'Model'] = mongoose.model(i);
}

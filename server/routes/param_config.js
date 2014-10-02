

module.exports = {

    '/api/login': {
        method: 'POST',
        params: [
            {
                name: 'username',
                required: true
            },
            {
                name: 'password',
                required: true
            }
        ]
    }
};


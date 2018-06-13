module.exports = {
  default: {
    protocol : 'https://',
    hostname : 'www.reamaze.com/api',
    username : 'your_username',
    authToken: 'your_auth_token',
  },
  paths: {
    articles     : '/api/v1/articles',
    contacts     : '/api/v1/contacts/',
    messages     : '/api/v1/messages/',
    channels     : '/api/v1/channels/',
    conversations: '/api/v1/conversations/',
  },
  maxTime       : 12,
  requestTimeout: 60000,
  tmpDir        : '.tmp',
};

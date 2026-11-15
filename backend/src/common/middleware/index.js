const errorHandler = require('./errorHandler');
const notFound = require('./notFound');
const authenticate = require('./authenticate');
const optionalAuth = require('./optionalAuth');
const authorize = require('./authorize');

module.exports = {
  errorHandler,
  notFound,
  authenticate,
  optionalAuth,
  authorize,
};

/* eslint-disable no-param-reassign */
const crypto = require('crypto');
const got = require('got');
const { logger } = require('../../logger');
const hostRules = require('../host-rules');

const md5 = input =>
  crypto
    .createHash('md5')
    .update(input)
    .digest('hex');

let NC = 1;

// Apply host rules to requests

// istanbul ignore next
// @ts-ignore
module.exports = got.create({
  options: {},
  handler: (options, next) => {
    if (!options.hostname) {
      return next(options);
    }
    const { username, password, token, timeout } = hostRules.find({
      hostType: options.hostType,
      url: options.href,
    });
    if (options.digest) {
      const ha1 = md5(username + ':' + options.digest.realm + ':' + password);
      const ha2 = md5(options.method.toUpperCase() + ':' + options.path);
      let s = ha1 + ':' + options.digest.nonce;
      const cnonce = crypto.randomBytes(8).toString('hex');
      const nc = String(NC++).padStart(8, '0');
      if (options.digest.qop) {
        s += ':' + nc + ':' + cnonce + ':' + options.digest.qop;
      }
      s += ':' + ha2;
      options.headers.authorization = `Digest username="${username}", realm="${
        options.digest.realm
      }", nonce="${options.digest.nonce}", uri="${options.path}", qop=${
        options.digest.qop
      }, nc=${nc}, cnonce="${cnonce}", response="${md5(s)}"`;
    }
    if (options.headers.authorization || options.auth || options.token) {
      logger.trace('Authorization already set for host: ' + options.hostname);
    } else if (password) {
      logger.trace(
        'Applying Basic authentication for host ' + options.hostname
      );
      options.auth = `${username || ''}:${password}`;
    } else if (token) {
      logger.trace(
        'Applying Bearer authentication for host ' + options.hostname
      );
      options.token = token;
    }
    if (timeout) {
      options.gotTimeout = { request: timeout };
    }
    return next(options);
  },
});

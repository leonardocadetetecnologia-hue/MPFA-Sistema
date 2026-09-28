/** Integration tests require real PostgreSQL and Redis (see docs/runbooks/local-dev.md). */
module.exports = {
  ...require('../../jest.preset'),
  testMatch: ['<rootDir>/test/**/*.int-spec.ts'],
  testTimeout: 20000,
  forceExit: true,
};

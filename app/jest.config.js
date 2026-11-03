// Pin the time zone so date tests give the same result on every machine and CI.
// Set here (before Jest spawns workers) so all test processes inherit it.
process.env.TZ = 'Asia/Seoul';

module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

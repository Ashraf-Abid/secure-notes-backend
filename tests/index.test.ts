import './setup';
import { after, before, describe } from 'node:test';
import { startTestApp, stopTestApp } from './helpers';
import { authTests } from './suites/auth';
import { authorizationTests } from './suites/authorization';
import { notesTests } from './suites/notes';
import { adminTests } from './suites/admin';
import { aggregationTests } from './suites/aggregation';
import { indexTests } from './suites/indexes';

describe('Secure Notes API', () => {
  before(startTestApp);
  after(stopTestApp);

  authTests();
  authorizationTests();
  notesTests();
  adminTests();
  aggregationTests();
  indexTests();
});

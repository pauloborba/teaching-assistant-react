import { Then } from '@cucumber/cucumber';
import expect from 'expect';
import { textOf } from './support/browser';
import { requireLastResponse } from './support/api';

/**
 * Steps shared by all features: the messages the pages show, and the
 * outcome of the last request sent to the server.
 */

Then('I see the confirmation message {string}', async function (message: string) {
  expect(await textOf('confirmation-message')).toBe(message);
});

Then('I see the error message {string}', async function (message: string) {
  expect(await textOf('error-message')).toBe(message);
});

Then('the request is accepted', async function () {
  const response = requireLastResponse();
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
});

Then('the system returns the error {string}', async function (message: string) {
  const response = requireLastResponse();
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.body).toEqual({ error: message });
});

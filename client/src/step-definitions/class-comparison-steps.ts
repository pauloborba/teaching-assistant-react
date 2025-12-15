import { Given, When, Then } from '@cucumber/cucumber';

Given('I am on the {string} page', async function (_page: string) {
  // implemented as a no-op stub for cucumber runs
});

Given('I have selected the class {string} for comparison', async function (_className: string) {
});

Given('I have selected only the class {string} for comparison', async function (_className: string) {
});

Given('both classes have students enrolled', async function () {
});

When('I choose to compare the classes', async function () {
});

Then('the {string} pops up', async function (_text: string) {
});

Then('I see the comparison displayed in a table', async function () {
});

When('I attempt to compare the selected class', async function () {
});

Then('I am not allowed to compare the classes', async function () {
});

Then('I remain on the {string} page', async function (_page: string) {
});

When('I attempt to compare these classes', async function () {
});

When('the class {string} has no enrolled students', async function (_className: string) {
});

Then('I receive a message stating that the class {string} and n others have no enrolled students', async function (_className: string) {
});

When('I attempt to select the class {string} for comparison', async function (_className: string) {
});

Then('I am not allowed to select more than {int} classes', async function (_n: number) {
});

Given('I am viewing the {string}', async function (_view: string) {
});

Given('a comparison is currently displayed', async function () {
});

When('I choose to export the comparison', async function () {
});

Then('a file containing the comparison results is generated and downloaded', async function () {
});

Given('I am on the {string} view', async function (_view: string) {
});

Then('I remain on the {string} view', async function (_view: string) {
});

Given('fewer than the maximum number of classes are currently selected', async function () {
});

When('I choose to add a class', async function () {
});

When('I select {string}', async function (_value: string) {
});

Then('{string} appears in the comparison', async function (_value: string) {
});

Given('there are already {int} classes displayed', async function (_n: number) {
});

When('I attempt to add another class', async function () {
});

Then('I am not allowed to add another class due to reaching the maximum limit', async function () {
});

Then('the same {int} classes remain on display', async function (_n: number) {
});

Given('the class {string} is included in the comparison', async function (_className: string) {
});

When('I choose to remove a class', async function () {
});

When('I confirm the removal', async function () {
});

Then('{string} no longer appears in the comparison', async function (_value: string) {
});

Given('only {int} classes are displayed', async function (_n: number) {
});

Then('I receive a message asking whether I want to clear the display or keep the existing classes', async function () {
});

Given('I chose to remove the class {string}', async function (_className: string) {
});

Given('there are now not enough classes for comparison', async function () {
});

When('I choose to clear the display', async function () {
});

Then('the comparison graphs disappear', async function () {
});

When('I choose to keep the classes', async function () {
});

Then('the comparison graphs remain displayed', async function () {
});

Given('the bar chart {string} is displayed', async function (_chart: string) {
});

Given('the classes {string} and {string} appear on the chart', async function (_a: string, _b: string) {
});

Given('{string} has more students with grades above average than {string}', async function (_a: string, _b: string) {
});

Then('the bar representing {string} is taller than the bar representing {string}', async function (_a: string, _b: string) {
});

// Shim to locate step definitions for the classComparison feature
// The cucumber preprocessor searches for step definition files next to the
// feature file by default. Require the actual implementation from the
// centralized stepDefinitions folder so we don't duplicate code.
require('../stepDefinitions/classComparison.steps.js');

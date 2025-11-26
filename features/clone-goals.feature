Feature: Clone Goals
  This feature describes the functionality to clone goals (evaluation items) from a source class
  into a destination class, creating new goal instances with new IDs so the cloned goals are
  independent from the original ones.

  Background: repository and git exercises answers (each question followed by an answer in blue)

  # Aula 1 - Git / Fork / Clone
  Q: Confirm the creation and address of your fork. Compare fork content with original. Do they match?
  <span style="color:blue">A: I created a fork at https://github.com/lipe-1512/teaching-assistant-react.git. The fork at the moment contains the same content as the original repository (files and folders), so yes they match.</span>

  Q: What is the purpose of git init? How is it different from git clone? When would you use git init?
  <span style="color:blue">A: git init initializes a new empty Git repository in a local directory. git clone downloads an existing repository (with history) from a remote server to your local machine. Use git init when you start a new project locally (and later add a remote), use git clone to get an existing repository with history and remotes configured.</span>

  Q: Create the features directory and a feature file — commit it. What does git add do and what does git commit do?
  <span style="color:blue">A: git add stages file changes into the index for the next commit; git commit records a snapshot of the staged changes in the repository history. The file features/clone-goals.feature was added and committed as the first feature file.</span>

  Q: Create the first scenario(s) in the feature file and commit again. What is the output of git status and git diff? How are additions shown?
  <span style="color:blue">A: git status shows the current branch and files changed/added/removed. git diff shows line-by-line differences between HEAD (or specified commits) and working tree; additions are displayed with a leading "+" and green color, removals with "-" and red color. After creating scenarios, those lines show as additions until committed.</span>

  # Sample scenarios (starting minimal — more can be added in feature branches)
  Scenario: Create and verify goals in source class
    Given I have a source class with two goals
    When I clone goals to a destination class
    Then the destination should have two cloned goals with different IDs

  Scenario: Edit a cloned goal and verify independence
    Given the destination has cloned goals
    When I edit one cloned goal in destination
    Then the source's corresponding goal should remain unchanged and the cloned goal keeps independent weight values and also preserves the original createdAt timestamp

  # Work in dev: Add additional scenarios for edge cases (added in dev branch)
  Scenario: Clone fails when source has no goals
    Given a source class has no goals
    When I attempt to clone goals to a destination class
    Then the server responds with an error indicating there are no goals to clone

  Scenario: Clone should not overwrite existing destination goals
    Given a destination class already has goals
    When I attempt to clone goals from another class
    Then the server should return a 409 or appropriate error indicating the destination already has goals
>>>>>>> dev

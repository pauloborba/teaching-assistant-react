# Teaching Assistant

Full-stack TypeScript example used in the Software and Systems Engineering course
at CIn/UFPE. A professor registers students, opens classes, enrolls students in
them and grades their learning goals.

The system follows the client–server (SaaS) structure discussed in class: a React
client in the browser talks over HTTP/JSON to an Express server that keeps the
data in memory and persists it in a JSON file.

## Requirements

- **Node.js 18.14 or later** (20, 22 and 24 also work) and **npm 9 or later**.
  Check with `node --version` and `npm --version`; get it from
  [nodejs.org](https://nodejs.org).
- **Git**, to clone the repository.
- A **browser** (Chrome or Chromium is also what the GUI tests drive).
- Nothing else: no database and no other service has to be installed.

## Installing

```bash
git clone https://github.com/pauloborba/teaching-assistant-react.git
cd teaching-assistant-react
npm install
```

The root package declares the client and the server as npm
[workspaces](https://docs.npmjs.com/cli/using-npm/workspaces), so this single
command installs the dependencies of both. `./install-deps.sh` does the same.

## Running locally

```bash
npm run dev
```

This starts both parts at once:

| Part   | Address                 | What it is                          |
| ------ | ----------------------- | ----------------------------------- |
| Client | http://localhost:3004   | React interface, opens in a browser |
| Server | http://localhost:3005   | REST API used by the client         |

Open http://localhost:3004 and use the three tabs: **Students** (register, edit
and remove students, filtering by class), **Classes** (create classes and enroll
students) and **Evaluations** (grade each learning goal with MANA, MPA or MA).

The **Classes** tab also provides **Class Correlations**. Select classes as the
data set, then select two different variables—such as Requirements and Overall
average—to measure their relationship across the selected students. The result
uses Pearson's correlation coefficient and includes a plain-language
interpretation.

To start only one of them, run `npm run server` or `npm run client`. In VS Code,
"Run and Debug" → "Launch Full Stack" starts both with the debugger attached.

The ports and the address the client uses for the API come from `client/.env`
(`PORT`, `REACT_APP_API_URL`) and from the server's `PORT` variable, documented
in `server/.env.example`. Change them there if those ports are taken.

### Where the data is kept

The server keeps the students and classes in memory and writes them to
`server/data/app-data.json` after every change, reloading that file when it
starts. The file in the repository holds example data; delete its content (or
the file) to start empty.

A file written by a version of the project older than this one is still read
in full: the fields that were named in Portuguese
(`especificacaoDoCalculoDaMedia`, `mediaPreFinal`, `mediaPosFinal`,
`reprovadoPorFalta`) are accepted under those names. The conversion only goes
that way, though: once this version saves, the file uses the English names,
and an older version reading it back would not find the classes.

## Running the tests

```bash
npm test              # server tests and client tests
npm run test:server   # server only: domain classes, persistence and API (Jest)
npm run test:client   # client only: components and services (Jest + Testing Library)
```

Coverage report for the server: `npm run test:coverage --prefix server`, then
open `server/coverage/index.html`.

The acceptance tests are separate, because they exercise the running system
through its interface and through its API with Cucumber and Puppeteer. Start the
application first, and then, in another terminal:

```bash
npm run dev           # terminal 1: client and server running
npm run test:cucumber # terminal 2: the acceptance tests
```

`client/CUCUMBER_TESTING.md` and `server/JEST_TESTING.md` describe how to write
new tests of each kind.

## Deploying for free on Render

[Render](https://render.com) hosts both parts on its free plans, with no credit
card needed to start, which makes it a practical target for course projects. You
need a Render account and your own fork of this repository on GitHub.

**1. The server, as a Web Service.** In the Render dashboard, *New* → *Web
Service*, connect your fork, and set:

| Field           | Value                    |
| --------------- | ------------------------ |
| Root Directory  | `server`                 |
| Runtime         | `Node`                   |
| Build Command   | `npm install && npm run build` |
| Start Command   | `npm start`              |
| Instance Type   | `Free`                   |

Render assigns the port through the `PORT` variable, which the server reads, so
there is nothing else to configure. Once it deploys, note its address, something
like `https://teaching-assistant-server.onrender.com`.

**2. The client, as a Static Site.** *New* → *Static Site*, same repository, and
set:

| Field             | Value                                      |
| ----------------- | ------------------------------------------ |
| Root Directory    | `client`                                   |
| Build Command     | `npm install && npm run build`             |
| Publish Directory | `build`                                    |
| Environment Variable | `REACT_APP_API_URL` = the server address above |

`REACT_APP_API_URL` is read when the client is built, so after changing it you
have to redeploy the static site for the new value to take effect.

**What the free plan costs you.** A free Web Service
[spins down after 15 minutes without traffic](https://render.com/docs/free), and
the next request takes about a minute to wake it up. Each workspace gets 750 free
instance hours per month. More importantly for this project, a free Web Service
has an **ephemeral filesystem**: `server/data/app-data.json` is reset to what was
deployed every time the service restarts, redeploys or spins down, so data
entered through the interface does not survive. That is acceptable for a
demonstration; storing data that must last calls for a database, which is exactly
the change the repository interface in `server/src/persistence` is meant to
absorb.

Students with the [GitHub Student Developer Pack](https://education.github.com/pack)
also have hosting credits from other providers, which avoid the spin-down.

## Project structure

```
teaching-assistant-react/
├── client/                      # React interface (TypeScript)
│   ├── .env                     # ports and address of the API
│   └── src/
│       ├── components/          # one component per part of the interface
│       │   ├── StudentsTab.tsx     ClassFilter.tsx
│       │   ├── StudentForm.tsx     StudentList.tsx
│       │   ├── Classes.tsx         ClassForm.tsx
│       │   ├── ClassList.tsx       EnrollmentModal.tsx
│       │   ├── Evaluations.tsx     ImportGrade.tsx
│       ├── services/            # access to the server API
│       │   ├── apiClient.ts        (URL, JSON and error handling, shared)
│       │   ├── StudentService.ts   ClassService.ts  EnrollmentService.ts
│       ├── types/               # data exchanged with the server
│       ├── features/            # acceptance scenarios (Gherkin)
│       ├── step-definitions/    # how each scenario step is executed
│       └── __tests__/           # component and service tests
├── server/                      # REST API (TypeScript, Express)
│   ├── data/app-data.json       # persisted state
│   └── src/
│       ├── index.ts             # composition root: builds and starts everything
│       ├── app.ts               # builds the application from its dependencies
│       ├── models/              # domain: Student, Class, Enrollment, ...
│       ├── persistence/         # AppStateRepository and its JSON file version
│       ├── routes/              # one router per resource
│       └── __tests__/           # domain, persistence and API tests
└── .vscode/                     # debug and task configurations
```

The server is organized so that the three concerns stay apart: `models` holds the
domain rules and knows nothing about HTTP or files; `routes` translates HTTP
requests into calls on the domain; `persistence` is the only place that knows the
data is kept in a JSON file. `index.ts` is the only module that creates the
concrete instances and connects them, so tests build the same application with
their own dependencies.

## The API

All payloads are JSON. CPFs are accepted formatted or as plain digits, and are
always returned formatted as `000.000.000-00`. A class is identified by
`topic-year-semester` (its `id`).

### Students

| Method   | Path                    | Description                                   |
| -------- | ----------------------- | --------------------------------------------- |
| `GET`    | `/api/students`         | Every registered student                      |
| `POST`   | `/api/students`         | Registers a student (`name`, `cpf`, `email`)  |
| `GET`    | `/api/students/:cpf`    | One student                                   |
| `PUT`    | `/api/students/:cpf`    | Updates `name` and `email`                    |
| `DELETE` | `/api/students/:cpf`    | Removes a student                             |

### Classes

| Method   | Path                          | Description                                     |
| -------- | ----------------------------- | ----------------------------------------------- |
| `GET`    | `/api/classes`                | Every class, with its enrollments               |
| `POST`   | `/api/classes`                | Creates a class (`topic`, `semester`, `year`)   |
| `PUT`    | `/api/classes/:id`            | Updates `topic`, `semester` and `year`          |
| `DELETE` | `/api/classes/:id`            | Removes a class                                 |
| `GET`    | `/api/classes/:id/report`     | Statistics report (not implemented yet)         |
| `POST`   | `/api/classes/gradeImport/:id`| Grade import (not implemented yet, answers 501) |

### Enrollments and evaluations

| Method   | Path                                                  | Description                        |
| -------- | ----------------------------------------------------- | ---------------------------------- |
| `POST`   | `/api/classes/:id/enroll`                             | Enrolls a student (`studentCPF`)   |
| `DELETE` | `/api/classes/:id/enroll/:cpf`                        | Cancels an enrollment              |
| `GET`    | `/api/classes/:id/enrollments`                        | Enrollments of a class             |
| `GET`    | `/api/classes/:id/enrollments/:cpf/evaluation`        | Averages of one student            |
| `PUT`    | `/api/classes/:id/enrollments/:cpf/evaluation`        | Grades a goal (`goal`, `grade`); an empty grade removes the evaluation |

A request that breaks a rule is answered with `400` (or `404` when something is
not found) and a body `{"error": "..."}` explaining it. An unexpected failure is
answered with `500` and `{"error": "Internal server error"}`.

## Contributing

`.github/PULL_REQUEST_TEMPLATE` lists what a pull request should describe and
check. Before opening one: make sure `npm test` passes, keep each commit focused
on one cohesive change, and write commit messages that say precisely what
changed.

## License

ISC

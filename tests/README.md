# Tests

Tests use [Vitest](https://vitest.dev/) with [happy-dom](https://github.com/capricorn86/happy-dom) for a browser-like environment.

## Run tests

```bash
npm install
npm test
```

Watch mode (re-run on file changes):

```bash
npm run test:watch
```

## What’s covered

- **quiz-single.test.js** – Single-question quiz: correct answer shows success message and reveals “Next”; wrong answer marks option wrong and reveals correct option; options are disabled after one click.
- **script.test.js** – Gate: clicking “Yes” hides the gate and shows the message; lightbox: opening via gallery image click, closing via close button and Escape key.
- **quiz-sounds.test.js** – `playQuizCorrect` and `playQuizIncorrect` exist and don’t throw when `AudioContext` isn’t available (e.g. in Node/happy-dom).

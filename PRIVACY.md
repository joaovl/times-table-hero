# Privacy Policy

Times Table Hero is built to be the simplest privacy story we could write: we do not collect anything from you, and there is nothing we could send anywhere even if we wanted to. This page explains what that means in practice for parents, teachers, and anyone curious about what an app is doing in the background.

Last reviewed: 2026-05.

## In one sentence

Everything you do in Times Table Hero stays on the device you are using. The app has no servers, no accounts, and no analytics.

## What we collect

Nothing.

There is no telemetry, no error reporting service, no analytics product, no advertising network, and no third-party tracking script in the app. We do not record which modules you open, which answers you get right, how long a session lasted, or anything else.

## What is stored, and where

Every piece of data the app remembers lives in your browser's built-in `localStorage`. That data never leaves the device.

The kinds of things stored locally include:

- Practice settings for each module (chosen skills, difficulty, question count).
- Print settings for each module (pages, questions per page, answer key on or off).
- Recent session results so the Results screen can show a short history.
- The chosen colour theme.
- Locally created kid profiles (a name and an avatar choice). No email, no birthdate, no password.

Each module owns its own namespace in `localStorage`, for example `arithmetic-settings`, `arithmetic-printSettings`, `arithmetic-sessions`. Nothing in those values is encrypted because nothing in them is sent anywhere — they are simply notes the app keeps for itself.

## Cookies

The app does not set cookies. It uses `localStorage`, which is similar in spirit but is not sent to any server with every request.

## Third-party scripts

The production build (`dist/`) ships only the app's own JavaScript and CSS plus static images. The HTML page in `index.html` does not include analytics, ad networks, fingerprinting libraries, or social-media pixels.

If a future change introduces a third-party script (for example, a self-hosted font), this page will be updated to say so before that change ships.

## No account, no login

There is no sign-up, no sign-in, no password reset, and no email collection. The "profiles" inside the app are kid-friendly avatars stored locally on the device. They are not user accounts in the traditional sense — they are just labels the app uses to keep separate sets of settings on the same device.

## What's in the URL?

The app uses standard browser routing, so the page address bar reflects where you are inside the app. You may see paths like:

- `/`            — the Hub.
- `/arithmetic`  — the Arithmetic module.
- `/time/print`  — the Time module with the print dialog open.

Those paths describe the screen you are looking at. They do not carry kid names, scores, profile IDs, or any other personal information as query parameters. URLs in this app are safe to share, bookmark, or send to a child as a direct link to a specific module.

## Children's privacy

Times Table Hero is designed to be safe to give to a child without any consent paperwork, because the app collects no personal information at all.

- COPPA (United States): the app does not knowingly collect personal information from children under 13, because it does not collect personal information from anyone.
- UK GDPR / Children's Code: the app does not collect personal data, does not profile users, and does not show targeted content.

There is nothing for a parent or school to opt out of, because there is nothing being collected in the first place. Schools and parents can use the app freely without setting up data-processing agreements or consent forms for it.

## How to clear data on your device

Because the only data is local, you can wipe it at any time:

- **Chrome / Edge:** open DevTools (F12) -> Application tab -> Storage -> Clear site data. Or use the browser's Settings -> Privacy -> Clear browsing data, and choose "Cookies and other site data".
- **Firefox:** Settings -> Privacy & Security -> Cookies and Site Data -> Manage Data -> find the site -> Remove.
- **Safari:** Safari -> Settings -> Privacy -> Manage Website Data -> find the site -> Remove.

Using the browser in Private / Incognito mode also avoids saving anything: the moment you close the window, the local storage for that session is gone.

## Multiple devices

Because data is stored on the device, the app does not sync progress across devices. A child who practices on a school tablet and at home on a laptop will have separate progress histories on each one. This is intentional — it keeps the privacy story simple — and it is also why we do not ask for an email address.

## Changes to this policy

If we ever change what the app does on the privacy front (for example by adding a self-hosted analytics tool that respects Do Not Track), we will update this page in the same commit that introduces the change, so the policy and the code stay in sync.

## Questions

Open an issue on the project's GitHub repository. The maintainers will respond there in public so anyone with the same question can see the answer.

## License of this document

This privacy policy is dedicated to the public domain under [Creative Commons CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). You are welcome to copy it, adapt it, and reuse it for your own zero-collection project without attribution.

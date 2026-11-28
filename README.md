# MeowHome

MeowHome connects cat owners and prospective adopters. One account can publish a cat, apply for another user's cat, track applications and keep an adoption diary. The interface supports English and Traditional Chinese.

## Run locally

Install Node.js 22.13 or later and npm. From the project root, run:

```sh
cd source
npm ci
npm run db:seed
npm start
```

Open [MeowHome on localhost](http://127.0.0.1:3000/). The server serves both the pages and the API. For development, `npm run dev` restarts the server when server files change.

On an empty database, `db:seed` creates the tables and loads two accounts, seven available cats and one completed adoption with a public diary. If accounts already exist, the command preserves them and skips the sample records. To start with an empty site, use `npm run db:init` instead of `db:seed`.

## Test accounts

| Account | Email | Password |
| --- | --- | --- |
| Alex, owner of the listed cats | rehomer@example.test | MeowHome2026! |
| Sam, adopter of Honey | adopter@example.test | MeowHome2026! |

These credentials are for a local demonstration database. Use separate browser sessions for Alex and Sam, such as a regular window and a private window.

## Try an adoption

1. As Sam, open **Find a cat**, filter the listings and open Mochi. Submit an application and confirm permission to share it with the rehomer. Sam can edit or withdraw it under **My applications**.
2. As Alex, open **My listings**, review Mochi's applications and accept Sam's request. Refresh discovery in Sam's window. Mochi is now reserved and disappears from discovery.
3. As Alex, confirm the handover. Mochi becomes adopted, Sam's application is completed and other outstanding requests for Mochi close in the same transaction.
4. As Sam, open **My diaries** and write about Mochi. A private entry appears in Sam's dashboard. Making it public adds it to **Adoption diaries**. Honey's existing entry provides a completed example.
5. To try publishing, choose **Rehome a cat**, enter the cat's details and upload a JPG, PNG or WebP image. Sample photographs are included in `source/client/assets/sample-cats/`. Refresh the site or restart the server to check that the listing remains available.

Users can also register, change their nickname, upload or reset their avatar, change their password, save favourites, take a five-question matching quiz and track their care preparation checklist.

## Code and storage

| Location | Responsibility |
| --- | --- |
| `source/client/` | Nine HTML pages, CSS, JavaScript and static assets. Page scripts use `js/store.js` for API calls. |
| `source/server/` | Express app, session authentication, input validation and routes for each feature. |
| `source/database/schema.sql` | SQLite tables, foreign keys and unique indexes. |
| `source/database/seed.sql` | Sample records loaded by the optional seed command. |
| `source/tests/api.test.js` | HTTP integration tests using a temporary database and upload directory. |

The four core tables are `users`, `cats`, `applications` and `diaries`. SQLite stores form data and image paths. Uploaded image files live in the uploads directory. The server checks ownership before updating records. Photos uploaded exclusively for private diaries are accessible only to their authors. A listing photo reused in a diary also remains visible on its original listing.

Local defaults are listed below. To override them, copy `source/.env.example` to `source/.env`. Relative paths are resolved from `source/`.

| Variable | Default | Purpose |
| --- | --- | --- |
| HOST | 127.0.0.1 | Listening address |
| PORT | 3000 | HTTP port |
| DATABASE_FILE | database/meowhome.sqlite | SQLite database file |
| UPLOAD_DIRECTORY | database/uploads | Uploaded cat photos, avatars and diary images |
| PUBLIC_ORIGIN | unset | External origin when using an HTTPS reverse proxy, e.g. `https://meowhome.example.org` |

A new checkout creates its own database. To move an existing installation, stop the server and copy the database directory, including uploads. Keep the database and images on persistent storage. MeowHome runs as a single server instance. Updates from another session appear on refresh. Users arrange handover using the contact details in the application workflow.

## Tests and references

From `source/`, run `npm test`. Tests cover registration, listing CRUD, search and pagination, consent and optional fields, duplicate applications, competing acceptances, handover, diary visibility and image access, avatars, password changes, favourites, checklists and persistence across server restarts.

[API reference](docs/api.md) · [Test cases](docs/testing.md) · [Photo and asset credits](ASSETS.md)

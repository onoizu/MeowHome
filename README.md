# MeowHome

MeowHome is a peer-to-peer cat adoption and rehoming web application. One account can publish cat listings, apply to adopt other users' cats, and share diaries after an adoption is completed. Accounts, listings, applications, diaries, favourites and preparation checklists are stored in SQLite.

The interface uses separate HTML, CSS and vanilla JavaScript files, with English and Traditional Chinese support. A small Express server serves both the pages and the JSON API. There is no frontend framework, build step or ORM.

## Run locally

Install **Node.js 22.13.0 or later** and npm. The current implementation was verified with Node.js 25.5.0.

```sh
git clone https://github.com/onoizu/MeowHome.git
cd MeowHome/source
npm ci
npm run db:init
npm run dev
```

Open **http://127.0.0.1:3000/**. `npm run dev` watches server files and restarts the backend when they change. Refresh the browser after editing client files. Use `npm start` to run without file watching, and press Ctrl+C to stop.

Always open the website through this server address. Opening an HTML file directly, or serving only `client/` with Live Server, will not connect the pages to the database.

### Configuration and data

No API key or separate database service is required. Defaults are:

```text
HOST=127.0.0.1
PORT=3000
DATABASE_FILE=database/meowhome.sqlite
UPLOAD_DIRECTORY=database/uploads
```

To override them, copy `.env.example` to `.env` inside `source/` and edit the values. Relative database and upload paths are resolved from `source/`.

- `db:init` creates missing tables without clearing existing data. Server startup also initialises the schema.
- A fresh database contains **no accounts, cats or diaries**. Register an account and publish a listing to get started. `seed.sql` intentionally inserts no sample business records.
- Database files, uploaded images, `.env` and `node_modules/` are ignored by Git. Existing records on another member's computer are not included when cloning this repository.
- Ten real cat photographs are included in `client/assets/sample-cats/`. Select them in the image upload field when publishing a cat or writing a diary. They do not create listings automatically. See the [photo credits](source/client/assets/sample-cats/SOURCES.md).
- Restarting the server preserves existing data. To transfer an existing local dataset separately, stop the server first and keep the SQLite database and its uploads directory together.

## Implemented features

- **Accounts:** registration, password login, logout, profile editing and conditional account deletion. The same user can be both an adopter and a rehomer.
- **Discovery:** search, detailed breed filters, age, gender and location filters, sorting and six listings per page. Filters and page selection are reflected in the URL.
- **Cat listings:** photographs, care information, adoption requirements and a three-step publish form with preview. Owners can edit available listings and delete them when no active applications remain.
- **Applications:** submit, edit, withdraw, review, accept, cancel acceptance and confirm handover. Applicant and rehomer dashboards show the relevant records and actions.
- **Adoption diaries:** completed adopters can create, edit and delete entries linked to their cats, with public or private visibility.
- **Supporting tools:** database-backed favourites and a preparation checklist, static beginner care guides, and a five-question matching quiz with explained rule-based results.
- **Interface:** English/Traditional Chinese switching, responsive navigation with dropdowns, a personal dashboard, and homepage scroll reveals, image movement and an interactive adoption-process section.

## Try a complete adoption

1. Register account A. Open **Rehome a cat**, fill in the cat's information, upload a JPG/PNG/WebP photograph, preview and publish. The listing becomes available immediately.
2. In a different browser or a private window, register account B. Find A's cat and submit an application. Contact name, email, experience and the form's consent checkbox are required. Home description and adoption plans are optional. B can edit a pending application or withdraw it.
3. A opens **My listings**, reviews the incoming application and accepts B. The cat is reserved and disappears from public home/discovery/matching results. B can see A's contact email for arranging the handover.
4. After the handover, A selects **Confirm handover**. B's application becomes completed, the cat becomes adopted, and the other pending/contacting applications for this cat are closed together.
5. B opens **My diaries** and writes an update. A private entry is returned only to its author; a public entry also appears on the adoption diaries page.
6. Refresh both sessions or restart the server to check that the records persist. Each session reads the same database; accounts do not share favourites or checklist selections.

There is no automatic email delivery or chat. Users communicate through the email addresses provided in the application workflow.

## Adoption and permission rules

Cat status follows `available → reserved → adopted`. Applications use `pending`, `contacting`, `accepted`, `completed`, `rejected`, `withdrawn` and `closed`.

- Submitting an application keeps the cat available. Only accepting an application reserves it. A rehomer can accept directly from pending or after marking the application as contacting.
- Before handover, the applicant can withdraw an accepted application, or the rehomer can cancel acceptance. The cat becomes available again and the other applications are retained.
- A user cannot apply for their own cat or hold duplicate active applications for the same cat. A cat can have at most one accepted/completed application.
- Only the rehomer can confirm handover. Completed adoption records are retained; completed applications cannot be edited, withdrawn or deleted.
- Applications are returned only to their applicant and the cat's owner. Server-side checks enforce ownership even if someone bypasses the interface.
- Diaries can be created only by the cat's completed adopter, and only their author can edit or delete them. The linked cat cannot be changed when editing.
- Cat editing is limited to available listings. Deletion requires no active applications; reserved/adopted listings and accounts linked to completed adoption history are retained.
- Home/discovery/matching pages show only available cats. Saved links and personal records can still open reserved/adopted details. The public cat API returns these statuses too; removing a listing from discovery is not a privacy control.

## Project structure

```text
MeowHome/
├── README.md
├── ASSETS.md                         Image credits and design references
├── ai-use.md                         AI assistance and student review record
├── docs/
│   ├── MeowHome_Implementation_Handoff.docx
│   ├── api.md                        Endpoint details (Chinese)
│   ├── testing.md                    Test evidence and manual checks (Chinese)
│   └── sample-listings.md            Notes about the original local dataset
└── source/
    ├── package.json
    ├── package-lock.json
    ├── .env.example
    ├── client/
    │   ├── *.html                    Nine page entry points
    │   ├── css/                      Shared and page-specific styles
    │   ├── js/                       Shared utilities and page scripts
    │   └── assets/                   Static photos, SVGs and photo credits
    ├── server/
    │   ├── index.js                  Server startup and shutdown
    │   ├── app.js                    Middleware, static files, routes and errors
    │   ├── database.js               SQLite connection and transactions
    │   ├── auth.js                   Password hashing, sessions and login checks
    │   ├── validation.js             Server input validation
    │   ├── images.js                 Image validation and file storage
    │   └── routes/
    │       ├── accounts.js           Authentication and profile operations
    │       ├── cats.js               Cat listing CRUD
    │       ├── applications.js       Applications and adoption transitions
    │       ├── diaries.js            Diary CRUD and visibility
    │       └── preferences.js        Favourites and checklist
    ├── database/
    │   ├── schema.sql               Tables, foreign keys and unique indexes
    │   ├── seed.sql                 Empty initial business dataset
    │   ├── init.js                  Database initialisation command
    │   ├── meowhome.sqlite          Runtime file, not committed
    │   └── uploads/                 Runtime images, not committed
    └── tests/
        └── api.test.js              HTTP integration tests with temporary data
```

### Client files

The nine pages are `index.html` (home), `discover.html` (search), `cat.html` (details/application), `rehome.html` (publish/edit), `dashboard.html` (personal records), `stories.html` (public diaries), `login.html` (login/register), `match.html` (quiz) and `guides.html` (care/checklist).

- `css/base.css`: shared typography, navigation, forms, buttons and cards.
- `css/home.css`: homepage sections, transitions, image movement and responsive layout.
- `css/discover.css`: sticky left filter panel, results grid and pagination.
- `css/pages.css`: detail, dashboard, publish, login, quiz and guide layouts.
- `js/data.js`: fixed breed options, quiz questions and checklist text; no business records.
- `js/store.js`: Fetch requests and the current page's in-memory data. Page scripts wait for `MeowStore.ready`; successful writes reload server state.
- `js/common.js`: shared navigation, cards, dialogs, image compression and notifications.
- `js/translations.js` and `js/i18n.js`: interface translations. Only the language preference is saved in localStorage. User-written content is not translated automatically.
- The remaining scripts are named after their page and handle its interactions.

### Data and request flow

The four core entities are `users`, `cats`, `applications` and `diaries`. A user owns many cats and submits many applications; each application refers to one cat. A completed cat records its adopter, and its diaries refer to both that cat and their author. `sessions`, `favourites` and `checklist` are supporting tables.

Page action → `store.js` Fetch request → Express route → input/permission checks → parameterised SQLite queries → JSON response → reload state and render. Multi-record adoption changes run inside one transaction. Foreign keys and partial unique indexes protect the relationships and prevent conflicting acceptances.

Passwords use salted Node.js `scrypt` hashes. Sessions are stored in SQLite, with a hashed token in the database and an HttpOnly, SameSite cookie in the browser. Mutations require JSON, a custom request header and an allowed request origin. Uploaded images are compressed in the browser, then checked again on the server for type, signature and a 5 MB file limit; the database stores the image path.

Main API groups are `/api/auth/*`, `/api/profile`, `/api/cats`, `/api/applications`, `/api/stories`, `/api/favourites` and `/api/checklist`. Full methods, payloads and error responses are in [the API notes](docs/api.md).

## Verification

```sh
cd source
npm test
```

The test creates a temporary SQLite database and real HTTP sessions, then removes the temporary data. It does not insert accounts into the everyday database. On 2 November 2026, all **nine subtests passed** (Node reports ten tests including the enclosing flow), covering:

- Registration, login, password hashing and session cookies.
- Publishing/editing, image validation and ownership.
- Application creation/editing, privacy and duplicate prevention.
- Competing acceptance, cancellation and handover consistency.
- Diary CRUD, public/private visibility and author access.
- Profiles, favourites, checklist and request-source checks.
- Persistence across restart and session revocation after logout.
- Withdrawing/deleting applications and deleting unused listings.
- Optional home/adoption-plan fields, including omission, short text, clearing and length limits.

Browser checks also cover the two-account adoption workflow, all nine pages at mobile width, language switching, available-only public listings, homepage interactions and reduced-motion layout. See [the verification notes](docs/testing.md) for reproducible steps and scope.

## Current limits and handoff

- No administrator approval, password reset, email verification, email sending or live chat is implemented. Listings are public as soon as their owner publishes them.
- Guides are static. Matching is a local rule-based score, not an AI model or a guarantee of suitability.
- Search, sorting and pagination run in the browser after fetching listings. State refreshes on page load and after changes; other users refresh to see updates. There is no real-time push.
- Old uploaded files are not automatically removed when a listing image is replaced or a record is deleted.
- `CREATE TABLE IF NOT EXISTS` initialises the schema but is not a schema-migration system. Back up existing data before changing table definitions.

The [Word handoff document](docs/MeowHome_Implementation_Handoff.docx) explains the current implementation in Chinese for the other group member. The final `report.pdf` and signed `contribution-declaration.pdf` still need to be prepared from the group's actual work. Keep [ai-use.md](ai-use.md) accurate when making further changes, and consult [ASSETS.md](ASSETS.md) for sources and credits.

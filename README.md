# Uma Musume Frontend

Frontend web application for the Uma Musume database, built with **React** and **Vite**.

The frontend communicates with a dedicated backend API and does not directly access the database.

## Technologies

* **React 19** — UI framework
* **Vite 8** — Development server and build tooling
* **Microsoft Authentication Library (MSAL)** — Microsoft Entra ID authentication
* **Tailwind CSS** — Styling
* **Lucide React** — Icons
* **ESLint** — Code linting
* **PostCSS / Autoprefixer** — CSS processing

## Authentication

Authentication is handled through **Microsoft Entra ID** using `@azure/msal-browser`.

The application uses the browser-based `PublicClientApplication` flow. Authentication configuration is located in `src/authConfig.js`.

No client secrets or other confidential credentials are stored in the frontend.

## Backend API

The frontend communicates with the backend through an HTTPS API.

```text
Browser
   ?
   ? Microsoft Entra ID
   ?
 MSAL Authentication
   ?
   ? HTTPS
   ?
 Nginx
   ?
   ?
 Backend API
   ?
   ?
 Database
```

The frontend does not communicate directly with the database.

## Development

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Build the production frontend:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Run ESLint:

```bash
npm run lint
```

## Production Deployment

The production frontend is hosted independently behind **Nginx** on a dedicated server.

Deployment is performed manually. GitHub Pages deployment is not used.

The production build is generated with:

```bash
npm run build
```

The resulting `dist/` directory can then be deployed to the web server.

## Project Structure

The frontend is responsible for:

* Rendering the web interface
* User authentication
* Communicating with the backend API
* Displaying data returned by the API

Database access and backend processing are handled by the separate API service.

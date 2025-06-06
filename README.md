# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## OpenAI API Key

This project uses the OpenAI API. Create a `.env` file in the project root with the following contents:

```bash
VITE_OPENAI_API_KEY=your-api-key
```

The `.env` file is ignored by Git so your API key remains private. See `.env.example` for the expected variable name.

## Running the development server

Two processes are required: one for the Vite dev server and one for the API proxy.

```bash
npm run server    # starts the proxy on http://localhost:3001
npm run dev       # starts the Vite dev server
# or run both together
npm start
```

The front-end proxies `/api` requests to the Node server which communicates with OpenAI, avoiding browser CORS issues.

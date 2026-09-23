import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // or '@vitejs/react-refresh'
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './', // 👈 MAKE SURE THIS HAS SLASHES ON BOTH SIDES
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                redirect: resolve(__dirname, "redirect.html")
            }
        }
    }
});
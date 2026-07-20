import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // or '@vitejs/react-refresh'

export default defineConfig({
  plugins: [react()],
  base: './', // 👈 MAKE SURE THIS HAS SLASHES ON BOTH SIDES
})
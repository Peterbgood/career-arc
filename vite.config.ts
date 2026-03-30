import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // or your current tailwind plugin

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/career-arc/', // THIS MUST MATCH YOUR REPO NAME
})
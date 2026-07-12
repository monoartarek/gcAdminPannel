// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({

//   //  change or remove this base on others app     
//   base: '/PriyuNewUpdatedAdminPanel3dhdie78/', 


//   plugins: [react()],
//    resolve: {
//     alias: {
//       parse: "parse/dist/parse.js",
//     },
//   },
// })


import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // change or remove this base on others app     
  base: '/PriyuNewUpdatedAdminPanel3dhdie78/', 
  plugins: [react()],
  resolve: {
    alias: {
      parse: "parse/dist/parse.js",
    },
  },
  server: {
    proxy: {
      '/gravix-token': {
        target: 'https://token.gravixcloud.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gravix-token/, '/v1/token'),
      },
    },
  },
})
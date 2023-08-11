import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/kit/vite';
const dev = process.env.NODE_ENV === 'development';
/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
    adapter: adapter({
      // default options are shown. On some platforms
      // these options are set automatically — see below
      pages: 'docs',
      assets: 'docs',
      fallback: 'index.html',
      precompress: false,
      strict: true
    }),
    alias: {
      src: 'src'
    },
  },
  ssr: false,
  vitePlugin: {
    inspector: {
      holdMode: true,
      toggleKeyCombo: 'meta-shift',
      showToggleButton: 'always',
    }
  },

};

export default config;

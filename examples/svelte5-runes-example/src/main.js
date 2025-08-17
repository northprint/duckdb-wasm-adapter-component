import { mount } from 'svelte';
import App from './App.svelte';
// import App from './SimpleApp.svelte';

console.log('main.js loaded');
console.log('Target element:', document.getElementById('app'));

let app;

try {
  app = mount(App, {
    target: document.getElementById('app'),
  });
  console.log('App mounted successfully:', app);
  
  window.app = app; // For debugging
} catch (error) {
  console.error('Failed to mount app:', error);
  document.getElementById('app').innerHTML = `<h1>Error: ${error.message}</h1><pre>${error.stack}</pre>`;
}

export default app;
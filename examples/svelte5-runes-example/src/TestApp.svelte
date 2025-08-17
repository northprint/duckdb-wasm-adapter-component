<script>
  console.log('TestApp mounted!');
  
  let count = $state(0);
  
  function increment() {
    count++;
    console.log('Count:', count);
  }
</script>

<main>
  <h1>Test Svelte 5 App</h1>
  <p>Count: {count}</p>
  <button onclick={increment}>Increment</button>
</main>

<style>
  main {
    padding: 2rem;
    text-align: center;
  }
  
  h1 {
    color: #ff3e00;
  }
  
  button {
    padding: 0.5rem 1rem;
    background: #ff3e00;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover {
    background: #ff5733;
  }
</style>
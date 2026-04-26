// Example of using binu-tunnel programmatically
const { TunnelClient } = require('binu-tunnel');

// Create a new tunnel client
const client = new TunnelClient({
  localPort: 3000,
  subdomain: 'myapp', // optional - will be randomly generated if not provided
  // apiKey: 'YOUR_API_KEY' // optional - if required by the server
});

// Connect to the tunnel server
client.connect()
  .then(() => {
    console.log('Tunnel connected successfully!');
  })
  .catch(err => {
    console.error('Failed to connect to tunnel server:', err);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down tunnel...');
  client.disconnect();
  process.exit(0);
});

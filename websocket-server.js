// websocket-server.js
const WebSocket = require('ws');

// Create a WebSocket server instance
const wss = new WebSocket.Server({ port: 8080 });

// Set up event listeners for different WebSocket events
wss.on('connection', (ws) => {
  console.log('Client connected');

  // Listen for messages from clients
  ws.on('message', (message) => {
    console.log(`Received: ${message}`);
    // Echo the received message back to the client
    ws.send(`Server: You said "${message}"`);
  });

  // Listen for the connection close event
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log('WebSocket server is running on port 8080');

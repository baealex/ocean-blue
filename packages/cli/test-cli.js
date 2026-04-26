#!/usr/bin/env node

// This is a simple test script to verify that the binu-tunnel CLI works correctly
const { spawn } = require('child_process');
const path = require('path');

// Path to the CLI script
const cliPath = path.join(__dirname, 'dist', 'cli.js');

// Run the CLI with the help command
const cli = spawn('node', [cliPath, 'help']);

// Listen for output
cli.stdout.on('data', (data) => {
  console.log(`Output: ${data}`);
});

cli.stderr.on('data', (data) => {
  console.error(`Error: ${data}`);
});

cli.on('close', (code) => {
  console.log(`CLI exited with code ${code}`);
});

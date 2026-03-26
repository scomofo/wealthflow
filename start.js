// Launcher script - clears ELECTRON_RUN_AS_NODE so Electron
// initializes properly (VS Code sets this in its terminal)
delete process.env.ELECTRON_RUN_AS_NODE;

const { spawn } = require('child_process');
const electron = require('electron');

const child = spawn(electron, ['.'], { stdio: 'inherit' });
child.on('close', (code) => process.exit(code ?? 1));

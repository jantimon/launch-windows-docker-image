/// @ts-check
const child_process = require('child_process');

/**
 * Promisified spawn
 * @param {string} command
 * @param {ReadonlyArray<string>} args 
 * @param {import('child_process').SpawnOptions} options 
 */
const spawn = (command, args, options) => new Promise((resolve, reject) => {
  const process = child_process.spawn(command, args, options);
  process.on('close', resolve);
  process.on('exit', resolve);
  process.on('error', reject);
});

module.exports = {
  spawn
}
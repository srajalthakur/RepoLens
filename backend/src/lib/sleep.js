// Pauses execution for a given number of milliseconds
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  module.exports = { sleep };
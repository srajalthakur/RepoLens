let _io = null;

// Called once during server startup to store the io instance
function initSocket(io) {
  _io = io;
}

// Emits an event to all clients watching a specific job
function emitToJob(jobId, event, data) {
  if (!_io) {
    console.warn('Socket.io not initialized');
    return;
  }
  _io.to(jobId).emit(event, data);
}

// Returns the raw io instance (for advanced use)
function getIO() {
  return _io;
}

module.exports = { initSocket, emitToJob, getIO };
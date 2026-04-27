import { useState } from 'react'
import { useSocket } from '../hooks/useSocket'
import api from '../lib/api'

/**
 * Temporary test page — we'll delete this after Phase 4.
 * Visit http://localhost:5173/socket-test to use it.
 */
export default function SocketTest() {
  const [jobId, setJobId] = useState('test-job-123')
  const [activeJobId, setActiveJobId] = useState(null)
  const { connected, messages } = useSocket(activeJobId)

  const handleJoin = () => {
    setActiveJobId(jobId)
  }

  const handleSendTestEvent = async () => {
    // Triggers the backend to emit a test event to this job room
    await api.post(`/test-socket/${jobId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Phase 4 — WebSocket Test
        </h1>

        {/* Connection status */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {connected ? `Connected to room: ${activeJobId}` : 'Not connected'}
          </span>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            placeholder="Job ID (room name)"
          />
          <button
            onClick={handleJoin}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Join Room
          </button>
          <button
            onClick={handleSendTestEvent}
            disabled={!connected}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Send Test Event
          </button>
        </div>

        {/* Message log */}
        <div className="bg-gray-900 rounded-xl p-4 font-mono text-sm min-h-48">
          {messages.length === 0 ? (
            <p className="text-gray-500">Waiting for events...</p>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className="text-green-400 mb-1">
                [{new Date(msg.time).toLocaleTimeString()}] {msg.type}: {msg.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
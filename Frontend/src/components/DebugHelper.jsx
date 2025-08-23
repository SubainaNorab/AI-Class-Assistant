// Frontend/src/components/DebugHelper.jsx
// Temporary component to help debug the file loading issue

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const DebugHelper = ({ onClose }) => {
  const [debugData, setDebugData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const testUploadsEndpoint = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/uploads?user_id=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      setDebugData({
        endpoint: '/uploads',
        status: response.status,
        data: data,
        user_id: user.id
      });
    } catch (error) {
      setDebugData({
        endpoint: '/uploads',
        error: error.message,
        user_id: user.id
      });
    }
    setLoading(false);
  };

  const testDebugEndpoint = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/debug/files');
      const data = await response.json();
      setDebugData({
        endpoint: '/debug/files',
        status: response.status,
        data: data
      });
    } catch (error) {
      setDebugData({
        endpoint: '/debug/files',
        error: error.message
      });
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '800px',
        maxHeight: '80vh',
        overflow: 'auto',
        width: '100%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>🔍 Debug Helper</h2>
          <button onClick={onClose} style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer' 
          }}>×</button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>User Info:</h3>
          <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
            {JSON.stringify({ id: user.id, email: user.email, name: user.full_name }, null, 2)}
          </pre>
        </div>

        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button 
            onClick={testUploadsEndpoint} 
            disabled={loading}
            style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Test /uploads endpoint
          </button>
          <button 
            onClick={testDebugEndpoint} 
            disabled={loading}
            style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Test /debug/files endpoint
          </button>
        </div>

        {loading && <p>Loading...</p>}

        {debugData && (
          <div>
            <h3>Response from {debugData.endpoint}:</h3>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '10px', 
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '400px'
            }}>
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugHelper;
import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [baseImage, setBaseImage] = useState('');
  const [packages, setPackages] = useState('');
  const [memRequest, setMemRequest] = useState('');
  const [cpuRequest, setCpuRequest] = useState('');
  const [gpuRequest, setGpuRequest] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      event_type: 'deploy-environment', // Custom event to trigger GitHub Actions workflow
      client_payload: {
        baseImage,
        packages,
        memRequest,
        cpuRequest,
        gpuRequest,
      }
    };

    try {
      await axios.post(
        'https://api.github.com/repos/marysoniaugokwe/intw-tsks/dispatches',
        payload,
        {
          headers: {
            'Accept': 'application/vnd.github.everest-preview+json',
            'Authorization': `Bearer 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`
          }
        }
      );
      alert('Deployment triggered successfully!');
    } catch (error) {
      console.error(error);
      alert('Error triggering deployment');
    }
  };

  return (
    <div className="App">
      <h1>Deploy Development Environment</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Base Image:</label>
          <input
            type="text"
            value={baseImage}
            onChange={(e) => setBaseImage(e.target.value)}
          />
        </div>
        <div>
          <label>Packages:</label>
          <input
            type="text"
            value={packages}
            onChange={(e) => setPackages(e.target.value)}
          />
        </div>
        <div>
          <label>Memory Request:</label>
          <input
            type="text"
            value={memRequest}
            onChange={(e) => setMemRequest(e.target.value)}
          />
        </div>
        <div>
          <label>CPU Request:</label>
          <input
            type="text"
            value={cpuRequest}
            onChange={(e) => setCpuRequest(e.target.value)}
          />
        </div>
        <div>
          <label>GPU Request:</label>
          <input
            type="text"
            value={gpuRequest}
            onChange={(e) => setGpuRequest(e.target.value)}
          />
        </div>
        <button type="submit">Deploy</button>
      </form>
    </div>
  );
}

export default App;


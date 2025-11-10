import { useEffect, useState } from 'react';

function App() {
  const [apiStatus, setApiStatus] = useState<string>('Loading...');

  useEffect(() => {
    fetch('http://localhost:3000/api/health')
      .then((res) => res.json())
      .then((data) => setApiStatus(data.status))
      .catch((err) => {
        console.error(err);
        setApiStatus('Error reaching API');
      });
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem' }}>
      <h1>Expense Dashboard (WIP)</h1>
      <p>Backend status: {apiStatus}</p>
    </div>
  );
}

export default App;

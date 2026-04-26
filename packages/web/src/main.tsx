import React from 'react';
import ReactDOM from 'react-dom/client';

import App from '~/app/entry';

import './styles/tailwind.css';
import './styles/background.css';

if (import.meta.env.MODE === 'development') {
    void import('react-grab');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

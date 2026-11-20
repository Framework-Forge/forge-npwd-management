import React from 'react';
import ReactDOM from 'react-dom';
import '../forge-npwd.config';
import App from './App';
import { MemoryRouter } from 'react-router-dom';

if (import.meta.env.DEV) {
  ReactDOM.render(
    <MemoryRouter initialEntries={['/forge-npwd-management']}>
      <App />
    </MemoryRouter>,
    document.getElementById('root'),
  );
}

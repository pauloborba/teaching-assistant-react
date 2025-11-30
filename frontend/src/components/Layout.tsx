import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const Layout: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Teaching Assistant</h1>
      </header>

      <div className="app-body">
        <nav className="sidebar">
          <ul>
            <li><NavLink to="/students" className={({ isActive }) => isActive ? 'active' : ''}>Students</NavLink></li>
            <li><NavLink to="/classes" className={({ isActive }) => isActive ? 'active' : ''}>Classes</NavLink></li>
            <li><NavLink to="/evaluations" className={({ isActive }) => isActive ? 'active' : ''}>Evaluations</NavLink></li>
          </ul>
        </nav>

        <section className="content">
          {children ?? <Outlet />}
        </section>
      </div>
    </div>
  );
};

export default Layout;

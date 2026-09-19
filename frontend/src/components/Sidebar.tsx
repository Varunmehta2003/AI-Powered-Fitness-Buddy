import { NavLink } from 'react-router-dom';

const sideLinks = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/chat', label: 'Chat with AI', icon: '💬' },
  { to: '/workout', label: 'Workout', icon: '🏋️' },
  { to: '/nutrition', label: 'Nutrition', icon: '🥗' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">💪</span>
        <div>
          <div className="sidebar-title">Fitness Buddy</div>
          <div className="sidebar-subtitle">AI-Powered</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sideLinks.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' active' : ''}`
            }
          >
            <span className="sidebar-icon">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-powered">
          <span>Powered by</span>
          <strong> IBM watsonx</strong>
        </div>
      </div>
    </aside>
  );
}

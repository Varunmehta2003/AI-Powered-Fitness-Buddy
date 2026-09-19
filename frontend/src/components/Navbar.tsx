import { Link, useLocation } from 'react-router-dom';

const navLinks = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/chat', label: 'Chat', icon: '💬' },
  { to: '/workout', label: 'Workout', icon: '🏋️' },
  { to: '/nutrition', label: 'Nutrition', icon: '🥗' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">💪</span>
        <span className="navbar-title">Fitness Buddy</span>
        <span className="navbar-badge">AI</span>
      </div>
      <div className="navbar-links">
        {navLinks.map(({ to, label, icon }) => (
          <Link
            key={to}
            to={to}
            className={`navbar-link${location.pathname === to ? ' active' : ''}`}
          >
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

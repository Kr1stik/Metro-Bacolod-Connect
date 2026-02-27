import { useNavigate } from 'react-router-dom';
import logo from '../assets/MBC Logo.png';

interface PublicNavbarProps {
  onLoginClick: () => void;
}

/**
 * Shared Public Navbar
 * Used across LandingPage, Properties, Professionals, Services, Resources
 */
export default function PublicNavbar({ onLoginClick }: PublicNavbarProps) {
  const navigate = useNavigate();

  return (
    <nav
      className="landing-nav"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        padding: '20px 5%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 50,
        background: 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
        <img
          src={logo}
          alt="Logo"
          style={{ width: '50px', height: 'auto', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        />
        <div className="nav-links" style={{ display: 'flex', gap: '30px' }}>
          {['Properties', 'Professionals', 'Services', 'Resources'].map((item) => (
            <span
              key={item}
              onClick={() => navigate(`/${item.toLowerCase()}`)}
              className="nav-link-item"
              style={{
                color: '#1d1d1f',
                fontWeight: '600',
                fontSize: '0.9rem',
                opacity: 0.7,
                transition: '0.2s',
                textDecoration: 'none',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
      <div className="nav-buttons" style={{ display: 'flex', gap: '15px' }}>
        <button
          onClick={onLoginClick}
          className="hero-btn hero-btn-outline"
          style={{
            background: 'transparent',
            border: '1px solid #1d1d1f',
            color: '#1d1d1f',
            padding: '12px 35px',
            fontSize: '0.9rem',
            fontWeight: '700',
            borderRadius: '50px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          LOGIN
        </button>
        <button
          onClick={() => navigate('/register')}
          className="hero-btn hero-btn-filled"
          style={{
            background: '#1d1d1f',
            color: 'white',
            padding: '12px 35px',
            fontSize: '0.9rem',
            fontWeight: '700',
            borderRadius: '50px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px 0 rgba(0,0,0,0.25)',
            transition: 'all 0.3s ease',
          }}
        >
          CREATE ACCOUNT
        </button>
      </div>
    </nav>
  );
}


import type { User } from 'firebase/auth';
import { FcGoogle } from 'react-icons/fc';

interface AuthProps {
  user: User | null;
  handleSignIn: () => void;
  handleSignOut: () => void;
}

const Auth = ({ user, handleSignIn, handleSignOut }: AuthProps) => {
  return (
    <div className="auth-container">
      {user ? (
        <div className="flex items-center gap-2">
          <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full" />
          <button onClick={handleSignOut} className="glass-button secondary">
            Sign Out
          </button>
        </div>
      ) : (
        <button onClick={handleSignIn} className="glass-button primary flex items-center gap-2">
          <FcGoogle />
          Sign in with Google
        </button>
      )}
    </div>
  );
};

export default Auth;

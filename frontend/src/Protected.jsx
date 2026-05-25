import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useUserStore from './store/useUserStore';
import { useEffect, useState } from 'react';
import { checkUserAuth } from './services/user.service';
import Loader from './utils/Loader';

export const ProtectedRoute = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [authDone, setAuthDone] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const { isAuthenticated, setUser, clearUser } = useUserStore();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const result = await checkUserAuth();
        if (result?.isAuthenticated) {
          setUser(result.user);
        } else {
          clearUser();
        }
      } catch (error) {
        console.log(error);
        clearUser();
      } finally {
        setAuthDone(true);
      }
    };

    verifyAuth();
  }, [setUser, clearUser]);

  useEffect(() => {
    let interval;
    if (progress < 100) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          // Increment progress. If auth verification is done, speed up, otherwise count up steadily
          const step = authDone ? 8 : 3;
          const increment = Math.floor(Math.random() * step) + 2;
          return Math.min(prev + increment, 100);
        });
      }, 60);
    } else if (authDone && progress === 100) {
      setIsChecking(false);
    }
    return () => clearInterval(interval);
  }, [progress, authDone]);

  if (isChecking) {
    return <Loader progress={progress} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/user-login" state={{ from: location }} replace />;
  }

  // user is authenticate and render the protected component
  return <Outlet />;
};

export const PublicRoute = () => {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

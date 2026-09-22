import { Navigate, Outlet } from 'react-router';
import { useAppSelector } from 'redux/hooks';

const IfLoggedIn = ({ redirectTo }: { redirectTo: string }) => {
  const isLoggedIn = useAppSelector((state) => state.user.loggedIn);
  const sessionLoaded = useAppSelector((state) => state.user.sessionLoaded);
  if (!sessionLoaded) return null;
  return isLoggedIn ? <Navigate to={redirectTo} replace /> : <Outlet />;
};

export default IfLoggedIn;

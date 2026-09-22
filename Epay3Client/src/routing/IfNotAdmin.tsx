import { Navigate, Outlet } from 'react-router';
import { useAppSelector } from 'redux/hooks';
import { userSelector } from 'redux/reducers';
import UserRole from 'types/UserRole';

const IfNotAdmin = ({ redirectTo }: { redirectTo: string }) => {
  const sessionLoaded = useAppSelector((state) => state.user.sessionLoaded);
  const user = useAppSelector(userSelector);
  if (!sessionLoaded) return null;
  const isAdmin = UserRole.isAdmin(user?.role);

  return !isAdmin ? <Navigate to={redirectTo} replace /> : <Outlet />;
};

export default IfNotAdmin;

import { Switch, Route, Redirect } from "wouter";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Login from "@/pages/login";
import DashboardPage from "@/pages/dashboard";

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route><Redirect to="/login" /></Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route><Redirect to="/" /></Route>
    </Switch>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

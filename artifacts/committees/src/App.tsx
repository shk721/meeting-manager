import { Router, Switch, Route, Redirect } from "wouter";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Login from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import CommitteeDetailPage from "@/pages/committee-detail";
import PortalPage from "@/pages/portal";

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Switch>
        <Route path="/portal" component={PortalPage} />
        <Route path="/login" component={Login} />
        <Route><Redirect to="/login" /></Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/committees/:id" component={CommitteeDetailPage} />
      <Route path="/portal" component={PortalPage} />
      <Route><Redirect to="/" /></Route>
    </Switch>
  );
}

// BASE_URL is "/committees/" in production (set via BASE_PATH env), "/" in dev
const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function App() {
  return (
    <AuthProvider>
      <Router base={base}>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

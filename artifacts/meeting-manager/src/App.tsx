import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Meetings from "@/pages/meetings";
import MeetingDetail from "@/pages/meetings/[id]";
import Tasks from "@/pages/tasks";
import Minutes from "@/pages/minutes";
import UsersPage from "@/pages/users";
import HubPage from "@/pages/hub";
import Layout from "@/components/layout";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, ...rest }: { component: any, [key: string]: any }) {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
            <Route path="/hub" component={() => <ProtectedRoute component={HubPage} />} />
            <Route path="/meetings" component={() => <ProtectedRoute component={Meetings} />} />
            <Route path="/meetings/:id">{(params) => <ProtectedRoute component={MeetingDetail} id={params.id} />}</Route>
            <Route path="/tasks" component={() => <ProtectedRoute component={Tasks} />} />
            <Route path="/minutes" component={() => <ProtectedRoute component={Minutes} />} />
            <Route path="/users" component={() => <ProtectedRoute component={UsersPage} />} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

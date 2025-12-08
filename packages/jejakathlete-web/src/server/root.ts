import { router } from './trpc';
import { authRouter } from './routers/auth';
import { profilesRouter } from './routers/profiles';
import { enrollmentsRouter } from './routers/enrollments';
import { bodyMetricsRouter } from './routers/bodyMetrics';
import { testResultsRouter } from './routers/testResults';
import { workoutsRouter } from './routers/workouts';
import { eventsRouter } from './routers/events';
import { notificationsRouter } from './routers/notifications';
import { dashboardRouter } from './routers/dashboard';

export const appRouter = router({
  auth: authRouter,
  profiles: profilesRouter,
  enrollments: enrollmentsRouter,
  bodyMetrics: bodyMetricsRouter,
  testResults: testResultsRouter,
  workouts: workoutsRouter,
  events: eventsRouter,
  notifications: notificationsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;

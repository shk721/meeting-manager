import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import meetingsRouter from "./meetings";
import minutesRouter from "./minutes";
import decisionsRouter from "./decisions";
import tasksRouter from "./tasks";
import dashboardRouter from "./dashboard";
import seedRouter from "./seed";
import dtProjectsRouter from "./dt-projects";
import portalRouter from "./portal";
import committeesRouter from "./committees";
import { requireAuth } from "../middleware/require-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(seedRouter);
router.use(authRouter);
router.use(portalRouter);
router.use(requireAuth);
router.use(usersRouter);
router.use(meetingsRouter);
router.use(minutesRouter);
router.use(decisionsRouter);
router.use(tasksRouter);
router.use(dashboardRouter);
router.use(dtProjectsRouter);
router.use(committeesRouter);

export default router;

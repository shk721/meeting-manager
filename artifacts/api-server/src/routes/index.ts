import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import meetingsRouter from "./meetings";
import minutesRouter from "./minutes";
import decisionsRouter from "./decisions";
import tasksRouter from "./tasks";
import dashboardRouter from "./dashboard";
import committeesRouter from "./committees";
import attachmentsRouter from "./attachments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(meetingsRouter);
router.use(minutesRouter);
router.use(decisionsRouter);
router.use(tasksRouter);
router.use(dashboardRouter);
router.use(committeesRouter);
router.use(attachmentsRouter);

export default router;

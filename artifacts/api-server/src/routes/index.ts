import { Router, type IRouter } from "express";
import healthRouter from "./health";
import da3mniRouter from "./da3mni";

const router: IRouter = Router();

router.use(healthRouter);
router.use(da3mniRouter);

export default router;

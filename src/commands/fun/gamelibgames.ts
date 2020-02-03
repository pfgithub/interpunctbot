import Router from "commandrouter";
import Info from "../../Info";
import { connect4 } from "./gamelib";

const router = new Router<Info, Promise<any>>();
router.add("gamelib", [], connect4);
export default router;

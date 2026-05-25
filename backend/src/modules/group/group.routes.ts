import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { sendSuccess } from "../../lib/response";
import * as groupService from "./group.service";

const router = Router();

// POST /groups
const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(80, "Name too long"),
  category: z
    .enum(["trip", "food", "roommate", "project", "other"])
    .default("other"),
  members: z.array(z.string().uuid()).optional(),
});

router.post(
  "/",
  validate({ body: createGroupSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await groupService.createGroup(req.user!.userId, req.body);
      sendSuccess(res, group, "Group created", undefined, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET /groups
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const groups = await groupService.getGroups(req.user!.userId);
      sendSuccess(res, groups);
    } catch (err) {
      next(err);
    }
  },
);

// GET /groups/:groupId
router.get(
  "/:groupId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await groupService.getGroup(
        (req.params.groupId as string),
        req.user!.userId,
      );
      sendSuccess(res, group);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /groups/:groupId
const updateGroupSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  category: z.enum(["trip", "food", "roommate", "project", "other"]).optional(),
});

router.patch(
  "/:groupId",
  validate({ body: updateGroupSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await groupService.updateGroup(
        (req.params.groupId as string),
        req.user!.userId,
        req.body,
      );
      sendSuccess(res, group, "Group updated");
    } catch (err) {
      next(err);
    }
  },
);

// POST /groups/:groupId/close
router.post(
  "/:groupId/close",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await groupService.closeGroup(
        (req.params.groupId as string),
        req.user!.userId,
      );
      sendSuccess(res, group, "Group closed");
    } catch (err) {
      next(err);
    }
  },
);

// GET /groups/:groupId/members
router.get(
  "/:groupId/members",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = await groupService.getMembers(
        (req.params.groupId as string),
        req.user!.userId,
      );
      sendSuccess(res, members);
    } catch (err) {
      next(err);
    }
  },
);

// POST /groups/:groupId/members
const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "member"]).default("member"),
});

router.post(
  "/:groupId/members",
  validate({ body: addMemberSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await groupService.addMember(
        (req.params.groupId as string),
        req.user!.userId,
        req.body.userId,
        req.body.role,
      );
      sendSuccess(res, member, "Member added", undefined, 201);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /groups/:groupId/members/:userId
const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

router.patch(
  "/:groupId/members/:userId",
  validate({ body: updateMemberRoleSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await groupService.updateMemberRole(
        (req.params.groupId as string),
        req.user!.userId,
        (req.params.userId as string),
        req.body.role,
      );
      sendSuccess(res, member, "Member role updated");
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /groups/:groupId/members/:userId
router.delete(
  "/:groupId/members/:userId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await groupService.removeMember(
        (req.params.groupId as string),
        req.user!.userId,
        (req.params.userId as string),
      );
      sendSuccess(res, null, "Member removed");
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /groups/:groupId -> remove group (owner only)
router.delete(
  "/:groupId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await groupService.deleteGroup((req.params.groupId as string), req.user!.userId);
      sendSuccess(res, null, "Group deleted");
    } catch (err) {
      next(err);
    }
  },
);

export default router;

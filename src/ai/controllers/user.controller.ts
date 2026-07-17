import { getUserProfile } from "../services/user.service";
import { withCache } from "../../utils/redis";
import { presentUserProfile } from "../utils/presenters";

export async function handleGetUserProfile(userId: string) {
    return withCache(`adk:profile:${userId}`, 600, async () => {
        const profile = await getUserProfile(userId);
        if (!profile) {
            throw new Error("User profile not found.");
        }
        return presentUserProfile(profile);
    });
}

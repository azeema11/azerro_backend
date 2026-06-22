import { getUserProfile } from "../services/user.service";
import { withCache } from "../../utils/redis";
import { toNumberSafe } from "../../utils/utils";

export async function handleGetUserProfile(userId: string) {
    return withCache(`adk:profile:${userId}`, 600, async () => {
        const profile = await getUserProfile(userId);
        if (!profile) {
            throw new Error("User profile not found.");
        }
        return {
            name: profile.name,
            baseCurrency: profile.baseCurrency,
            monthlyIncome: toNumberSafe(profile.monthlyIncome || 0),
        };
    });
}

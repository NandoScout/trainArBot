import type { ITrip, IUserStore, ServiceObject } from "./types";

// Store the current menu level for each user
export const userStore: Record<number, IUserStore> = {}

export const newUser = (user: IUserStore) => {
    return {
        id: user.id,
        trip: user.trip,
        lastInfo: user.lastInfo,
    }
}

export const addUser = (user: IUserStore) => {
    if (!userStore[user.id]) {
        userStore[user.id] = newUser(user)
        return userStore[user.id];
    }
    return false;
}

export const updateUser = (user: IUserStore) => {
    if (userStore[user.id]) {
        userStore[user.id] = user
        return userStore[user.id];
    }
    return false;
}

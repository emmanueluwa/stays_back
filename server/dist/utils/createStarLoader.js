"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStarLoader = void 0;
const dataloader_1 = __importDefault(require("dataloader"));
const createStarLoader = () => new dataloader_1.default(async (keys) => {
    const starIdToStar = {};
    return keys.map((key) => starIdToStar[`${key.userId}|${key.postId}`]);
});
exports.createStarLoader = createStarLoader;
//# sourceMappingURL=createStarLoader.js.map
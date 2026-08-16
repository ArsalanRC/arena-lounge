/** Checkers engine barrel. */
export * from "./types";
export * from "./constants";
export { createInitialState } from "./state";
export {
  applyMove,
  getValidMoves,
  fileOf,
  rankOf,
  frToSq,
  onBoard,
  isDarkSquare,
  countPieces,
} from "./rules";
export { selectBotMove, evaluate } from "./bot";

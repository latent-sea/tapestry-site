// The lives settled (lives.js, layOut) away from the page, so a long tapestry
// never stops it answering: asked { id, drawn, dims, tuning }, it answers
// { id, times, at } - at as [life id, places] pairs - once they settle.
import { layOut } from "./lives.js?v=874a7fa5f28c";

self.onmessage = ({ data: { id, drawn, dims, tuning } }) => {
  const laid = layOut(drawn, dims, undefined, tuning);
  self.postMessage({ id, times: laid.times, at: [...laid.at.entries()] });
};

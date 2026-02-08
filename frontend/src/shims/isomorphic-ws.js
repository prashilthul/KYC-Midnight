/**
 * Browser shim for isomorphic-ws.
 */

const _WebSocket =
    typeof WebSocket !== "undefined"
        ? WebSocket
        : typeof globalThis !== "undefined"
            ? globalThis.WebSocket
            : undefined;

export { _WebSocket as WebSocket };
export default _WebSocket;

import { useRef, useEffect } from 'react';
import { isEnvBrowser } from '../utils/misc';

// Define a minimal type for NUI events (just requires an 'action' field)
export type NuiEventData<T = unknown> = { action: string } & T;

// Global registry for event handlers
type HandlerType<T = any> = (data: T) => void | Promise<void>;
type HandlersMap = Map<string, Set<HandlerType>>;

// Singleton for managing NUI event listeners
const NuiEventManager = (() => {
  let handlers: HandlersMap = new Map();
  let initialized = false;

  // The single event listener for all NUI events
  const eventListener = (event: MessageEvent) => {
    // Skip if no action or no handlers for this action
    if (!event.data?.action) return;
    const action = event.data.action;
    const actionHandlers = handlers.get(action);
    if (!actionHandlers || actionHandlers.size === 0) return;

    // Call all handlers for this action
    actionHandlers.forEach((handler) => {
      Promise.resolve(handler(event.data)).catch((error) => {
        if (isEnvBrowser()) {
          console.groupCollapsed(`❌ Error in NUI handler for '${action}'`);
          console.error(error);
          console.groupEnd();
        } else {
          console.error(`Error in NUI handler for '${action}':`, error);
        }
      });
    });
  };

  // Initialize the manager if not already done
  const initialize = () => {
    if (!initialized) {
      window.addEventListener('message', eventListener);
      initialized = true;
    }
  };

  return {
    // Register a handler for an action
    register<T>(action: string, handler: HandlerType<T>): () => void {
      initialize();

      // Create a new Set for this action if it doesn't exist
      if (!handlers.has(action)) {
        handlers.set(action, new Set());
      }

      // Add the handler to the Set
      const actionHandlers = handlers.get(action)!;
      actionHandlers.add(handler);

      // Return a cleanup function
      return () => {
        if (!handlers.has(action)) return;

        const actionHandlers = handlers.get(action)!;
        actionHandlers.delete(handler);

        // If no more handlers for this action, remove the Set
        if (actionHandlers.size === 0) {
          handlers.delete(action);
        }
      };
    },
  };
})();

/**
 * A hook to handle NUI messages from the game client
 * Uses a centralized event manager to avoid multiple event listeners
 *
 * @param action - The action name to listen for
 * @param handler - The callback function to execute when the action is received
 */
export const useNuiEvent = <T extends NuiEventData>(
  action: string,
  handler: (data: T) => void | Promise<void>
) => {
  // Store the handler in a ref to avoid re-renders and dependency issues
  const savedHandler = useRef<(data: T) => void | Promise<void>>(
    (_data: T) => {}
  );

  // Update the ref whenever the handler changes
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  // Register the handler with the centralized event manager
  useEffect(() => {
    // Create a stable wrapper that will call our latest saved handler
    const handlerWrapper = (data: T) => {
      return savedHandler.current?.(data);
    };

    // Register the handler and get the cleanup function
    const unregister = NuiEventManager.register(action, handlerWrapper);

    // Return the cleanup function for useEffect
    return unregister;
  }, [action]); // Only re-run if action changes
};

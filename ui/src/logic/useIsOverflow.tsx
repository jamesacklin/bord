import * as React from "react";

export const useIsOverflow = (
  ref: React.RefObject<HTMLDivElement>,
  callback?: ((arg0: boolean) => void) | undefined
) => {
  const [isOverflow, setIsOverflow] = React.useState(false);

  React.useLayoutEffect(() => {
    const { current } = ref;
    if (!current) return;
    const trigger = () => {
      const hasOverflow = current.scrollHeight > current.clientHeight;
      setIsOverflow(hasOverflow);
      if (callback) callback(hasOverflow);
    };

    if (current) {
      if ("ResizeObserver" in window) {
        new ResizeObserver(trigger).observe(current);
      }
      trigger();
    }
  }, [callback, ref]);

  return isOverflow;
};

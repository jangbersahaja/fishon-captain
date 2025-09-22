import clsx from "clsx";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type TextareaHTMLAttributes,
} from "react";

import { textareaClass } from "../constants";

type AutoResizeTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string;
};

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  function AutoResizeTextarea({ className, onInput, onChange, ...rest }, ref) {
    const innerRef = useRef<HTMLTextAreaElement>(null);

    const resize = useCallback(() => {
      const element = innerRef.current;
      if (!element) return;
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    }, []);

    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    useEffect(() => {
      resize();
    }, [resize, rest.value, rest.defaultValue]);

    return (
      <textarea
        {...rest}
        ref={innerRef}
        className={clsx(textareaClass, className)}
        onInput={(event) => {
          resize();
          onInput?.(event);
        }}
        onChange={(event) => {
          resize();
          onChange?.(event);
        }}
      />
    );
  }
);
